import { test, expect } from "@playwright/test";

const routes = ["/", "/tasks", "/projects", "/brainstorm", "/notes", "/calendar", "/meetings", "/reviews", "/search", "/notifications", "/settings"];

test.describe("unauthenticated", () => {
  for (const r of routes) {
    test(`${r} redirects to login`, async ({ page }) => {
      await page.goto(r);
      await expect(page).toHaveURL(/\/login/);
    });
  }
  test("export is not public", async ({ request }) => {
    const res = await request.get("/export?format=json", { maxRedirects: 0 });
    expect([302, 303, 307, 308, 401, 403]).toContain(res.status());
  });
  test("login has no sign-up path", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/sign up|create account|register/i)).toHaveCount(0);
  });
});

// Authenticated flows run only when the owner test credentials are supplied via env. Otherwise they are skipped, not faked.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
test.describe("owner session", () => {
  test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD not set");
  test("sign in, create a task, see it listed", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").first().fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/tasks");
    const title = `e2e task ${Date.now()}`;
    await page.getByLabel(/title/i).first().fill(title);
    await page.getByRole("button", { name: /add|create|save/i }).first().click();
    await expect(page.getByText(title)).toBeVisible();
  });
});
