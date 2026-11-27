import { expect, test } from "vitest";
import { isSpotStale } from "./trading-days";

test("spot from Thursday is fresh through Monday and stale on Tuesday", () => {
  expect(isSpotStale("2026-11-26", "2026-11-26")).toBe(false);
  expect(isSpotStale("2026-11-26", "2026-11-27")).toBe(false);
  expect(isSpotStale("2026-11-26", "2026-11-30")).toBe(false);
  expect(isSpotStale("2026-11-26", "2026-12-01")).toBe(true);
});

test("weekends do not count towards spot age", () => {
  expect(isSpotStale("2026-11-20", "2026-11-22")).toBe(false);
  expect(isSpotStale("2026-11-20", "2026-11-24")).toBe(false);
  expect(isSpotStale("2026-11-20", "2026-11-25")).toBe(true);
});
