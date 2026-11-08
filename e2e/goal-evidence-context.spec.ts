import { expect, test } from "@playwright/test";
import { installMockApi, makeGoal, signInAndOpen, type MockState } from "./goal-e2e-helpers";

test("shows inherited provenance and links an existing contribution", async ({ page }) => {
  const state: MockState = { goals: [makeGoal("parent", "Parent goal", "personal", "active"), makeGoal("child", "Child goal")], history: {} };
  await installMockApi(page, state);
  let linkRequest: Record<string, unknown> | null = null;
  await page.route("**/api/v1/goals/parent/evidence-eligibility**", async (route) => route.fulfill({ json: {
    eligible: true, reason: "Eligible", goal_status: "active", latest_version: 1,
    latest_version_origin: "USER", legacy_compatibility: false, ready_validation_exists: true,
    approved_for_latest_version: true,
  } }));
  await page.route("**/api/v1/goals/parent/evidence-context**", async (route) => route.fulfill({ json: {
    items: [{ evidence_id: "ev-1", title: "Evidence one", description: null, source_type: "personal",
      source_url: null, captured_at: "2026-11-08T00:00:00Z", source_updated_at: null,
      origins: [{ origin: "INHERITED", source_goal_id: "child", goal_path: ["parent", "child"],
        mapping_id: "mapping-1", mapping_kind: "PRIMARY", contribution_description: null,
        relevance: "high", confidence: 1, approval_status: "approved" }] }],
    has_more: false, next_offset: null, hierarchy_truncated: true,
  } }));
  await page.route("**/api/v1/goals/child/evidence?**", async (route) => route.fulfill({ json: [
    { evidence_id: "ev-1", title: "Evidence one", milestone_id: null, description: null, source_type: "personal",
      source_url: null, captured_at: "2026-11-08T00:00:00Z", relevance: "high", confidence: 1, reason: null },
  ] }));
  await page.route("**/api/v1/goals/parent/evidence-links**", async (route) => {
    linkRequest = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { mapping_id: "new", approval_status: "pending" } });
  });
  await signInAndOpen(page, "/goals/parent");
  const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: "Evidence context" }) });
  await panel.getByRole("button", { name: "Show evidence context" }).click();
  await expect(panel.getByText(/Inherited · primary/)).toBeVisible();
  await expect(panel.getByText(/may be incomplete/)).toBeVisible();
  await panel.getByLabel("Source goal").selectOption("child");
  await panel.getByRole("combobox", { name: "Evidence", exact: true }).selectOption("ev-1");
  await panel.getByLabel("Relationship type").selectOption("CONTRIBUTION");
  await panel.getByLabel(/Contribution description/).fill("Supports the outcome");
  await panel.getByRole("button", { name: "Link evidence" }).click();
  await expect(panel.getByText("Evidence linked. Approval is pending.")).toBeVisible();
  expect(linkRequest).toEqual({ evidence_id: "ev-1", mapping_kind: "CONTRIBUTION",
    contribution_description: "Supports the outcome", relevance: "medium" });
});
