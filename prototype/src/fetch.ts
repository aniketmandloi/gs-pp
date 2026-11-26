import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CACHE_DIR, METALS } from "./series.ts";

const FIRST_DAY = "2016-01-01";
const LAST_DAY = "2026-11-26";
// goldapi rejects history ranges longer than 90 days; both ends are inclusive.
const WINDOW_DAYS = 90;
const DAY_MS = 86_400_000;

const apiKey = process.env.GOLD_API_KEY;
if (!apiKey) {
  throw new Error("GOLD_API_KEY is not set");
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function windows(): Array<{ from: string; to: string }> {
  const last = Date.parse(LAST_DAY);
  const result: Array<{ from: string; to: string }> = [];
  for (let start = Date.parse(FIRST_DAY); start <= last; start += WINDOW_DAYS * DAY_MS) {
    const end = Math.min(start + (WINDOW_DAYS - 1) * DAY_MS, last);
    result.push({ from: isoDay(start), to: isoDay(end) });
  }
  return result;
}

let requests = 0;
for (const metal of METALS) {
  const dir = join(CACHE_DIR, metal);
  await mkdir(dir, { recursive: true });
  for (const { from, to } of windows()) {
    const file = join(dir, `${from}_${to}.json`);
    if (existsSync(file)) continue;
    const url = `https://www.goldapi.io/api/history/${metal}/INR?from=${from}&to=${to}`;
    const response = await fetch(url, { headers: { "x-access-token": apiKey } });
    requests += 1;
    const body = await response.text();
    if (response.status !== 200) {
      throw new Error(`${metal} ${from}..${to}: HTTP ${response.status}: ${body}`);
    }
    // Parsing first means a non-JSON body stops the run instead of reaching the cache.
    JSON.parse(body);
    await writeFile(file, body);
    console.log(`${metal} ${from}..${to} cached`);
  }
}
console.log(`requests made: ${requests}`);
