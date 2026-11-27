import { loadEnvConfig } from "@next/env";
import { ibjaRate, metal, spotPrice } from "@/db/schema";
import { CACHE_DIR, readCachedSpotPrices } from "@/prices/goldapi";
import { fetchThirtyDayRates } from "@/prices/ibja";

loadEnvConfig(process.cwd());

// 1000 rows bind 3000 parameters, well under Postgres's limit of 65535 per statement.
const SPOT_BATCH_SIZE = 1000;

async function seed() {
  // @/db reads DATABASE_URL when it loads, so it must load after loadEnvConfig.
  const { db } = await import("@/db");

  const spotRows = (
    await Promise.all(
      metal.enumValues.map((m) => readCachedSpotPrices(CACHE_DIR, m)),
    )
  ).flat();
  const ibjaRows = await fetchThirtyDayRates();

  let storedSpot = 0;
  for (let start = 0; start < spotRows.length; start += SPOT_BATCH_SIZE) {
    const stored = await db
      .insert(spotPrice)
      .values(spotRows.slice(start, start + SPOT_BATCH_SIZE))
      .onConflictDoNothing()
      .returning({ date: spotPrice.date });
    storedSpot += stored.length;
  }
  const storedIbja = await db
    .insert(ibjaRate)
    .values(ibjaRows)
    .onConflictDoNothing()
    .returning({ date: ibjaRate.date });

  process.stdout.write(
    `Stored ${storedSpot} of ${spotRows.length} spot prices and ${storedIbja.length} of ${ibjaRows.length} IBJA PM rates; the rest were already stored.\n`,
  );
}

seed();
