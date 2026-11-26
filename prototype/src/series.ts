import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const METALS = ["XAU", "XAG"] as const;
export type Metal = (typeof METALS)[number];

export const CACHE_DIR = join(homedir(), ".cache", "gs-pp", "goldapi");

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

/** Every cached calendar day for a metal, sorted by date, duplicates kept. */
export async function loadCalendarDays(metal: Metal): Promise<DailyPrice[]> {
  const dir = join(CACHE_DIR, metal);
  const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  const days: DailyPrice[] = [];
  for (const name of files) {
    const file = join(dir, name);
    days.push(...parsePrices(file, JSON.parse(await readFile(file, "utf8"))));
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export function isWeekday(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}
