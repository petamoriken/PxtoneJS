import { assertEquals } from "@std/assert";

import { buildNotes } from "../src/notes.ts";
import type {
  PxtoneEvent,
  PxtoneNote,
  PxtonePitchInterpolation,
  PxtonePitchSegment,
  PxtoneUnit,
} from "../src/Pxtone.ts";

const KEY = 2;
const ON = 1;
const VELOCITY = 4;
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
  createNote(
    unit: PxtoneUnit,
    startTick: number,
    endTick: number,
    velocity: number,
    pitchSegments: PxtonePitchSegment[],
  ): PxtoneNote {
    return { unit, startTick, endTick, velocity, pitchSegments } as unknown as PxtoneNote;
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
  assertEquals(notes[0].velocity, 104); // VELOCITY follows ON at the same tick.
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
