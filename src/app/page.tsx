import { and, eq, gte, sql } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { ibjaRate, importDuty, spotPrice } from "@/db/schema";
import PricePanel from "./price-panel";
import PricesUnavailable from "./prices-unavailable";

// The chart covers the 12 months up to each table's latest date.
const spotSince = sql`(select max(${spotPrice.date}) from ${spotPrice}) - interval '12 months'`;
const ibjaSince = sql`(select max(${ibjaRate.date}) from ${ibjaRate}) - interval '12 months'`;

function spotPrices(metal: typeof spotPrice.$inferSelect.metal) {
  return db
    .select({ date: spotPrice.date, inrPerTroyOz: spotPrice.inrPerTroyOz })
    .from(spotPrice)
    .where(and(eq(spotPrice.metal, metal), gte(spotPrice.date, spotSince)))
    .orderBy(spotPrice.date);
}

async function Prices() {
  const [gold, silver, ibja, duties] = await Promise.all([
    spotPrices("XAU"),
    spotPrices("XAG"),
    db
      .select({
        date: ibjaRate.date,
        gold999: ibjaRate.gold999,
        gold916: ibjaRate.gold916,
        gold750: ibjaRate.gold750,
        silver999: ibjaRate.silver999,
      })
      .from(ibjaRate)
      .where(gte(ibjaRate.date, ibjaSince))
      .orderBy(ibjaRate.date),
    db.select().from(importDuty),
  ]);
  const latest = ibja.at(-1);
  if (!latest) {
    return <p className="mt-6">No IBJA rate is stored yet.</p>;
  }
  return (
    <PricePanel
      rate={latest}
      ibja={ibja}
      spot={{ gold, silver }}
      duties={duties}
    />
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold">Gold and silver prices</h1>
      <PricesUnavailable>
        <Suspense fallback={<p className="mt-6">Loading prices…</p>}>
          <Prices />
        </Suspense>
      </PricesUnavailable>
    </main>
  );
}
