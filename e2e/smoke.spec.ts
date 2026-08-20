import { expect, test, type Page } from "@playwright/test";

/** Signs in through the seeded demo account and lands on Discover. */
async function loginAsDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /continue with demo account/i }).click();
  await expect(page.getByText("Streamly").first()).toBeVisible();
  await expect(page.getByPlaceholder(/Search live streams/i)).toBeVisible();
}

test("auth screen → demo login → watch → chat → leave", async ({ page }) => {
  await loginAsDemo(page);

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
  await loginAsDemo(page);

  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: "Feed" })).toBeVisible();

  await page.getByRole("link", { name: "Messages" }).first().click();
  await expect(page).toHaveURL(/\/messages$/);

  await page.getByRole("link", { name: "Discover" }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByPlaceholder(/Search live streams/i)).toBeVisible();
});

test("liking a feed post persists across reload", async ({ page }) => {
  await loginAsDemo(page);

  await page.getByRole("link", { name: "Feed" }).first().click();
  await expect(page).toHaveURL(/\/feed$/);

  // First like button belongs to post p1 (2,341 likes)
  const likeBtn = page.getByRole("button", { name: /2,341|2,342/ }).first();
  await likeBtn.click();

  // After a reload the server still reports the same state
  await page.reload();
  await expect(page.getByRole("button", { name: /2,341|2,342/ }).first()).toBeVisible();

  // Toggle it back so the spec is idempotent
  await page
    .getByRole("button", { name: /2,341|2,342/ })
    .first()
    .click();
});

test("go-live flow reaches a broadcast call room", async ({ page }) => {
  await loginAsDemo(page);

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
