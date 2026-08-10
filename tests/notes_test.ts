import { assertEquals } from "@std/assert";

import { buildNotes } from "../src/notes.ts";
import type {
  PxtoneEvent,
  PxtoneNote,
  PxtonePanVolumeSegment,
  PxtonePitchInterpolation,
  PxtonePitchSegment,
  PxtoneUnit,
  PxtoneVolumeSegment,
} from "../src/Pxtone.ts";

const ON = 1;
const KEY = 2;
const PAN_VOLUME = 3;
const VELOCITY = 4;
const VOLUME = 5;
const PORTAMENT = 6;

const factory = {
  createPitchSegment(
    startTick: number,
    endTick: number,
    startKey: number,
    endKey: number,
    targetKey: number,
    interpolation: PxtonePitchInterpolation,
  ): PxtonePitchSegment {
    return {
      startTick,
      endTick,
      startKey,
      endKey,
      targetKey,
      interpolation,
    } as unknown as PxtonePitchSegment;
  },
  createVolumeSegment(startTick: number, endTick: number, value: number): PxtoneVolumeSegment {
    return { startTick, endTick, value } as unknown as PxtoneVolumeSegment;
  },
  createPanVolumeSegment(
    startTick: number,
    endTick: number,
    value: number,
  ): PxtonePanVolumeSegment {
    return { startTick, endTick, value } as unknown as PxtonePanVolumeSegment;
  },
  createNote(
    unit: PxtoneUnit,
    startTick: number,
    endTick: number,
    velocity: number,
    pitchSegments: PxtonePitchSegment[],
    volumeSegments: PxtoneVolumeSegment[],
    panVolumeSegments: PxtonePanVolumeSegment[],
  ): PxtoneNote {
    return {
      unit,
      startTick,
      endTick,
      velocity,
      pitchSegments,
      volumeSegments,
      panVolumeSegments,
    } as unknown as PxtoneNote;
  },
};

function testUnit(name: string, index = 0): PxtoneUnit {
  return { index, name, played: true } as unknown as PxtoneUnit;
}

function event(
  unit: PxtoneUnit,
  tick: number,
  kind: number,
  value: number,
): PxtoneEvent {
  return { unit, tick, kind, value } as PxtoneEvent;
}

function pitchSegmentsOf(note: PxtoneNote) {
  return note.pitchSegments.map((segment) => ({
    startTick: segment.startTick,
    endTick: segment.endTick,
    startKey: segment.startKey,
    endKey: segment.endKey,
    targetKey: segment.targetKey,
    interpolation: segment.interpolation,
  }));
}

function volumeSegmentsOf(
  segments: readonly (PxtoneVolumeSegment | PxtonePanVolumeSegment)[],
) {
  return segments.map((segment) => [segment.startTick, segment.endTick, segment.value]);
}

Deno.test("buildNotes creates hold and portamento segments", () => {
  const unit = testUnit("lead");
  const notes = buildNotes(
    [unit],
    [
      event(unit, 0, KEY, 0x6000),
      event(unit, 0, ON, 400),
      event(unit, 0, VELOCITY, 80),
      event(unit, 100, PORTAMENT, 100),
      event(unit, 100, KEY, 0x6400),
    ],
    factory,
  );

  assertEquals(notes.length, 1);
  assertEquals(notes[0].velocity, 80); // the velocity written alongside the note-on
  assertEquals(pitchSegmentsOf(notes[0]), [
    {
      startTick: 0,
      endTick: 100,
      startKey: 0x6000,
      endKey: 0x6000,
      targetKey: 0x6000,
      interpolation: "hold",
    },
    {
      startTick: 100,
      endTick: 200,
      startKey: 0x6000,
      endKey: 0x6400,
      targetKey: 0x6400,
      interpolation: "linear",
    },
    {
      startTick: 200,
      endTick: 400,
      startKey: 0x6400,
      endKey: 0x6400,
      targetKey: 0x6400,
      interpolation: "hold",
    },
  ]);
});

