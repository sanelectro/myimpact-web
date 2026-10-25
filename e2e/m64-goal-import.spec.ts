import { expect, test } from "@playwright/test";
import {
  installMockApi,
  makeGoal,
  now,
  signInAndOpen,
  type MockState,
} from "./goal-e2e-helpers";

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
