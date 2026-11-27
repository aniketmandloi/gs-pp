import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { historyWindows, readCachedSpotPrices } from "./goldapi";

let cacheDir: string;

beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "goldapi-cache-"));
  await mkdir(join(cacheDir, "XAU"));
  for (const [index, { from, to }] of historyWindows().entries()) {
    const prices = [
      { date: from, price: 100_000 + index },
      { date: to, price: 200_000 + index },
    ];
    await writeFile(
      join(cacheDir, "XAU", `${from}_${to}.json`),
      JSON.stringify({ metal: "XAU", currency: "INR", from, to, prices }),
    );
  }
});

afterEach(async () => {
  await rm(cacheDir, { recursive: true });
});

test("the cache windows are the 90-day ranges from 2016-01-01 to 2026-11-26", () => {
  const windows = historyWindows();

  expect(windows).toHaveLength(45);
  expect(windows[0]).toEqual({ from: "2016-01-01", to: "2016-03-30" });
  expect(windows[1]).toEqual({ from: "2016-03-31", to: "2016-06-28" });
  expect(windows.at(-1)).toEqual({ from: "2026-11-04", to: "2026-11-26" });
});

test("reads every cached window for a metal as spot price rows", async () => {
  const rows = await readCachedSpotPrices(cacheDir, "XAU");

  expect(rows).toHaveLength(90);
  expect(rows[0]).toEqual({
    metal: "XAU",
    date: "2016-01-01",
    inrPerTroyOz: 100_000,
  });
  expect(rows.at(-1)).toEqual({
    metal: "XAU",
    date: "2026-11-26",
    inrPerTroyOz: 200_044,
  });
});

test("fails when a cache window is missing", async () => {
  await rm(join(cacheDir, "XAU", "2026-08-06_2026-11-03.json"));

  await expect(readCachedSpotPrices(cacheDir, "XAU")).rejects.toThrow(
    "2026-08-06_2026-11-03.json",
  );
});

test("fails when a cached price is not a number", async () => {
  await writeFile(
    join(cacheDir, "XAU", "2016-01-01_2016-03-30.json"),
    JSON.stringify({ prices: [{ date: "2016-01-01", price: "100000" }] }),
  );

  await expect(readCachedSpotPrices(cacheDir, "XAU")).rejects.toThrow(
    "2016-01-01_2016-03-30.json",
  );
});
