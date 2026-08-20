import { expect, test } from "@playwright/test";

test("discover → watch → chat → leave", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Streamly")).toBeVisible();

  // The most-watched live stream carries the Featured badge
  await expect(page.getByText("Featured").first()).toBeVisible();

  // Open a stream — URL becomes the shareable /live/:id route
  await page.getByRole("button", { name: /Late Night Lofi/ }).click();
  await expect(page).toHaveURL(/\/live\/s1$/);

  // Chat works
  const input = page.getByPlaceholder("Say something...");
  await input.fill("hello from e2e");
  await input.press("Enter");
  await expect(page.getByText("hello from e2e").last()).toBeVisible();

  // Leave and land back on discover
  await page.getByRole("button", { name: "Leave call" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("tab routes are reachable and refresh-safe", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: "Feed" })).toBeVisible();

  await page.getByRole("link", { name: "Messages" }).first().click();
  await expect(page).toHaveURL(/\/messages$/);

  await page.getByRole("link", { name: "Discover" }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByPlaceholder(/Search live streams/i)).toBeVisible();
});

test("go-live flow reaches a broadcast call room", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /go live/i })
    .first()
    .click();

  // Pre-join lobby
  const startBtn = page.getByRole("button", { name: /start|go live now/i }).last();
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  await expect(page).toHaveURL(/\/live\/broadcast/);
  await expect(page.getByRole("button", { name: "Leave call" })).toBeVisible();
});
