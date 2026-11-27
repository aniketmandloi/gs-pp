import { expect, test } from "@playwright/test";

// The prices come from e2e/fixture-prices.sql: the latest IBJA PM rates are from 2026-11-26.

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
    latestSpotDate: "2026-11-26",
    latestIbjaDate: "2026-11-26",
  });
});
