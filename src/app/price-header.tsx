"use client";

import { useState } from "react";
import {
  GOLD_FINENESS,
  GOLD_PURITIES,
  priceWithGst,
  type GoldPurity,
  type Selection,
} from "@/forecast/indian-price";
import type { IbjaPmRate } from "@/prices/ibja";

const METALS = [
  { metal: "gold", label: "Gold" },
  { metal: "silver", label: "Silver" },
] as const;

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const ibjaDay = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default function PriceHeader({ rate }: { rate: IbjaPmRate }) {
  const [metal, setMetal] = useState<Selection["metal"]>("gold");
  const [purity, setPurity] = useState<GoldPurity>("24K");
  const selection: Selection = metal === "gold" ? { metal, purity } : { metal };

  return (
    <section className="mt-6">
      <div role="tablist" aria-label="Metal" className="flex border-b">
        {METALS.map((tab) => (
          <button
            key={tab.metal}
            id={`${tab.metal}-tab`}
            type="button"
            role="tab"
            aria-selected={metal === tab.metal}
            aria-controls="price-panel"
            onClick={() => setMetal(tab.metal)}
            className="-mb-px border-b-2 border-transparent px-4 py-2 font-medium text-neutral-500 aria-selected:border-amber-600 aria-selected:text-neutral-900"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id="price-panel"
        role="tabpanel"
        aria-labelledby={`${metal}-tab`}
        className="pt-4"
      >
        {metal === "gold" && (
          <div role="group" aria-label="Gold purity" className="flex gap-2">
            {GOLD_PURITIES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={purity === option}
                onClick={() => setPurity(option)}
                className="rounded-full border border-neutral-300 px-3 py-1 text-sm aria-pressed:border-amber-600 aria-pressed:bg-amber-50 aria-pressed:text-amber-900"
              >
                {option}
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-sm text-neutral-600">
          {selection.metal === "gold"
            ? `Gold ${selection.purity} (${GOLD_FINENESS[selection.purity]}) per 10 g`
            : "Silver 999 per kg"}
        </p>
        <p className="text-4xl font-semibold tabular-nums">
          {rupees.format(priceWithGst(rate, selection))}
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Including 3% GST. IBJA PM rate of{" "}
          {ibjaDay.format(new Date(rate.date))}.
        </p>
      </div>
    </section>
  );
}
