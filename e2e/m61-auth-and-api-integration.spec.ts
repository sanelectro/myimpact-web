import { expect, test, type Page, type Route } from "@playwright/test";

const user = {
  id: "m61-user",
  name: "M6.1 Browser User",
  email: "m61@example.com",
  role: "Lead Software Engineer",
  is_platform_admin: false,
};

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installApiFixtures(page: Page) {
  let signedIn = false;
  let refreshExpired = false;
  let failLogout = false;
  let logoutCount = 0;
  const protectedApiRequests: string[] = [];

  await page.route("**/auth/refresh", async (route) => {
    if (!signedIn || refreshExpired) {
      return json(route, 401, { detail: "No active session" });
    }
    return json(route, 200, {
      access_token: "m61-access-token",
      expires_in: 3600,
      user,
    });
  });

  await page.route("**/auth/login", async (route) => {
    const body = route.request().postDataJSON() as {
      email: string;
      password: string;
    };
    if (body.password !== "correct-password") {
      return json(route, 401, { detail: "Invalid email or password." });
    }
    signedIn = true;
    return json(route, 200, {
      access_token: "m61-access-token",
      expires_in: 3600,
      user,
    });
  });

  await page.route("**/auth/logout", async (route) => {
    logoutCount += 1;
    signedIn = false;
    if (failLogout) return json(route, 503, { detail: "Logout service unavailable." });
    return json(route, 200, { detail: "Signed out" });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    protectedApiRequests.push(request.headers().authorization ?? "");
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/goals" && request.method() === "GET") {
      return json(route, 200, []);
    }
    return json(route, 404, { detail: `No fixture for ${request.method()} ${url.pathname}` });
  });

  return {
    protectedApiRequests,
    getLogoutCount: () => logoutCount,
    expireRefresh: () => {
      refreshExpired = true;
    },
    failLogout: () => {
      failLogout = true;
    },
  };
}

test("sign-in, API authorization, session restoration, and sign-out work in the browser", async ({
  page,
}) => {
  const state = await installApiFixtures(page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password.");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Your career story, at a glance." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  expect(state.protectedApiRequests).toContain("Bearer m61-access-token");

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("M6.1 Browser User")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(state.getLogoutCount()).toBe(1);

  await page.goto("/goals");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("an expired refresh session returns the user to sign-in", async ({ page }) => {
  const state = await installApiFixtures(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  state.expireRefresh();
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your career story, at a glance." }))
    .toHaveCount(0);
});

test("logout clears the local session and reports server-side revocation failure", async ({
  page,
}) => {
  const state = await installApiFixtures(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("correct-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  state.failLogout();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status")).toContainText(
    "Signed out locally, but the server could not revoke the refresh session: Logout service unavailable.",
  );
  await page.goto("/goals");
  await expect(page).toHaveURL(/\/login$/);
  expect(state.getLogoutCount()).toBe(1);
});
