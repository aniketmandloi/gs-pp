import type { importDuty, spotPrice } from "@/db/schema";
import type { IbjaPmRate } from "@/prices/ibja";
import { isTradingDay } from "./trading-days";

const GST_RATE = 0.03;

const TROY_OUNCE_GRAMS = 31.1034768;

const PREMIUM_TRADING_DAYS = 20;

export const GOLD_PURITIES = ["24K", "22K", "18K"] as const;

export type GoldPurity = (typeof GOLD_PURITIES)[number];

// The IBJA rate columns are named by fineness: gold999, gold916, gold750.
export const GOLD_FINENESS = {
  "24K": "999",
  "22K": "916",
  "18K": "750",
} as const satisfies Record<GoldPurity, string>;

// Converted spot prices each purity as this share of the 24K price.
const GOLD_PURITY_SHARE = {
  "24K": 1,
  "22K": 0.916,
  "18K": 0.75,
} as const satisfies Record<GoldPurity, number>;

export type Selection =
  { metal: "gold"; purity: GoldPurity } | { metal: "silver" };

type Metal = Selection["metal"];

// Gold is priced per 10 g, silver per kg.
const UNIT_GRAMS = { gold: 10, silver: 1000 } as const satisfies Record<
  Metal,
  number
>;

const IBJA_999 = {
  gold: "gold999",
  silver: "silver999",
} as const satisfies Record<Metal, keyof IbjaPmRate>;

export type SpotPrice = Pick<
  typeof spotPrice.$inferSelect,
  "date" | "inrPerTroyOz"
>;

export type ImportDuty = typeof importDuty.$inferSelect;

export interface PricePoint {
  date: string;
  price: number;
}

/** The price including GST: gold per 10 g, silver per kg. */
export function priceWithGst(rate: IbjaPmRate, selection: Selection): number {
  const product =
    selection.metal === "gold"
      ? (`gold${GOLD_FINENESS[selection.purity]}` as const)
      : "silver999";
  return rate[product] * (1 + GST_RATE);
}

function dutyOn(duties: ImportDuty[], date: string): number {
  const inForce = duties
    .filter(({ effectiveFrom }) => effectiveFrom <= date)
    .toSorted((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    .at(-1);
  if (!inForce) {
    throw new Error(`No import duty in force on ${date}`);
  }
  return inForce.rate;
}

function spotPerUnit(inrPerTroyOz: number, metal: Metal): number {
  return (inrPerTroyOz * UNIT_GRAMS[metal]) / TROY_OUNCE_GRAMS;
}

/** Spot INR per troy ounce as the price including GST: gold per 10 g, silver per kg. */
export function spotPriceWithGst(
  inrPerTroyOz: number,
  duty: number,
  premium: number,
  selection: Selection,
): number {
  const purityShare =
    selection.metal === "gold" ? GOLD_PURITY_SHARE[selection.purity] : 1;
  return (
    spotPerUnit(inrPerTroyOz, selection.metal) *
    (1 + duty) *
    premium *
    (1 + GST_RATE) *
    purityShare
  );
}

/**
 * The mean of IBJA 999 PM ÷ (spot × (1 + duty)) over the last 20 IBJA dates that have a spot
 * price. `spot` is one metal's.
 */
export function currentPremium(
  metal: Metal,
  spot: SpotPrice[],
  ibja: IbjaPmRate[],
  duties: ImportDuty[],
): number {
  const spotByDate = new Map(spot.map((s) => [s.date, s.inrPerTroyOz]));
  const ratios = ibja
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .flatMap((rate) => {
      const inrPerTroyOz = spotByDate.get(rate.date);
      return inrPerTroyOz === undefined
        ? []
        : [
            rate[IBJA_999[metal]] /
              (spotPerUnit(inrPerTroyOz, metal) *
                (1 + dutyOn(duties, rate.date))),
          ];
    })
    .slice(0, PREMIUM_TRADING_DAYS);
  if (ratios.length === 0) {
    throw new Error("No spot price on any IBJA date");
  }
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

/**
 * Daily prices including GST on trading days, by date: the IBJA PM rate where one is published,
 * otherwise spot converted at the current premium. `spot` is the selected metal's.
 */
export function priceHistory(
  spot: SpotPrice[],
  ibja: IbjaPmRate[],
  duties: ImportDuty[],
  selection: Selection,
): PricePoint[] {
  const premium = currentPremium(selection.metal, spot, ibja, duties);
  const prices = new Map(
    spot
      .filter(({ date }) => isTradingDay(date))
      .map(({ date, inrPerTroyOz }) => [
        date,
        spotPriceWithGst(
          inrPerTroyOz,
          dutyOn(duties, date),
          premium,
          selection,
        ),
      ]),
  );
  for (const rate of ibja) {
    prices.set(rate.date, priceWithGst(rate, selection));
  }
  return [...prices]
    .map(([date, price]) => ({ date, price }))
    .toSorted((a, b) => a.date.localeCompare(b.date));
}
