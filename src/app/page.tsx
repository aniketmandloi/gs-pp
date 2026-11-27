import { desc } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { ibjaRate } from "@/db/schema";
import PriceHeader from "./price-header";
import PricesUnavailable from "./prices-unavailable";

async function TodayPrice() {
  const [latest] = await db
    .select({
      date: ibjaRate.date,
      gold999: ibjaRate.gold999,
      gold916: ibjaRate.gold916,
      gold750: ibjaRate.gold750,
      silver999: ibjaRate.silver999,
    })
    .from(ibjaRate)
    .orderBy(desc(ibjaRate.date))
    .limit(1);
  if (!latest) {
    return <p className="mt-6">No IBJA rate is stored yet.</p>;
  }
  return <PriceHeader rate={latest} />;
}

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold">Gold and silver prices</h1>
      <PricesUnavailable>
        <Suspense fallback={<p className="mt-6">Loading prices…</p>}>
          <TodayPrice />
        </Suspense>
      </PricesUnavailable>
    </main>
  );
}
