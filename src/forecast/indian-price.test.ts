import { describe, expect, test } from "vitest";
import {
  currentPremium,
  priceHistory,
  priceWithGst,
  spotPriceWithGst,
  type Selection,
} from "./indian-price";

const rate = {
  date: "2026-11-26",
  gold999: 100_000,
  gold916: 91_600,
  gold750: 75_000,
  silver999: 150_000,
};

test("gold is the IBJA PM rate for the purity plus 3% GST", () => {
  expect(priceWithGst(rate, { metal: "gold", purity: "24K" })).toBeCloseTo(
    103_000,
  );
  expect(priceWithGst(rate, { metal: "gold", purity: "22K" })).toBeCloseTo(
    94_348,
  );
  expect(priceWithGst(rate, { metal: "gold", purity: "18K" })).toBeCloseTo(
    77_250,
  );
});

test("silver is the IBJA 999 PM rate plus 3% GST", () => {
  expect(priceWithGst(rate, { metal: "silver" })).toBeCloseTo(154_500);
});

const duties = [
  { effectiveFrom: "2024-07-24", rate: 0.06 },
  { effectiveFrom: "2026-05-13", rate: 0.15 },
];

// 311,034.768 INR per troy ounce of gold is 100,000 per 10 g.
const GOLD_SPOT = 311_034.768;
// 3,110.34768 INR per troy ounce of silver is 100,000 per kg.
const SILVER_SPOT = 3_110.34768;

function ibja(date: string, gold999: number, gold916 = 0, silver999 = 0) {
  return { date, gold999, gold916, gold750: 0, silver999 };
}

function spotOn(dates: string[], inrPerTroyOz: number) {
  return dates.map((date) => ({ date, inrPerTroyOz }));
}

function calendarDays(from: string, to: string): string[] {
  const days: string[] = [];
  for (let ms = Date.parse(from); ms <= Date.parse(to); ms += 86_400_000) {
    days.push(new Date(ms).toISOString().slice(0, 10));
  }
  return days;
}

test("spot converts to gold per 10 g with duty, premium, GST, and purity", () => {
  expect(
    spotPriceWithGst(GOLD_SPOT, 0.06, 1.1, { metal: "gold", purity: "24K" }),
  ).toBeCloseTo(120_098);
  expect(
    spotPriceWithGst(GOLD_SPOT, 0.06, 1.1, { metal: "gold", purity: "22K" }),
  ).toBeCloseTo(110_009.768);
  expect(
    spotPriceWithGst(GOLD_SPOT, 0.06, 1.1, { metal: "gold", purity: "18K" }),
  ).toBeCloseTo(90_073.5);
});

test("spot converts to silver per kg with duty, premium, and GST", () => {
  expect(
    spotPriceWithGst(SILVER_SPOT, 0.15, 1.2, { metal: "silver" }),
  ).toBeCloseTo(142_140);
});

test("the premium divides each IBJA 999 rate by spot with the duty in force that day", () => {
  const spot = spotOn(
    ["2026-05-11", "2026-05-12", "2026-05-13", "2026-05-14"],
    GOLD_SPOT,
  );
  // 116,600 is 100,000 × 1.06 × 1.1, and 138,000 is 100,000 × 1.15 × 1.2.
  const rates = [
    ibja("2026-05-11", 116_600),
    ibja("2026-05-12", 116_600),
    ibja("2026-05-13", 138_000),
    ibja("2026-05-14", 138_000),
  ];

  expect(currentPremium("gold", spot, rates, duties)).toBeCloseTo(1.15);
});

test("the silver premium uses the IBJA silver 999 rate per kg", () => {
  const spot = spotOn(["2026-06-01"], SILVER_SPOT);
  // 149,500 is 100,000 × 1.15 × 1.3.
  const rates = [ibja("2026-06-01", 0, 0, 149_500)];

  expect(currentPremium("silver", spot, rates, duties)).toBeCloseTo(1.3);
});

test("the premium averages only the last 20 IBJA dates that have a spot price", () => {
  const days = calendarDays("2026-06-01", "2026-06-22");
  const spot = spotOn(days.slice(0, -1), GOLD_SPOT);
  const rates = days.map((date, index) =>
    // The oldest date is past the 20, and the newest has no spot price.
    ibja(date, index === 0 || index === days.length - 1 ? 1_000_000 : 115_000),
  );

  expect(currentPremium("gold", spot, rates, duties)).toBeCloseTo(1);
});

test("the premium fails when no IBJA date has a spot price", () => {
  expect(() =>
    currentPremium(
      "gold",
      spotOn(["2026-06-01"], GOLD_SPOT),
      [ibja("2026-06-02", 115_000)],
      duties,
    ),
  ).toThrow("No spot price on any IBJA date");
});

describe("the price history across the 2026-05-13 duty change", () => {
  const spot = spotOn(calendarDays("2026-05-08", "2026-05-17"), GOLD_SPOT);
  // The premium is the mean of 1.2 on 2026-05-14 and 1.3 on 2026-05-15; 2026-05-18 has no spot price.
  const rates = [
    ibja("2026-05-14", 138_000, 126_000),
    ibja("2026-05-15", 149_500, 137_000),
    ibja("2026-05-18", 126_500, 116_000),
  ];

  function pricesByDate(selection: Selection) {
    return priceHistory(spot, rates, duties, selection).map(
      ({ date, price }) => [date, Math.round(price * 100) / 100],
    );
  }

  test("uses IBJA rates where published and converted spot on other weekdays", () => {
    expect(pricesByDate({ metal: "gold", purity: "24K" })).toEqual([
      ["2026-05-08", 136_475],
      ["2026-05-11", 136_475],
      ["2026-05-12", 136_475],
      ["2026-05-13", 148_062.5],
      ["2026-05-14", 142_140],
      ["2026-05-15", 153_985],
      ["2026-05-18", 130_295],
    ]);
  });

  test("uses the IBJA purity column and the purity share of converted spot", () => {
    expect(pricesByDate({ metal: "gold", purity: "22K" })).toEqual([
      ["2026-05-08", 125_011.1],
      ["2026-05-11", 125_011.1],
      ["2026-05-12", 125_011.1],
      ["2026-05-13", 135_625.25],
      ["2026-05-14", 129_780],
      ["2026-05-15", 141_110],
      ["2026-05-18", 119_480],
    ]);
  });
});
