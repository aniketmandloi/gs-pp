import type { IbjaPmRate } from "@/prices/ibja";

const GST_RATE = 0.03;

const GOLD_PURITIES = {
  "24K": "gold999",
  "22K": "gold916",
  "18K": "gold750",
} as const;

type GoldPurity = keyof typeof GOLD_PURITIES;

export type Selection =
  { metal: "gold"; purity: GoldPurity } | { metal: "silver" };

/** The price including GST: gold per 10 g, silver per kg. */
export function priceWithGst(rate: IbjaPmRate, selection: Selection): number {
  const product =
    selection.metal === "gold" ? GOLD_PURITIES[selection.purity] : "silver999";
  return rate[product] * (1 + GST_RATE);
}
