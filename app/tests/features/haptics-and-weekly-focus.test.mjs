import assert from "node:assert/strict";
import test from "node:test";
import { triggerHaptic } from "../../src/core/haptics.ts";
import { teacherWeekStart } from "../../src/features/teacher-cycle/teacher-week-workspace.ts";

function withDevice({ reduced = false, supported = true, hidden = false, throws = false } = {}, run) {
  const names = ["window", "navigator", "document"];
  const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const pulses = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: { matchMedia: () => ({ matches: reduced }) } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: supported ? { vibrate: value => { if (throws) throw new Error("unavailable"); pulses.push(value); return true; } } : {} });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { visibilityState: hidden ? "hidden" : "visible" } });
  try { run(pulses); } finally { names.forEach((name, index) => { if (previous[index]) Object.defineProperty(globalThis, name, previous[index]); else delete globalThis[name]; }); }
}

test("haptic duration is finite, positive and bounded to a brief 50ms pulse", () => {
  withDevice({}, pulses => {
    [NaN, Infinity, -2, 0].forEach(triggerHaptic);
    assert.deepEqual(pulses, []);
    triggerHaptic(); triggerHaptic(10.6); triggerHaptic(1000000);
    assert.deepEqual(pulses, [10, 11, 50]);
  });
});
test("reduced motion and hidden tabs suppress optional haptic feedback", () => {
  for (const options of [{ reduced: true }, { hidden: true }]) withDevice(options, pulses => { triggerHaptic(); assert.deepEqual(pulses, []); });
});
test("unsupported or throwing vibration APIs do not interrupt user actions", () => {
  for (const options of [{ supported: false }, { throws: true }]) withDevice(options, () => assert.doesNotThrow(() => triggerHaptic()));
});
test("weekly dismissal scope remains Monday through Sunday, including year boundaries", () => {
  for (const day of ["2026-09-14", "2026-09-15", "2026-09-19", "2026-09-20"]) assert.equal(teacherWeekStart(day), "2026-09-14");
  assert.equal(teacherWeekStart("2026-09-21"), "2026-09-21");
  assert.equal(teacherWeekStart("2027-01-01"), "2026-12-28");
  assert.throws(() => teacherWeekStart("2026-02-30"));
});
