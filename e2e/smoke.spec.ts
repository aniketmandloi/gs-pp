import { expect, test } from "@playwright/test";

test("the page loads", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Gold and silver prices" }),
  ).toBeVisible();
});

test("/health reports ok and the built commit", async ({ request }) => {
  const response = await request.get("/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    status: "ok",
    commit: process.env.COMMIT_SHA,
  });
});