Deno.test("buildNotes restarts an interrupted glide from its current pitch", () => {
  const unit = testUnit("lead");
  const notes = buildNotes(
    [unit],
    [
      event(unit, 0, KEY, 0x6000),
      event(unit, 0, ON, 300),
      event(unit, 50, PORTAMENT, 100),
      event(unit, 50, KEY, 0x6400),
      event(unit, 100, KEY, 0x6800),
    ],
    factory,
  );

  assertEquals(
    notes[0].pitchSegments.map((segment) => ({
      ticks: [segment.startTick, segment.endTick],
      keys: [segment.startKey, segment.endKey],
      // The interrupted glide keeps the key it was written with, even though it
      // only reaches 0x6200 before the next key event takes over.
      targetKey: segment.targetKey,
      interpolation: segment.interpolation,
    })),
    [
      { ticks: [0, 50], keys: [0x6000, 0x6000], targetKey: 0x6000, interpolation: "hold" },
      { ticks: [50, 100], keys: [0x6000, 0x6200], targetKey: 0x6400, interpolation: "linear" },
      { ticks: [100, 200], keys: [0x6200, 0x6800], targetKey: 0x6800, interpolation: "linear" },
      { ticks: [200, 300], keys: [0x6800, 0x6800], targetKey: 0x6800, interpolation: "hold" },
    ],
  );
});

Deno.test("buildNotes takes the velocity written alongside each note-on", () => {
  const unit = testUnit("lead");
  const notes = buildNotes(
    [unit],
    [
      // pxtone writes one velocity event per note, at the note's own tick, and event
      // priority places it after the note-on.
      event(unit, 0, KEY, 0x6000),
      event(unit, 0, ON, 100),
      event(unit, 0, VELOCITY, 40),
      event(unit, 100, KEY, 0x6000),
      event(unit, 100, ON, 100),
      event(unit, 100, VELOCITY, 120),
      // A note with no velocity event of its own keeps the value still in effect.
      event(unit, 200, KEY, 0x6000),
      event(unit, 200, ON, 100),
    ],
    factory,
  );

  assertEquals(notes.map((note) => note.velocity), [40, 120, 120]);
});

Deno.test("buildNotes keeps the written key when a note ends mid-glide", () => {
  const unit = testUnit("lead");
  const notes = buildNotes(
    [unit],
    [
      event(unit, 0, KEY, 0x6000),
      event(unit, 0, ON, 150),
      event(unit, 100, PORTAMENT, 100),
      event(unit, 100, KEY, 0x6800),
    ],
    factory,
  );

  assertEquals(notes.length, 1);
  assertEquals(notes[0].endTick, 150);
  // The glide would have run to tick 200, so the note stops halfway through it.
  assertEquals(pitchSegmentsOf(notes[0]), [
    {
      startTick: 0,
      endTick: 100,
      startKey: 0x6000,
      endKey: 0x6000,
      targetKey: 0x6000,
      interpolation: "hold",
    },
    {
      startTick: 100,
      endTick: 150,
      startKey: 0x6000,
      endKey: 0x6400,
      targetKey: 0x6800,
      interpolation: "linear",
    },
  ]);
});

Deno.test("buildNotes clips volume and pan automation to each note", () => {
  const unit = testUnit("lead");
  const notes = buildNotes(
    [unit],
    [
      event(unit, 10, VOLUME, 80),
      event(unit, 20, PAN_VOLUME, 32),
      event(unit, 30, ON, 100),
      event(unit, 50, VOLUME, 64),
      event(unit, 70, VOLUME, 64), // Repeated values do not split the segment.
      event(unit, 90, PAN_VOLUME, 96),
      event(unit, 110, VOLUME, 104),
      event(unit, 140, ON, 20),
    ],
    factory,
  );

  assertEquals(volumeSegmentsOf(notes[0].volumeSegments), [
    [30, 50, 80],
    [50, 110, 64],
    [110, 130, 104],
  ]);
  assertEquals(volumeSegmentsOf(notes[0].panVolumeSegments), [
    [30, 90, 32],
    [90, 130, 96],
  ]);
  assertEquals(volumeSegmentsOf(notes[1].volumeSegments), [[140, 160, 104]]);
  assertEquals(volumeSegmentsOf(notes[1].panVolumeSegments), [[140, 160, 96]]);
});

Deno.test("buildNotes truncates overlapping notes and sorts units chronologically", () => {
  const units = [testUnit("first", 0), testUnit("second", 1)];
  const notes = buildNotes(
    units,
    [
      event(units[0], 100, ON, 200),
      event(units[0], 200, ON, 50),
      event(units[1], 0, ON, 20),
    ],
    factory,
  );

  assertEquals(
    notes.map((note) => [note.unit.name, note.startTick, note.endTick]),
    [
      ["second", 0, 20],
      ["first", 100, 200],
      ["first", 200, 250],
    ],
  );
});
