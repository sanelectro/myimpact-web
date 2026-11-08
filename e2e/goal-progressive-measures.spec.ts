import { expect, test } from "@playwright/test";
import { installMockApi, makeGoal, signInAndOpen, type MockState } from "./goal-e2e-helpers";

test("saves a deferral and keeps child completion separate from outcome and impact", async ({ page }) => {
  const state: MockState = { goals: [makeGoal("goal-1", "Parent goal")], history: {} };
  await installMockApi(page, state);
  let saved: Record<string, unknown> | null = null;
  await page.route(/\/api\/v1\/goals\/goal-1\?/, async (route) => {
    if (route.request().method() === "PUT") {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { ...state.goals[0], ...saved } });
    }
    return route.fulfill({ json: { ...state.goals[0], structured_fields: null } });
  });
  await page.route("**/api/v1/goals/goal-1/requirements**", async (route) => route.fulfill({ json: {
    goal_version: 2, evaluated_on: "2026-11-08",
    requirements: [{ requirement: "baseline", classification: "DEFERRED_ALLOWED", state: "OVERDUE" }],
    deferred_requirements: [{ requirement: "baseline", reason: "Awaiting data", due_date: "2026-11-01",
      resolution_stage: null, state: "OPEN", resolution_reason: null, related_child_goal_id: null }],
  } }));
  await page.route("**/api/v1/goals/goal-1/measures**", async (route) => route.fulfill({ json: {
    goal_id: "goal-1", child_execution: { total: 2, by_status: { completed: 2 } },
    own_criterion_assessment: { criteria_count: 0, assessed_criteria_count: 0, evidence_coverage_percentage: null },
    outcome_achievement: null, demonstrated_impact: null,
  } }));
  await signInAndOpen(page, "/goals/goal-1/edit");
  await page.getByLabel("Baseline deferral state").selectOption("OPEN");
  await page.getByLabel("Baseline deferral reason").fill("Awaiting data");
  await page.getByLabel("Baseline resolution stage").fill("Planning");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "Parent goal" })).toBeVisible();
  expect(saved).toMatchObject({ structured_fields: { deferred_requirements: [{
    requirement: "baseline", reason: "Awaiting data", resolution_stage: "Planning", state: "OPEN",
  }] }, expected_deferred_requirements: [] });
  await expect(page.getByText("Baseline: Overdue", { exact: false })).toBeVisible();
  await expect(page.getByText("completed: 2")).toBeVisible();
  await expect(page.getByText(/Not determined\. Existing criteria/)).toBeVisible();
  await expect(page.getByText(/Not determined by child completion/)).toBeVisible();
});
