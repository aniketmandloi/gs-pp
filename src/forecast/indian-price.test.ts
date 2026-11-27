import { expect, test } from "vitest";
import { priceWithGst } from "./indian-price";

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
