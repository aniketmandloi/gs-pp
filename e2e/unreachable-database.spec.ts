import { expect, test } from "@playwright/test";

// playwright.config.ts serves this URL with a DATABASE_URL whose host does not resolve.
test.use({ baseURL: "http://localhost:3001" });

test("the page shows an error instead of prices when the database is unreachable", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Prices could not be loaded from the database." }),
  ).toBeVisible();
  await expect(page.getByText("₹")).toHaveCount(0);
});
