import { expect, test } from "@playwright/test";
import {
  installMockApi,
  makeGoal,
  now,
  signInAndOpen,
  type MockState,
} from "./goal-e2e-helpers";

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

  await expect(page.locator(".goal-category-section")).toHaveCount(3);
  for (const category of ["Personal", "Team", "Organization"]) {
    await expect(page.getByRole("heading", { name: `${category} goals` })).toBeVisible();
  }
});
