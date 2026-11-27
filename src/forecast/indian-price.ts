import type { IbjaPmRate } from "@/prices/ibja";

const GST_RATE = 0.03;

export const GOLD_PURITIES = ["24K", "22K", "18K"] as const;

export type GoldPurity = (typeof GOLD_PURITIES)[number];

const GOLD_PRODUCTS: Record<GoldPurity, "gold999" | "gold916" | "gold750"> = {
  "24K": "gold999",
  "22K": "gold916",
  "18K": "gold750",
};

export type Selection =
  { metal: "gold"; purity: GoldPurity } | { metal: "silver" };

/** The price including GST: gold per 10 g, silver per kg. */
export function priceWithGst(rate: IbjaPmRate, selection: Selection): number {
  const product =
    selection.metal === "gold" ? GOLD_PRODUCTS[selection.purity] : "silver999";
  return rate[product] * (1 + GST_RATE);
}
