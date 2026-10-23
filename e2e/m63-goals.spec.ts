import { expect, test, type Page, type Route } from "@playwright/test";

type GoalStatus = "draft" | "approved" | "active" | "completed" | "archived";
type GoalScope = "personal" | "team" | "organization";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  scope: GoalScope;
  start_date: string | null;
  end_date: string | null;
  status: GoalStatus;
  sub_status: string;
  deactivation_reason: string | null;
  source: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
}

interface MockState {
  goals: Goal[];
  history: Record<string, Array<Record<string, string>>>;
  importResponse?: {
    imported_goals: Goal[];
    skipped_duplicates: Array<{ title: string; existing_goal_id: string }>;
  };
  uploadError?: boolean;
}

const now = "2026-10-22T12:00:00Z";

function makeGoal(
  id: string,
  title: string,
  scope: GoalScope = "personal",
  status: GoalStatus = "draft",
): Goal {
  return {
    id,
    title,
    description: "A measurable outcome for the team.",
    scope,
    start_date: "2026-01-01",
    end_date: null,
    status,
    sub_status: status === "active" ? "on_track" : status === "draft" ? "needs_review" : "not_started",
    deactivation_reason: null,
    source: null,
    source_document_id: null,
    created_at: now,
    updated_at: now,
  };
}

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installMockApi(page: Page, state: MockState) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "myimpact.mock-session",
      JSON.stringify({
        userId: "user-1",
        username: "alex",
        displayName: "Alex Johnson",
        role: "Lead Software Engineer",
        careerLevel: 5,
      }),
    );
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const goalIdMatch = path.match(/^\/api\/v1\/goals\/([^/]+)(?:\/(.*))?$/);
    const goalId = goalIdMatch?.[1] ? decodeURIComponent(goalIdMatch[1]) : undefined;
    const action = goalIdMatch?.[2];

    if (path === "/api/v1/goals" && method === "GET") {
      return json(route, 200, state.goals.filter((goal) => goal.status !== "archived"));
    }

    if (path === "/api/v1/goals" && method === "POST") {
      const body = request.postDataJSON();
      const goal = makeGoal(
        `goal-${state.goals.length + 1}`,
        body.title,
        body.scope ?? "personal",
      );
      goal.description = body.description ?? null;
      goal.start_date = body.start_date ?? "2026-01-01";
      goal.end_date = body.end_date ?? null;
      goal.source = body.source ?? null;
      state.goals.push(goal);
      return json(route, 201, goal);
    }

    if (path === "/api/v1/documents/import" && method === "POST") {
      if (state.uploadError) {
        return json(route, 422, { detail: "The document could not be processed." });
      }
      return json(route, 201, {
        id: "document-1",
        file_name: "goals.pdf",
        content_type: "application/pdf",
        document_type: "goal",
        scope_type: "employee",
        scope_id: "user-1",
        status: "processed",
        classification_type: "goal",
        classification_confidence: 0.96,
        created_at: now,
        updated_at: now,
      });
    }

    if (path === "/api/v1/goals/import-from-document" && method === "POST") {
      const result = state.importResponse ?? { imported_goals: [], skipped_duplicates: [] };
      for (const goal of result.imported_goals) {
        if (!state.goals.some((existing) => existing.id === goal.id)) state.goals.push(goal);
      }
      return json(route, 201, result);
    }

    if (goalId && method === "GET" && !action) {
      const goal = state.goals.find((item) => item.id === goalId);
      return goal ? json(route, 200, goal) : json(route, 404, { detail: "Goal not found" });
    }

    if (goalId && action === "assessment" && method === "GET") {
      return json(route, 200, {
        goal_id: goalId,
        expected_achievement_count: 3,
        achievement_count: 3,
        evidence_count: 3,
        demonstrated_impact_count: 3,
        qualifying_achievement_count: 3,
        progress_percentage: 100,
        status: "met",
        description: "Three evidenced achievements have demonstrated impact.",
      });
    }

    if (goalId && action === "evidence" && method === "GET") {
      return json(route, 200, [
        {
          evidence_id: "evidence-1",
          title: "Reduced deployment incidents",
          description: "Introduced deployment safeguards and reduced incidents.",
          source_type: "personal",
          source_url: null,
          captured_at: now,
          relevance: "high",
          confidence: 0.95,
          reason: "Directly supports the goal.",
        },
      ]);
    }

    if (goalId && action === "impact" && method === "GET") {
      return json(route, 200, [
        {
          id: "impact-1",
          evidence_id: "evidence-1",
          goal_id: goalId,
          impact_type: "reliability",
          impact_summary: "Deployment incidents fell by 30%.",
          impact_score: 0.9,
          confidence: 0.95,
          assessment_version: 1,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    if (goalId && action === "milestones" && method === "GET") return json(route, 200, []);
    if (goalId && action === "history" && method === "GET") {
      return json(route, 200, state.history[goalId] ?? []);
    }
    if (goalId && action?.startsWith("milestones/") && method === "GET") {
      return json(route, 200, []);
    }
    if (goalId && action === "expectations" && method === "GET") return json(route, 200, []);

    if (goalId && method === "PUT" && !action) {
      const goal = state.goals.find((item) => item.id === goalId);
      if (!goal) return json(route, 404, { detail: "Goal not found" });
      Object.assign(goal, request.postDataJSON());
      return json(route, 200, goal);
    }

    if (goalId && method === "POST" && action) {
      const goal = state.goals.find((item) => item.id === goalId);
      if (!goal) return json(route, 404, { detail: "Goal not found" });
      const nextStatus: Record<string, GoalStatus> = {
        approve: "approved",
        activate: "active",
        complete: "completed",
        deactivate: "archived",
      };
      const next = nextStatus[action];
      if (!next) return json(route, 404, { detail: "Unsupported action" });
      const previous = goal.status;
      goal.status = next;
      goal.sub_status =
        next === "approved" ? "not_started" :
        next === "active" ? "on_track" :
        next === "completed" ? "completed" :
        "none";
      if (action === "deactivate") {
        goal.deactivation_reason = request.postDataJSON().reason;
      }
      state.history[goalId] ??= [];
      state.history[goalId].unshift({
        id: `history-${state.history[goalId].length + 1}`,
        goal_id: goalId,
        from_status: previous,
        to_status: next,
        reason: goal.deactivation_reason ?? "",
        changed_by_user_id: "user-1",
        created_at: now,
      });
      return json(route, 200, goal);
    }

    if (goalId && method === "DELETE") {
      const goalIndex = state.goals.findIndex((item) => item.id === goalId);
      if (goalIndex === -1) return json(route, 404, { detail: "Goal not found" });
      state.goals.splice(goalIndex, 1);
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (path.includes("/expectations") && method === "GET") return json(route, 200, []);
    return json(route, 404, { detail: `No Playwright API fixture for ${method} ${path}` });
  });
}

async function signInAndOpen(page: Page, path: string) {
  await page.goto(path);
  await expect(page).not.toHaveURL(/\/login$/);
}

test("manual goal CRUD, all scopes, and the full lifecycle work in the UI", async ({ page }) => {
  const state: MockState = { goals: [], history: {} };
  await installMockApi(page, state);
  await signInAndOpen(page, "/goals/new");

  await page.getByLabel(/Goal title/).fill("Improve deployment reliability");
  await page.locator('input[name="scope"][value="team"]').check();
  await page.getByRole("button", { name: "Create goal" }).click();

  await expect(page.getByRole("heading", { name: "Improve deployment reliability" })).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByText(/TEAM/)).toBeVisible();
  expect(state.goals[0].status).toBe("draft");

  await page.getByRole("link", { name: "Edit goal" }).click();
  await page.getByLabel(/Goal title/).fill("Improve deployment reliability by 30%");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Improve deployment reliability by 30%" })).toBeVisible();

  await page.getByRole("button", { name: "Approve goal" }).click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Activate goal" }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark completed" }).click();
  await page.getByRole("button", { name: "Confirm completion" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Archive goal" }).click();
  await page.getByLabel("Reason for archiving").fill("Goal cycle complete");
  await page.getByRole("button", { name: "Confirm archive" }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  expect(state.history[state.goals[0].id].map((entry) => entry.to_status)).toEqual([
    "archived",
    "completed",
    "active",
    "approved",
  ]);

  for (const scope of ["personal", "team", "organization"] as const) {
    await page.goto("/goals/new");
    await page.getByLabel(/Goal title/).fill(`Scope check ${scope}`);
    await page.locator(`input[name="scope"][value="${scope}"]`).check();
    await page.getByRole("button", { name: "Create goal" }).click();
    await expect(page.getByRole("heading", { name: `Scope check ${scope}` })).toBeVisible();
    await page.getByRole("link", { name: "All goals" }).click();
    await expect(
      page.locator(".goal-list-card")
        .filter({ hasText: `Scope check ${scope}` })
        .locator(".goal-scope-pill"),
    ).toHaveText(scope[0].toUpperCase() + scope.slice(1));
  }
});

test("dashboard and goal detail use the same assessment, and detail links evidence to impact", async ({ page }) => {
  const goal = makeGoal("goal-assessed", "Improve service reliability", "organization", "active");
  const state: MockState = { goals: [goal], history: {} };
  await installMockApi(page, state);
  await signInAndOpen(page, "/dashboard");

  const dashboardGoalCard = page.locator(".progress-card").filter({ has: page.locator(".progress-card-title", { hasText: "Goals" }) });
  await expect(dashboardGoalCard.locator(".progress-card-status")).toHaveText("100%");
  await expect(dashboardGoalCard.locator(".progress-card-meta")).toContainText("1/1 active goals met expectations");

  await page.goto("/goals");
  await expect(page.locator(".goal-list-card").filter({ hasText: goal.title }).locator(".goal-progress-status")).toHaveText("Met expectations");
  await page.goto(`/goals/${goal.id}`);
  await expect(page.getByRole("heading", { name: "Met Expectations" })).toBeVisible();
  await expect(page.getByText("Reduced deployment incidents")).toBeVisible();
  await expect(page.getByText("Deployment incidents fell by 30%.")).toBeVisible();
  await expect(page.locator(".goal-progress")).toHaveCount(1);
});

test("goal document import reports drafts, skipped duplicates, and upload errors", async ({ page }) => {
  const importedGoals = [
    makeGoal("imported-1", "Improve reliability", "team"),
    makeGoal("imported-2", "Grow technical leadership", "organization"),
  ].map((goal) => ({ ...goal, source_document_id: "document-1" }));
  const state: MockState = {
    goals: [],
    history: {},
    importResponse: {
      imported_goals: importedGoals,
      skipped_duplicates: [{ title: "Improve customer outcomes", existing_goal_id: "existing-1" }],
    },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, "/goals/import");

  await page.locator('input[type="file"]').setInputFiles({
    name: "goals.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test fixture"),
  });
  await expect(page.getByRole("heading", { name: "Review the imported goals" })).toBeVisible();
  await expect(page.getByText("1 duplicate goal skipped")).toBeVisible();
  await expect(page.getByText("Improve reliability", { exact: true })).toBeVisible();
  await expect(page.getByText("Grow technical leadership", { exact: true })).toBeVisible();
  await expect(page.getByText("Scope: team", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review / edit" })).toHaveCount(2);
  await page.getByRole("link", { name: "Review / edit" }).first().click();
  await expect(page.getByLabel(/Goal title/)).toHaveValue("Improve reliability");
  await page.getByLabel(/Goal title/).fill("Improve reliability with reviewed edits");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Improve reliability with reviewed edits" })).toBeVisible();
  await page.goto("/goals/import");

  state.importResponse = {
    imported_goals: [],
    skipped_duplicates: [{ title: "Improve reliability", existing_goal_id: "imported-1" }],
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: "duplicate-goals.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from("duplicate fixture"),
  });
  await expect(page.getByText("No new goals were added from this document.")).toBeVisible();
  await expect(page.getByText("1 duplicate goal skipped")).toBeVisible();

  state.importResponse = { imported_goals: [], skipped_duplicates: [] };
  await page.locator('input[type="file"]').setInputFiles({
    name: "no-goals.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 empty goals"),
  });
  await expect(page.getByText("No goals were identified in this document.")).toBeVisible();

  const errorState: MockState = { goals: [], history: {}, uploadError: true };
  await page.unrouteAll();
  await installMockApi(page, errorState);
  await page.reload();
  await page.locator('input[type="file"]').setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("The document could not be processed.");
});
