import { describe, expect, it } from "vitest";
import * as T from "./timer";

const s: T.TimerSettings = { ...T.DEFAULT_SETTINGS, focusMin: 25, shortMin: 5, longMin: 15, longEvery: 2, autoStart: false };
const MIN = 60_000;

describe("pomodoro timer", () => {
  it("counts down from an absolute end time and pauses exactly", () => {
    let t = T.start(T.initialState(s), 0);
    expect(T.remaining(t, 10 * MIN)).toBe(15 * MIN);
    t = T.pause(t, 10 * MIN);
    expect(t.running).toBe(false);
    expect(T.remaining(t, 99 * MIN)).toBe(15 * MIN);
    t = T.start(t, 100 * MIN);
    expect(T.remaining(t, 105 * MIN)).toBe(10 * MIN);
  });

  it("goes focus → short → focus → long → focus and resets the set", () => {
    let t = T.initialState(s);
    const seq: [T.Phase, number][] = [];
    for (let i = 0; i < 4; i++) {
      t = T.complete(t, s, 0).state;
      seq.push([t.phase, t.cycle]);
    }
    expect(seq).toEqual([
      ["short", 1],
      ["focus", 1],
      ["long", 2],
      ["focus", 0],
    ]);
  });

  it("only reports finished focus sessions", () => {
    const focus = T.complete(T.initialState(s), s, 0);
    expect(focus.finishedFocus).toBe(true);
    expect(T.complete(focus.state, s, 0).finishedFocus).toBe(false);
  });

  it("skip does not count the focus session", () => {
    const t = T.skip(T.initialState(s), s, 0);
    expect(t.phase).toBe("short");
    expect(t.cycle).toBe(0);
  });

  it("auto-start runs the next phase", () => {
    const t = T.complete(T.initialState(s), { ...s, autoStart: true }, 1000).state;
    expect(t.running).toBe(true);
    expect(t.endsAt).toBe(1000 + 5 * MIN);
  });

  it("formats the clock", () => {
    expect(T.formatClock(25 * MIN)).toBe("25:00");
    expect(T.formatClock(61_001)).toBe("01:02");
    expect(T.formatClock(0)).toBe("00:00");
  });
});
