import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { metal, spotPrice } from "@/db/schema";

type Metal = (typeof metal.enumValues)[number];

export const CACHE_DIR = join(homedir(), ".cache", "gs-pp", "goldapi");

const FIRST_DAY = "2016-01-01";
const LAST_DAY = "2026-11-26";
// goldapi rejects history ranges longer than 90 days; both ends are inclusive.
const WINDOW_DAYS = 90;
const DAY_MS = 86_400_000;

interface HistoryWindow {
  from: string;
  to: string;
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The fixed windows the cache was filled with; every reader expects all of them. */
export function historyWindows(): HistoryWindow[] {
  const last = Date.parse(LAST_DAY);
  const windows: HistoryWindow[] = [];
  for (
    let start = Date.parse(FIRST_DAY);
    start <= last;
    start += WINDOW_DAYS * DAY_MS
  ) {
    const end = Math.min(start + (WINDOW_DAYS - 1) * DAY_MS, last);
    windows.push({ from: isoDay(start), to: isoDay(end) });
  }
  return windows;
}

interface CachedPrice {
  date: string;
  price: number;
}

function isCachedPrice(row: unknown): row is CachedPrice {
  return (
    typeof row === "object" &&
    row !== null &&
    "date" in row &&
    "price" in row &&
    typeof row.date === "string" &&
    typeof row.price === "number"
  );
}

function parsePrices(file: string, body: unknown): CachedPrice[] {
  if (
    typeof body !== "object" ||
    body === null ||
    !("prices" in body) ||
    !Array.isArray(body.prices) ||
    !body.prices.every(isCachedPrice)
  ) {
    throw new Error(`${file}: expected prices of { date, price }`);
  }
  return body.prices;
}

/**
 * Reads every expected window file for a metal, so a missing window fails instead of leaving a
 * gap in the history.
 */
export async function readCachedSpotPrices(
  cacheDir: string,
  metal: Metal,
): Promise<(typeof spotPrice.$inferInsert)[]> {
  const rows: (typeof spotPrice.$inferInsert)[] = [];
  for (const { from, to } of historyWindows()) {
    const file = join(cacheDir, metal, `${from}_${to}.json`);
    const prices = parsePrices(file, JSON.parse(await readFile(file, "utf8")));
    rows.push(
      ...prices.map(({ date, price }) => ({
        metal,
        date,
        inrPerTroyOz: price,
      })),
    );
  }
  return rows;
}
