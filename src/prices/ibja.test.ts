import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";
import { parseThirtyDayPdf, thirtyDayPdfUrl } from "./ibja";

// IBJA's "Previous 30 Days" PDF as downloaded on 2026-11-27, before that day's PM fixing.
const fixture = join(__dirname, "fixtures", "ibja-30-days-2026-11-27.pdf");

async function parseFixture() {
  return parseThirtyDayPdf(new Uint8Array(await readFile(fixture)));
}

test("parses the PM rates for 999, 916, and 750 gold and 999 silver", async () => {
  const rates = await parseFixture();

  expect(rates[0]).toEqual({
    date: "2026-11-26",
    gold999: 122641,
    gold916: 112339,
    gold750: 91981,
    silver999: 147347,
  });
  expect(rates.at(-1)).toEqual({
    date: "2026-10-26",
    gold999: 141710,
    gold916: 129806,
    gold750: 106283,
    silver999: 194479,
  });
});

test("keeps only the dates that have a PM fixing", async () => {
  const dates = (await parseFixture()).map((rate) => rate.date);

  // 27 Nov has only its AM rates, 10 Nov has dashes for PM, and 9 and 24 Nov are holidays.
  expect(dates).toEqual([
    "2026-11-26",
    "2026-11-25",
    "2026-11-23",
    "2026-11-20",
    "2026-11-19",
    "2026-11-18",
    "2026-11-17",
    "2026-11-16",
    "2026-11-13",
    "2026-11-12",
    "2026-11-11",
    "2026-11-06",
    "2026-11-05",
    "2026-11-04",
    "2026-11-03",
    "2026-11-02",
    "2026-10-30",
    "2026-10-29",
    "2026-10-28",
    "2026-10-27",
    "2026-10-26",
  ]);
});

test("finds the 30-day PDF link on the IBJA homepage", () => {
  const homepage = `<a target="_blank" href="../UploadedFiles/30DaysPdf/Pdf_3411_20261127074853615_Daily Opening and Closing Market Rate.pdf" class="textsmall">`;

  expect(thirtyDayPdfUrl(homepage).href).toBe(
    "https://ibjarates.com/UploadedFiles/30DaysPdf/Pdf_3411_20261127074853615_Daily%20Opening%20and%20Closing%20Market%20Rate.pdf",
  );
});

test("fails when the IBJA homepage has no 30-day PDF link", () => {
  expect(() => thirtyDayPdfUrl("<html></html>")).toThrow(
    "IBJA homepage has no link to the 30-day PDF",
  );
});
