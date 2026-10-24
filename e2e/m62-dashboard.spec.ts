import { expect, test, type Page, type Route } from "@playwright/test";

type DashboardGoal = {
  id: string;
  title: string;
  status: string;
};

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installDashboardApi(
  page: Page,
  goals: DashboardGoal[],
  failGoals = false,
) {
  await page.route("**/auth/refresh", async (route) => {
    await json(route, 200, {
      access_token: "m62-access-token",
      expires_in: 3600,
      user: {
        id: "m62-user",
        name: "M6.2 Dashboard User",
        email: "m62@example.com",
        role: "Lead Software Engineer",
      },
    });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/goals" && request.method() === "GET") {
      if (failGoals) return json(route, 503, { detail: "Dashboard API unavailable." });
      return json(route, 200, goals);
    }

    const match = url.pathname.match(/^\/api\/v1\/goals\/([^/]+)\/([^/]+)$/);
    if (match) {
      const [, goalId, action] = match;
      if (action === "assessment") {
        return json(route, 200, goalId === "goal-one"
          ? {
              goal_id: goalId,
              expected_achievement_count: 3,
              achievement_count: 5,
              evidence_count: 5,
              demonstrated_impact_count: 5,
              qualifying_achievement_count: 5,
              progress_percentage: 150,
              status: "above",
              description: "Above expectations.",
            }
          : {
              goal_id: goalId,
              expected_achievement_count: 3,
              achievement_count: 1,
              evidence_count: 1,
              demonstrated_impact_count: 1,
              qualifying_achievement_count: 1,
              progress_percentage: 50,
              status: "in_progress",
              description: "Progress is underway.",
            });
      }
      if (action === "evidence") {
        return json(route, 200, goalId === "goal-one"
          ? [
              { evidence_id: "evidence-1", title: "Reduced incidents", confidence: 0.8 },
              { evidence_id: "evidence-2", title: "Improved releases", confidence: 0.8 },
            ]
          : [{ evidence_id: "evidence-3", title: "Added monitoring", confidence: 0.6 }]);
      }
      if (action === "impact") {
        return json(route, 200, goalId === "goal-one"
          ? [{
              id: "impact-1",
              impact_type: "reliability",
              impact_summary: "Deployment incidents fell by 30%.",
              impact_score: 0.8,
              created_at: "2026-10-01T00:00:00Z",
            }]
          : []);
      }
      if (action === "milestones") {
        return json(route, 200, goalId === "goal-one"
          ? [{ id: "milestone-1", status: "completed" }]
          : []);
      }
    }

    return json(route, 404, { detail: `No fixture for ${request.method()} ${url.pathname}` });
  });
}

test("dashboard summarizes partial progress and caps an individual goal above 100 percent", async ({
  page,
}) => {
  await installDashboardApi(page, [
    { id: "goal-one", title: "Improve release reliability", status: "active" },
    { id: "goal-two", title: "Strengthen service monitoring", status: "active" },
    { id: "goal-draft", title: "Plan next quarter", status: "draft" },
  ]);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Your career story, at a glance." })).toBeVisible();

  const goalsCard = page.locator(".progress-card").filter({
    has: page.locator(".progress-card-title", { hasText: "Goals" }),
  });
  await expect(goalsCard.locator(".progress-card-status")).toHaveText("75%");
  await expect(goalsCard.locator(".progress-card-meta")).toContainText("1/2 active goals met expectations");

  await expect(page.locator(".progress-card-title", { hasText: "Milestones" })).toHaveCount(0);
  await expect(page.locator(".progress-card-title", { hasText: "Evidence" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByText("Milestones")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByText("Evidence")).toHaveCount(0);

  const impactCard = page.locator(".progress-card").filter({
    has: page.locator(".progress-card-title", { hasText: "Impact" }),
  });
  await expect(impactCard.locator(".progress-card-status")).toHaveText("Strong");
  await expect(page.getByText("Deployment incidents fell by 30%.")).toBeVisible();
});

test("dashboard explains the empty state for a new user", async ({ page }) => {
  await installDashboardApi(page, []);
  await page.goto("/dashboard");

  const goalsCard = page.locator(".progress-card").filter({
    has: page.locator(".progress-card-title", { hasText: "Goals" }),
  });
  await expect(goalsCard.locator(".progress-card-status")).toHaveText("0%");
  await expect(goalsCard.locator(".progress-card-meta")).toContainText("0/0 active goals met expectations");
  await expect(page.getByText("Once your evidence is assessed, your achievements will appear here.")).toBeVisible();
  await expect(page.getByText("Start by adding an active goal.")).toBeVisible();
});

test("dashboard reports a goal API failure", async ({ page }) => {
  await installDashboardApi(page, [], true);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "We could not load your progress" }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".error-card")).toContainText("Dashboard API unavailable.");
});
