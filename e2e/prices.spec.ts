import { expect, test, type Page } from "@playwright/test";

// The prices come from e2e/fixture-prices.sql: the latest IBJA PM rates are from 2026-11-26, and
// the latest spot prices from 2026-11-20.

/** Points at the chart's first or last day and expects its tooltip to show the texts. */
async function expectChartDay(
  page: Page,
  day: "first" | "last",
  texts: string[],
) {
  const chart = page.getByRole("figure", {
    name: "Last 12 months, including 3% GST",
  });
  // The chart is redrawn at its full width once it hydrates, so the line is measured again
  // until the tooltip answers.
  await expect(async () => {
    const line = await chart.locator(".recharts-line-curve").boundingBox();
    if (!line) {
      throw new Error("The chart has no line");
    }
    // Days sit more than 1 px apart, so half a pixel in stays on the end day.
    const x = day === "first" ? line.x + 0.5 : line.x + line.width - 0.5;
    await page.mouse.move(x, line.y + line.height / 2);
    for (const text of texts) {
      await expect(chart).toContainText(text, { timeout: 1000 });
    }
  }).toPass();
}

test("the page opens on Gold 24K with the latest IBJA PM rate plus GST", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("tab", { name: "Gold", selected: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "24K", pressed: true }),
  ).toBeVisible();
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("Gold 24K (999) per 10 g");
  await expect(panel).toContainText("₹1,03,000");
  await expect(panel).toContainText("IBJA PM rate of 26 Nov 2026");
});

test("the purity switch shows 22K and 18K gold per 10 g", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByRole("tabpanel");

  await page.getByRole("button", { name: "22K" }).click();
  await expect(panel).toContainText("Gold 22K (916) per 10 g");
  await expect(panel).toContainText("₹94,348");

  await page.getByRole("button", { name: "18K" }).click();
  await expect(panel).toContainText("Gold 18K (750) per 10 g");
  await expect(panel).toContainText("₹77,250");
});

test("the Silver tab shows silver 999 per kg without the purity switch", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("tab", { name: "Silver" }).click();

  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("Silver 999 per kg");
  await expect(panel).toContainText("₹1,54,500");
  await expect(page.getByRole("group", { name: "Gold purity" })).toHaveCount(0);
});

test("the chart starts 12 months back with spot converted at the current premium", async ({
  page,
}) => {
  await page.goto("/");

  await expectChartDay(page, "first", ["20 Nov 2025", "₹94,939"]);
});

test("the chart ends on the latest IBJA PM rate plus GST", async ({ page }) => {
  await page.goto("/");

  await expectChartDay(page, "last", ["26 Nov 2026", "₹1,03,000"]);
});

test("the chart follows the selected purity and metal", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "22K" }).click();
  await expectChartDay(page, "first", ["20 Nov 2025", "₹86,964"]);
  await expectChartDay(page, "last", ["26 Nov 2026", "₹94,348"]);

  await page.getByRole("tab", { name: "Silver" }).click();
  await expectChartDay(page, "first", ["20 Nov 2025", "₹1,42,409"]);
  await expectChartDay(page, "last", ["26 Nov 2026", "₹1,54,500"]);
});

test("the data date is a warning when spot prices are more than 2 trading days old", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("alert").filter({ hasText: "Data as of" }),
  ).toHaveText(
    "Data as of 20 Nov 2026. Spot prices are more than 2 trading days old.",
  );
});

test.describe("at 375 px wide", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("the page has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tabpanel")).toContainText("₹1,03,000");

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

test("/health reports the latest spot and IBJA dates", async ({ request }) => {
  const response = await request.get("/health");

  expect(await response.json()).toStrictEqual({
    status: "ok",
    commit: process.env.COMMIT_SHA,
    latestSpotDate: "2026-11-20",
    latestIbjaDate: "2026-11-26",
  });
});
