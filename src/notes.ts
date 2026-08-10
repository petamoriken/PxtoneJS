import type {
  PxtoneEvent,
  PxtoneNote,
  PxtonePanVolumeSegment,
  PxtonePitchInterpolation,
  PxtonePitchSegment,
  PxtoneUnit,
  PxtoneVolumeSegment,
} from "./Pxtone.ts";

const DEFAULT_KEY = 0x6000;
const DEFAULT_VELOCITY = 104;
const DEFAULT_VOLUME = 104;
const DEFAULT_PAN_VOLUME = 64;

const KIND_ON = 1;
const KIND_KEY = 2;
const KIND_PAN_VOLUME = 3;
const KIND_VELOCITY = 4;
const KIND_VOLUME = 5;
const KIND_PORTAMENT = 6;

interface NoteFactory {
  createPitchSegment(
    startTick: number,
    endTick: number,
    startKey: number,
    endKey: number,
    targetKey: number,
    interpolation: PxtonePitchInterpolation,
  ): PxtonePitchSegment;
  createVolumeSegment(startTick: number, endTick: number, value: number): PxtoneVolumeSegment;
  createPanVolumeSegment(
    startTick: number,
    endTick: number,
    value: number,
  ): PxtonePanVolumeSegment;
  createNote(
    unit: PxtoneUnit,
    startTick: number,
    endTick: number,
    velocity: number,
    pitchSegments: PxtonePitchSegment[],
    volumeSegments: PxtoneVolumeSegment[],
    panVolumeSegments: PxtonePanVolumeSegment[],
  ): PxtoneNote;
}

interface Glide {
  startTick: number;
  endTick: number;
  startKey: number;
  endKey: number;
}

interface MutableNote {
  unit: PxtoneUnit;
  startTick: number;
  endTick: number;
  velocity: number;
  pitchCursorTick: number;
  volumeCursorTick: number;
  panVolumeCursorTick: number;
  pitchSegments: PxtonePitchSegment[];
  volumeSegments: PxtoneVolumeSegment[];
  panVolumeSegments: PxtonePanVolumeSegment[];
}

function keyAt(glide: Glide | null, holdKey: number, tick: number): number {
  if (glide === null) {
    return holdKey;
  }
  if (tick <= glide.startTick) {
    return glide.startKey;
  }
  if (tick >= glide.endTick) {
    return glide.endKey;
  }
  const ratio = (tick - glide.startTick) / (glide.endTick - glide.startTick);
  return glide.startKey + (glide.endKey - glide.startKey) * ratio;
}

function appendPitchSegments(
  note: MutableNote,
  endTick: number,
  glide: Glide | null,
  holdKey: number,
  factory: NoteFactory,
): void {
  let startTick = note.pitchCursorTick;
  if (endTick <= startTick) {
    return;
  }

  if (glide !== null && startTick < glide.endTick && endTick > glide.startTick) {
    if (startTick < glide.startTick) {
      const holdEnd = Math.min(endTick, glide.startTick);
      note.pitchSegments.push(
        factory.createPitchSegment(startTick, holdEnd, holdKey, holdKey, holdKey, "hold"),
      );
      startTick = holdEnd;
    }
    if (startTick < endTick && startTick < glide.endTick) {
      const glideEnd = Math.min(endTick, glide.endTick);
      note.pitchSegments.push(
        factory.createPitchSegment(
          startTick,
          glideEnd,
          keyAt(glide, holdKey, startTick),
          keyAt(glide, holdKey, glideEnd),
          glide.endKey,
          "linear",
        ),
      );
      startTick = glideEnd;
    }
  }

  if (startTick < endTick) {
    const key = keyAt(glide, holdKey, startTick);
    note.pitchSegments.push(
      factory.createPitchSegment(startTick, endTick, key, key, key, "hold"),
    );
  }
  note.pitchCursorTick = endTick;
}

/**
 * The velocity a note starting at `events[index]` sounds with.
 *
 * pxtone writes the velocity of a note alongside its note-on, but event priority orders velocity
 * after note-on, so the running value has not caught up yet when the note begins. Volume and pan
 * volume do not need this: their same-tick event closes a zero-length segment, which is dropped,
 * and the new value carries into the note's first segment.
 */
function velocityAtNoteOn(
  events: readonly PxtoneEvent[],
  index: number,
  velocity: number,
): number {
  const { tick } = events[index];
  for (let i = index + 1; i < events.length && events[i].tick === tick; i++) {
    if (events[i].kind === KIND_VELOCITY) {
      velocity = events[i].value;
    }
  }
  return velocity;
}

function appendVolumeSegment(
  segments: PxtoneVolumeSegment[],
  startTick: number,
  endTick: number,
  value: number,
  factory: NoteFactory,
): void {
  if (startTick < endTick) {
    segments.push(factory.createVolumeSegment(startTick, endTick, value));
  }
}

function appendPanVolumeSegment(
  segments: PxtonePanVolumeSegment[],
  startTick: number,
  endTick: number,
  value: number,
  factory: NoteFactory,
): void {
  if (startTick < endTick) {
    segments.push(factory.createPanVolumeSegment(startTick, endTick, value));
  }
}

