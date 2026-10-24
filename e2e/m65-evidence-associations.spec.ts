import { expect, test, type Page, type Route } from "@playwright/test";

const goalId = "goal-m65";
const milestoneId = "milestone-m65";
const now = "2026-10-23T10:00:00Z";

const goal = {
  id: goalId,
  title: "Improve release reliability",
  description: "Make releases safer and more predictable.",
  scope: "team",
  start_date: "2026-01-01",
  end_date: null,
  status: "active",
  sub_status: "on_track",
  deactivation_reason: null,
  source: null,
  source_document_id: null,
  created_at: now,
  updated_at: now,
};

const milestone = {
  id: milestoneId,
  goal_id: goalId,
  title: "Automate release verification",
  description: null,
  completion_criteria: null,
  status: "in_progress",
  due_date: null,
  archived_at: null,
  created_at: now,
  updated_at: now,
};

type Evidence = {
  evidence_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  source_type: string;
  source_url: string | null;
  captured_at: string;
  relevance: string;
  confidence: number;
  reason: string | null;
};

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installMockApi(page: Page) {
  const evidence: Evidence[] = [];
  const requests: Array<Record<string, unknown>> = [];

  await page.route("**/auth/refresh", async (route) => {
    await json(route, 200, {
      access_token: "test-access-token",
      expires_in: 3600,
      user: {
        id: "user-1",
        name: "Alex Johnson",
        email: "alex@example.com",
        role: "Lead Software Engineer",
      },
    });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const goalMatch = path.match(/^\/api\/v1\/goals\/([^/]+)(?:\/(.*))?$/);
    const requestGoalId = goalMatch?.[1];
    const action = goalMatch?.[2];

    if (requestGoalId !== goalId) {
      return json(route, 404, { detail: "Goal not found" });
    }
    if (method === "GET" && !action) return json(route, 200, goal);
    if (method === "GET" && action === "history") return json(route, 200, []);
    if (method === "GET" && action === "assessment") {
      return json(route, 200, {
        goal_id: goalId,
        expected_achievement_count: 3,
        achievement_count: evidence.length,
        evidence_count: evidence.length,
        demonstrated_impact_count: 0,
        qualifying_achievement_count: 0,
        progress_percentage: 0,
        status: "not_started",
        description: "Evidence is being collected.",
      });
    }
    if (method === "GET" && action === "evidence") return json(route, 200, evidence);
    if (method === "POST" && action === "evidence") {
      const body = request.postDataJSON() as Record<string, unknown>;
      requests.push(body);
      const saved: Evidence = {
        evidence_id: `evidence-${evidence.length + 1}`,
        milestone_id: (body.milestone_id as string | null) ?? null,
        title: String(body.title),
        description: (body.description as string | null) ?? null,
        source_type: String(body.source_type),
        source_url: (body.source_url as string | null) ?? null,
        captured_at: String(body.captured_at),
        relevance: String(body.relevance),
        confidence: 1,
        reason: null,
      };
      evidence.push(saved);
      return json(route, 201, saved);
    }
    if (method === "GET" && action === "milestones") return json(route, 200, [milestone]);
    if (method === "GET" && action === "impact") return json(route, 200, []);
    if (method === "GET" && action === "expectations") return json(route, 200, []);
    return json(route, 404, { detail: `No fixture for ${method} ${path}` });
  });

  return { evidence, requests };
}

test("evidence can be attached directly to a goal or to one of its milestones", async ({ page }) => {
  const state = await installMockApi(page);
  await page.goto(`/goals/${goalId}`);
  await expect(page.getByRole("heading", { name: goal.title })).toBeVisible();

  await page.getByRole("button", { name: "Add evidence" }).click();
  await page.getByLabel("Attach evidence to").selectOption("");
  await page.getByRole("tab", { name: "Add manually" }).click();
  await page.getByLabel("Evidence title").fill("Overall reliability improvement");
  await page.getByLabel("What did you do, and what changed?").fill("Reduced release risk across the team.");
  await page.getByLabel("Link to supporting proof").fill("https://example.com/release-metrics");
  await page.getByRole("button", { name: "Save evidence" }).click();

  const goalEvidenceCard = page.locator(".achievement-card").filter({
    hasText: "Overall reliability improvement",
  });
  await expect(goalEvidenceCard.getByText("Attached directly to goal")).toBeVisible();
  expect(state.requests[0].milestone_id).toBeNull();

  await page.getByRole("button", { name: "Add evidence" }).click();
  await page.getByLabel("Attach evidence to").selectOption(milestoneId);
  await page.getByRole("tab", { name: "Add manually" }).click();
  await page.getByLabel("Evidence title").fill("Release verification automation");
  await page.getByLabel("What did you do, and what changed?").fill("Added automated checks before deployment.");
  await page.getByLabel("Link to supporting proof").fill("https://example.com/verification-pipeline");
  await page.getByRole("button", { name: "Save evidence" }).click();

  const milestoneEvidenceCard = page.locator(".achievement-card").filter({
    hasText: "Release verification automation",
  });
  await expect(milestoneEvidenceCard.getByText("Milestone: Automate release verification")).toBeVisible();
  expect(state.requests[1].milestone_id).toBe(milestoneId);
});
