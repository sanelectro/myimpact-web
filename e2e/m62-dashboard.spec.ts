import { expect, test, type Page, type Route } from "@playwright/test";
import type {
  GoalAssessment,
  GoalAssessmentLifecycle,
  GoalCriterionResult,
} from "../src/types/api";

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

function makeAssessment(
  goalId: string,
  result: GoalCriterionResult,
  lifecycleState: GoalAssessmentLifecycle | null,
): GoalAssessment {
  const criterionId = `criterion-${goalId}`;
  const current = lifecycleState === "CURRENT";
  const progress = result === "MET" ? 100 : result === "IN_PROGRESS" ? 40 : null;
  const criterionAssessment = lifecycleState
    ? {
        id: `assessment-${goalId}`,
        run_id: `run-${goalId}`,
        criterion_id: criterionId,
        criterion_version_id: `version-${goalId}`,
        criterion_version: 1,
        result,
        lifecycle_state: lifecycleState,
        progress_percentage: progress,
        rationale: "Assessment fixture.",
        confidence: 0.8,
        input_fingerprint: `fingerprint-${goalId}`,
        model_version: "test-model",
        prompt_version: "test-prompt",
        created_at: "2026-10-25T00:00:00Z",
        evidence: [],
        events: [],
      }
    : null;

  return {
    goal_id: goalId,
    run_id: criterionAssessment ? `run-${goalId}` : null,
    run_status: criterionAssessment ? "COMPLETED" : null,
    run_error_message: null,
    criteria_count: 1,
    assessed_criteria_count: current ? 1 : 0,
    criteria_met_count: current && result === "MET" ? 1 : 0,
    criteria_met_percentage: current ? (result === "MET" ? 100 : 0) : null,
    goal_progress_percentage: current ? progress : null,
    evidence_coverage_percentage: 0,
    average_confidence: current ? 0.8 : null,
    criteria: [{
      criterion_id: criterionId,
      criterion_version: 1,
      result,
      lifecycle_state: lifecycleState,
      progress_percentage: progress,
      assessment: criterionAssessment,
    }],
    updated_at: "2026-10-25T00:00:00Z",
  };
}

async function installDashboardApi(
  page: Page,
  goals: DashboardGoal[],
  assessments: Record<string, GoalAssessment> = {},
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
        return json(
          route,
          200,
          assessments[goalId] ?? makeAssessment(goalId, "NOT_ASSESSED", null),
        );
      }
      if (action === "evidence" || action === "impact") {
        return json(route, 200, []);
      }
    }

    return json(route, 404, { detail: `No fixture for ${request.method()} ${url.pathname}` });
  });
}

test("dashboard counts active goals with at least one current criterion assessment", async ({ page }) => {
  const goals = [
    { id: "in-progress", title: "Progressing goal", status: "active" },
    { id: "needs-review", title: "Goal needing review", status: "active" },
    { id: "stale-only", title: "Goal with stale assessment", status: "active" },
    { id: "unassessed", title: "Unassessed goal", status: "active" },
    { id: "completed", title: "Completed goal", status: "completed" },
  ];

  await installDashboardApi(page, goals, {
    "in-progress": makeAssessment("in-progress", "IN_PROGRESS", "CURRENT"),
    "needs-review": makeAssessment("needs-review", "NEEDS_REVIEW", "CURRENT"),
    "stale-only": makeAssessment("stale-only", "MET", "STALE"),
    "unassessed": makeAssessment("unassessed", "NOT_ASSESSED", null),
    completed: makeAssessment("completed", "MET", "CURRENT"),
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Your career story, at a glance." })).toBeVisible();

  const goalsCard = page.locator(".progress-card").filter({
    has: page.locator(".progress-card-title", { hasText: "Goals" }),
  });
  await expect(goalsCard.locator(".progress-card-status")).toHaveText("2/4");
  await expect(goalsCard.locator(".progress-card-meta")).toContainText("3 goals need review");
});

test("dashboard shows the empty state for a new user", async ({ page }) => {
  await installDashboardApi(page, []);
  await page.goto("/dashboard");

  const goalsCard = page.locator(".progress-card").filter({
    has: page.locator(".progress-card-title", { hasText: "Goals" }),
  });
  await expect(goalsCard.locator(".progress-card-status")).toHaveText("0/0");
  await expect(goalsCard.locator(".progress-card-meta")).toContainText("0 goals need review");
  await expect(page.getByText("Once your evidence is assessed, your achievements will appear here.")).toBeVisible();
  await expect(page.getByText("Start by adding an active goal.")).toBeVisible();
});

test("dashboard reports a goal API failure", async ({ page }) => {
  await installDashboardApi(page, [], {}, true);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "We could not load your progress" }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".error-card")).toContainText("Dashboard API unavailable.");
});