function finishNote(
  note: MutableNote,
  endTick: number,
  glide: Glide | null,
  holdKey: number,
  volume: number,
  panVolume: number,
  factory: NoteFactory,
): PxtoneNote | null {
  const clippedEnd = Math.min(note.endTick, endTick);
  appendPitchSegments(note, clippedEnd, glide, holdKey, factory);
  appendVolumeSegment(
    note.volumeSegments,
    note.volumeCursorTick,
    clippedEnd,
    volume,
    factory,
  );
  appendPanVolumeSegment(
    note.panVolumeSegments,
    note.panVolumeCursorTick,
    clippedEnd,
    panVolume,
    factory,
  );
  if (clippedEnd <= note.startTick) {
    return null;
  }
  return factory.createNote(
    note.unit,
    note.startTick,
    clippedEnd,
    note.velocity,
    note.pitchSegments,
    note.volumeSegments,
    note.panVolumeSegments,
  );
}

/**
 * @internal Converts events ordered by tick and pxtone event priority into notes and their
 * pitch and value segments.
 */
export function buildNotes(
  units: readonly PxtoneUnit[],
  events: readonly PxtoneEvent[],
  factory: NoteFactory,
): PxtoneNote[] {
  const unitIndexes = new Map(units.map((unit, index) => [unit, index]));
  const unitEvents = units.map(() => [] as PxtoneEvent[]);
  for (const event of events) {
    const index = unitIndexes.get(event.unit);
    if (index !== undefined) {
      unitEvents[index].push(event);
    }
  }

  const notes: Array<{ note: PxtoneNote; unitIndex: number }> = [];
  for (let unitIndex = 0; unitIndex < unitEvents.length; unitIndex++) {
    let holdKey = DEFAULT_KEY;
    let velocity = DEFAULT_VELOCITY;
    let volume = DEFAULT_VOLUME;
    let panVolume = DEFAULT_PAN_VOLUME;
    let portamento = 0;
    let glide: Glide | null = null;
    let activeNote: MutableNote | null = null;

    const events = unitEvents[unitIndex];
    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const event = events[eventIndex];
      if (activeNote !== null && activeNote.endTick <= event.tick) {
        const note = finishNote(
          activeNote,
          activeNote.endTick,
          glide,
          holdKey,
          volume,
          panVolume,
          factory,
        );
        if (note !== null) {
          notes.push({ note, unitIndex });
        }
        activeNote = null;
      }

      switch (event.kind) {
        case KIND_ON: {
          if (activeNote !== null) {
            const note = finishNote(
              activeNote,
              event.tick,
              glide,
              holdKey,
              volume,
              panVolume,
              factory,
            );
            if (note !== null) {
              notes.push({ note, unitIndex });
            }
          }
          holdKey = glide?.endKey ?? holdKey;
          glide = null;
          activeNote = event.value > 0
            ? {
              unit: units[unitIndex],
              startTick: event.tick,
              endTick: event.tick + event.value,
              velocity: velocityAtNoteOn(events, eventIndex, velocity),
              pitchCursorTick: event.tick,
              volumeCursorTick: event.tick,
              panVolumeCursorTick: event.tick,
              pitchSegments: [],
              volumeSegments: [],
              panVolumeSegments: [],
            }
            : null;
          break;
        }
        case KIND_KEY: {
          if (activeNote !== null) {
            appendPitchSegments(activeNote, event.tick, glide, holdKey, factory);
          }
          const currentKey = keyAt(glide, holdKey, event.tick);
          if (portamento > 0 && currentKey !== event.value) {
            holdKey = currentKey;
            glide = {
              startTick: event.tick,
              endTick: event.tick + portamento,
              startKey: currentKey,
              endKey: event.value,
            };
          } else {
            holdKey = event.value;
            glide = null;
          }
          break;
        }
        case KIND_PAN_VOLUME:
          if (event.value !== panVolume) {
            if (activeNote !== null) {
              appendPanVolumeSegment(
                activeNote.panVolumeSegments,
                activeNote.panVolumeCursorTick,
                event.tick,
                panVolume,
                factory,
              );
              activeNote.panVolumeCursorTick = event.tick;
            }
            panVolume = event.value;
          }
          break;
        case KIND_VELOCITY:
          velocity = event.value;
          break;
        case KIND_VOLUME:
          if (event.value !== volume) {
            if (activeNote !== null) {
              appendVolumeSegment(
                activeNote.volumeSegments,
                activeNote.volumeCursorTick,
                event.tick,
                volume,
                factory,
              );
              activeNote.volumeCursorTick = event.tick;
            }
            volume = event.value;
          }
          break;
        case KIND_PORTAMENT:
          portamento = Math.max(0, event.value);
          break;
      }
    }

    if (activeNote !== null) {
      const note = finishNote(
        activeNote,
        activeNote.endTick,
        glide,
        holdKey,
        volume,
        panVolume,
        factory,
      );
      if (note !== null) {
        notes.push({ note, unitIndex });
      }
    }
  }

  notes.sort((a, b) => a.note.startTick - b.note.startTick || a.unitIndex - b.unitIndex);
  return notes.map(({ note }) => note);
}
