import { expect, test } from "@playwright/test";

test("the page loads", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Gold and silver prices" }),
  ).toBeVisible();
});

test("/health reports ok, the built commit, and the latest price dates", async ({
  request,
}) => {
  const response = await request.get("/health");

  expect(response.status()).toBe(200);
  const { latestSpotDate, latestIbjaDate, ...health } = await response.json();
  expect(health).toStrictEqual({
    status: "ok",
    commit: process.env.COMMIT_SHA,
  });
  // The dates are null until pnpm seed has filled the database.
  for (const date of [latestSpotDate, latestIbjaDate]) {
    expect(String(date)).toMatch(/^(\d{4}-\d{2}-\d{2}|null)$/);
  }
});
