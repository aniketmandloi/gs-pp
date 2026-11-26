import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const METALS = ["XAU", "XAG"] as const;
export type Metal = (typeof METALS)[number];

export const CACHE_DIR = join(homedir(), ".cache", "gs-pp", "goldapi");

const FIRST_DAY = "2016-01-01";
const LAST_DAY = "2026-11-26";
// goldapi rejects history ranges longer than 90 days; both ends are inclusive.
const WINDOW_DAYS = 90;
const DAY_MS = 86_400_000;

export interface HistoryWindow {
  from: string;
  to: string;
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The fixed request windows; the fetch fills them and every reader expects all of them. */
export function historyWindows(): HistoryWindow[] {
  const last = Date.parse(LAST_DAY);
  const result: HistoryWindow[] = [];
  for (let start = Date.parse(FIRST_DAY); start <= last; start += WINDOW_DAYS * DAY_MS) {
    const end = Math.min(start + (WINDOW_DAYS - 1) * DAY_MS, last);
    result.push({ from: isoDay(start), to: isoDay(end) });
  }
  return result;
}

export function cacheFile(metal: Metal, { from, to }: HistoryWindow): string {
  return join(CACHE_DIR, metal, `${from}_${to}.json`);
}

export interface DailyPrice {
  date: string;
  inrPerOz: number;
}

function parsePrices(file: string, json: unknown): DailyPrice[] {
  if (typeof json !== "object" || json === null || !("prices" in json) || !Array.isArray(json.prices)) {
    throw new Error(`${file}: no prices array`);
  }
  return json.prices.map((row: unknown) => {
    if (
      typeof row !== "object" ||
      row === null ||
      !("date" in row) ||
      !("price" in row) ||
      typeof row.date !== "string" ||
      typeof row.price !== "number"
    ) {
      throw new Error(`${file}: bad row ${JSON.stringify(row)}`);
    }
    return { date: row.date, inrPerOz: row.price };
  });
}

/**
 * Every calendar day for a metal from the cache, sorted by date, duplicates kept. Reads each
 * expected window file, so a missing window fails the run instead of leaving a silent gap.
 */
export async function loadCalendarDays(metal: Metal): Promise<DailyPrice[]> {
  const days: DailyPrice[] = [];
  for (const window of historyWindows()) {
    const file = cacheFile(metal, window);
    days.push(...parsePrices(file, JSON.parse(await readFile(file, "utf8"))));
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export function isWeekday(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}
