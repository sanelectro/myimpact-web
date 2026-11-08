import { expect, test, type Page, type Route } from "@playwright/test";
import type {
  GoalEvidenceEligibility,
  GoalValidationRun,
} from "../src/types/api";
import {
  installMockApi,
  makeGoal,
  now,
  signInAndOpen,
  type MockState,
} from "./goal-e2e-helpers";

const goalId = "goal-validation";

function makeValidationRun(
  id: string,
  status: GoalValidationRun["status"],
  version: number,
  createdAt: string,
): GoalValidationRun {
  return {
    id,
    goal_id: goalId,
    goal_version_id: `version-${version}`,
    goal_version: version,
    status,
    findings: status === "READY" ? [] : [{
      dimension: "measurement",
      finding_code: "incomplete_measurement_context",
      severity: "WARNING",
      validation_status: status,
      explanation: "The target does not identify how progress will be measured.",
      missing_info: ["measurement"],
      clarification_questions: ["Which measure will you track?"],
      suggested_improvement: "Add a measurable signal.",
      human_intervention_required: false,
    }],
    rule_set_version: "rules-v1",
    prompt_version: "prompt-v1",
    model_provider: "test",
    model_version: "test-v1",
    actor_user_id: "user-1",
    created_at: createdAt,
  };
}

function makeEligibility(eligible: boolean, reason: string): GoalEvidenceEligibility {
  return {
    eligible,
    reason,
    goal_status: "active",
    latest_version: 2,
    latest_version_origin: "USER",
    legacy_compatibility: false,
    ready_validation_exists: eligible,
    approved_for_latest_version: eligible,
  };
}

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installValidationRoutes(
  page: Page,
  history: GoalValidationRun[],
  eligibility: GoalEvidenceEligibility,
) {
  const validationRequests: string[] = [];

  await page.route(`**/api/v1/goals/${goalId}/validation-history**`, async (route) => {
    await json(route, 200, history);
  });
  await page.route(`**/api/v1/goals/${goalId}/evidence-eligibility**`, async (route) => {
    await json(route, 200, eligibility);
  });
  await page.route(`**/api/v1/goals/${goalId}/validate**`, async (route) => {
    validationRequests.push(route.request().method());
    const refreshed = makeValidationRun(
      "validation-run-2",
      "NEEDS_REFINEMENT",
      2,
      "2026-11-08T09:00:00Z",
    );
    history.unshift(refreshed);
    await json(route, 200, refreshed);
  });

  return validationRequests;
}

function validationGoalState(): MockState {
  const goal = makeGoal(goalId, "Improve release reliability", "personal", "active");
  return {
    goals: [goal],
    history: {},
    evidenceByGoal: { [goalId]: [] },
  };
}

test("employees can review validation findings and history, revalidate, and see why evidence is unavailable", async ({ page }) => {
  const state = validationGoalState();
  await installMockApi(page, state);
  const history = [
    makeValidationRun("validation-run-1", "NEEDS_REFINEMENT", 2, now),
  ];
  const validationRequests = await installValidationRoutes(
    page,
    history,
    makeEligibility(
      false,
      "Evidence submission requires a READY validation for the latest goal version.",
    ),
  );

  await signInAndOpen(page, `/goals/${goalId}`);

  const validationPanel = page.locator("#goal-validation");
  await expect(validationPanel.getByText("Needs Refinement", { exact: true })).toBeVisible();
  await expect(validationPanel.getByText("The target does not identify how progress will be measured.")).toBeVisible();
  await expect(validationPanel.getByText("Which measure will you track?")).toBeVisible();
  await expect(validationPanel.getByText("Add a measurable signal.")).toBeVisible();

  await validationPanel.getByText("Validation history (1)").click();
  await expect(validationPanel.locator(".goal-history-list li")).toHaveCount(1);
  await validationPanel.getByRole("button", { name: "Revalidate goal" }).click();
  await expect.poll(() => validationRequests.length).toBe(1);
  await expect(validationPanel.getByText("Validation history (2)")).toBeVisible();
  await expect(validationPanel.locator(".goal-history-list li")).toHaveCount(2);

  const evidenceSection = page.locator(".goal-detail-card").filter({ hasText: "0 pieces of evidence" });
  await expect(evidenceSection.getByText(
    "Evidence submission requires a READY validation for the latest goal version.",
  )).toBeVisible();
  await expect(evidenceSection.getByRole("link", { name: "Review validation findings" })).toBeVisible();
  await expect(evidenceSection.getByRole("button", { name: "Add evidence" })).toHaveCount(0);
});

test("an active goal with READY validation and latest-version approval allows evidence submission", async ({ page }) => {
  const state = validationGoalState();
  await installMockApi(page, state);
  const history = [
    makeValidationRun("validation-run-ready", "READY", 2, now),
  ];
  await installValidationRoutes(
    page,
    history,
    makeEligibility(
      true,
      "Active goal version 2 has a persisted READY validation and approval; evidence can be submitted.",
    ),
  );

  await signInAndOpen(page, `/goals/${goalId}`);

  const evidenceSection = page.locator(".goal-detail-card").filter({ hasText: "0 pieces of evidence" });
  await expect(evidenceSection.getByRole("button", { name: "Add evidence" })).toBeVisible();
  await evidenceSection.getByRole("button", { name: "Add evidence" }).click();
  await page.getByRole("tab", { name: "Add manually" }).click();
  await page.getByLabel("Evidence title").fill("Automated release checks");
  await page.getByLabel("What did you do, and what changed?").fill(
    "Added verification checks that reduced deployment incidents.",
  );
  await page.getByLabel("Link to supporting proof").fill("https://example.test/release-checks");
  await page.getByRole("button", { name: "Save evidence" }).click();

  await expect(
    page.locator(".achievement-card").filter({ hasText: "Automated release checks" }),
  ).toBeVisible();
  expect(state.evidenceCreateRequests).toHaveLength(1);
  expect(state.evidenceCreateRequests?.[0]).toMatchObject({
    title: "Automated release checks",
    description: "Added verification checks that reduced deployment incidents.",
  });
});
