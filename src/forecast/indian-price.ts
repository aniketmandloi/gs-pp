import type { IbjaPmRate } from "@/prices/ibja";

const GST_RATE = 0.03;

export const GOLD_PURITIES = ["24K", "22K", "18K"] as const;

export type GoldPurity = (typeof GOLD_PURITIES)[number];

// The IBJA rate columns are named by fineness: gold999, gold916, gold750.
export const GOLD_FINENESS = {
  "24K": "999",
  "22K": "916",
  "18K": "750",
} as const satisfies Record<GoldPurity, string>;

export type Selection =
  { metal: "gold"; purity: GoldPurity } | { metal: "silver" };

/** The price including GST: gold per 10 g, silver per kg. */
export function priceWithGst(rate: IbjaPmRate, selection: Selection): number {
  const product =
    selection.metal === "gold"
      ? (`gold${GOLD_FINENESS[selection.purity]}` as const)
      : "silver999";
  return rate[product] * (1 + GST_RATE);
}
