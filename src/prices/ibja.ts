import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { ibjaRate } from "@/db/schema";

export type IbjaPmRate = Omit<typeof ibjaRate.$inferInsert, "fetchedAt">;
type Product = Exclude<keyof IbjaPmRate, "date">;

const IBJA_URL = "https://ibjarates.com/";

const PRODUCTS = new Map<string, Product>([
  ["Gold 999", "gold999"],
  ["Gold 916", "gold916"],
  ["Gold 750", "gold750"],
  ["Silver 999", "silver999"],
]);

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Rows sit 11 units apart, and a row's date and its rates can be drawn up to 1 unit apart.
const ROW_TOLERANCE = 4;
// Rates are drawn about 3 units right of their column heading; columns sit about 41 units apart.
const COLUMN_TOLERANCE = 10;

interface PlacedText {
  text: string;
  x: number;
  y: number;
}

interface Column {
  label: string;
  session: "AM" | "PM";
  x: number;
}

function isoDate(pdfDate: string): string | undefined {
  const match = /^(\d{2})-([A-Z][a-z]{2})-(\d{2})$/.exec(pdfDate);
  if (!match) {
    return undefined;
  }
  const [, day, monthName, year] = match;
  const month = MONTHS.indexOf(monthName) + 1;
  if (month === 0) {
    throw new Error(`IBJA PDF: unknown month in ${pdfDate}`);
  }
  return `20${year}-${String(month).padStart(2, "0")}-${day}`;
}

async function placedTexts(pdf: Uint8Array): Promise<PlacedText[]> {
  const document = await getDocument({
    data: pdf,
    verbosity: VerbosityLevel.ERRORS,
  }).promise;
  const content = await (await document.getPage(1)).getTextContent();
  const texts: PlacedText[] = [];
  for (const item of content.items) {
    if (!("str" in item) || item.str.trim() === "") {
      continue;
    }
    const [, , , , x, y]: number[] = item.transform;
    texts.push({ text: item.str.trim(), x, y });
  }
  return texts;
}

// Each heading such as "Gold 916" is followed by its session, "(AM Price)" or "(PM Price)".
function columns(texts: PlacedText[]): Column[] {
  const found: Column[] = [];
  for (const [index, { text, x }] of texts.entries()) {
    if (!/^(Gold|Silver) \d{3}$/.test(text)) {
      continue;
    }
    const session = texts[index + 1]?.text.match(/^\((AM|PM)\b/)?.[1];
    if (session !== "AM" && session !== "PM") {
      throw new Error(`IBJA PDF: no AM or PM label after ${text}`);
    }
    found.push({ label: text, session, x });
  }
  return found;
}

function nearest<T>(
  items: T[],
  distance: (item: T) => number,
  tolerance: number,
): T | undefined {
  const closest = items.reduce<T | undefined>(
    (best, item) =>
      best === undefined || distance(item) < distance(best) ? item : best,
    undefined,
  );
  return closest !== undefined && distance(closest) <= tolerance
    ? closest
    : undefined;
}

/**
 * Parses IBJA's "Previous 30 Days" PDF into PM rates, newest first. Weekends, holidays, and
 * days whose PM fixing is not published yet have no PM rates and are left out.
 */
export async function parseThirtyDayPdf(
  pdf: Uint8Array,
): Promise<IbjaPmRate[]> {
  const texts = await placedTexts(pdf);
  const pdfColumns = columns(texts);
  for (const label of PRODUCTS.keys()) {
    if (!pdfColumns.some((c) => c.label === label && c.session === "PM")) {
      throw new Error(`IBJA PDF: no PM column for ${label}`);
    }
  }

  const rows = texts.flatMap(({ text, y }) => {
    const date = isoDate(text);
    return date ? [{ date, y, rates: new Map<Product, number>() }] : [];
  });
  for (const { text, x, y } of texts) {
    if (!/^\d+$/.test(text)) {
      continue;
    }
    const row = nearest(rows, (r) => Math.abs(r.y - y), ROW_TOLERANCE);
    const column = nearest(
      pdfColumns,
      (c) => Math.abs(c.x - x),
      COLUMN_TOLERANCE,
    );
    if (!row || !column) {
      throw new Error(`IBJA PDF: ${text} is not in a dated row and column`);
    }
    const product = PRODUCTS.get(column.label);
    if (column.session === "PM" && product) {
      row.rates.set(product, Number(text));
    }
  }

  return rows.flatMap(({ date, rates }) => {
    if (rates.size === 0) {
      return [];
    }
    const gold999 = rates.get("gold999");
    const gold916 = rates.get("gold916");
    const gold750 = rates.get("gold750");
    const silver999 = rates.get("silver999");
    if (!gold999 || !gold916 || !gold750 || !silver999) {
      throw new Error(`IBJA PDF: ${date} has only some PM rates`);
    }
    return [{ date, gold999, gold916, gold750, silver999 }];
  });
}

export function thirtyDayPdfUrl(homepage: string): URL {
  const href = /href="([^"]*UploadedFiles\/30DaysPdf\/[^"]+\.pdf)"/.exec(
    homepage,
  )?.[1];
  if (!href) {
    throw new Error("IBJA homepage has no link to the 30-day PDF");
  }
  return new URL(href, IBJA_URL);
}

async function fetchOk(url: URL | string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return response;
}

export async function fetchThirtyDayRates(): Promise<IbjaPmRate[]> {
  const homepage = await (await fetchOk(IBJA_URL)).text();
  const pdf = await fetchOk(thirtyDayPdfUrl(homepage));
  return parseThirtyDayPdf(new Uint8Array(await pdf.arrayBuffer()));
}
