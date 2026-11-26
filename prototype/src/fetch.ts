import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CACHE_DIR, cacheFile, historyWindows, METALS } from "./series.ts";

const apiKey = process.env.GOLD_API_KEY;
if (!apiKey) {
  throw new Error("GOLD_API_KEY is not set");
}

let requests = 0;
for (const metal of METALS) {
  await mkdir(join(CACHE_DIR, metal), { recursive: true });
  for (const window of historyWindows()) {
    const file = cacheFile(metal, window);
    if (existsSync(file)) continue;
    const url = `https://www.goldapi.io/api/history/${metal}/INR?from=${window.from}&to=${window.to}`;
    const response = await fetch(url, { headers: { "x-access-token": apiKey } });
    requests += 1;
    const body = await response.text();
    if (response.status !== 200) {
      throw new Error(`${metal} ${window.from}..${window.to}: HTTP ${response.status}: ${body}`);
    }
    // Parsing first means a non-JSON body stops the run instead of reaching the cache.
    JSON.parse(body);
    await writeFile(file, body);
    console.log(`${metal} ${window.from}..${window.to} cached`);
  }
}
console.log(`requests made: ${requests}`);
