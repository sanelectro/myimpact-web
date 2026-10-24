import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webRoot, "..");
const aiRoot = resolve(repositoryRoot, "myimpact-ai");
const python = process.env.MYIMPACT_E2E_PYTHON ?? "python";

test.skip(
  process.env.MYIMPACT_E2E_REAL_STACK !== "1",
  "Run with npm run test:e2e:m64 to start the local services.",
);

test("a user can upload, correct, and approve a goal extracted from a Workday document", async ({
  page,
}) => {
  test.setTimeout(240_000);

  const testEmail = `playwright-m64-${randomUUID()}@example.com`;
  const testPassword = `MyImpact-${randomUUID()}!`;
  const docx = execFileSync(
    python,
    [resolve(webRoot, "e2e/fixtures/create_workday_goal_docx.py")],
    { cwd: aiRoot, maxBuffer: 1024 * 1024 },
  );

  try {
    await page.goto("/login");
    await page.getByRole("button", { name: "Create an account", exact: true }).click();
    await page.getByLabel("Name").fill("M6.4 Playwright User");
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Organization").fill("MyImpact E2E");
    await page.getByLabel("Password").fill(testPassword);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });

    await page.goto("/goals/import");
    const uploadResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/v1/documents/import" &&
        response.request().method() === "POST",
    );
    const goalImportResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/v1/goals/import-from-document" &&
        response.request().method() === "POST",
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: "workday-platform-goal.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: docx,
    });

    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status()).toBe(201);
    const document = await uploadResponse.json();
    expect(document.status).toBe("processed");
    expect(document.extracted_content_path).toBeTruthy();

    const goalImportResponse = await goalImportResponsePromise;
    expect(goalImportResponse.status()).toBe(201);
    const importResult = await goalImportResponse.json();
    expect(importResult.skipped_duplicates).toEqual([]);
    expect(importResult.imported_goals.length).toBeGreaterThan(0);

    const importedGoal = importResult.imported_goals[0];
    expect(importedGoal.status).toBe("draft");
    expect(importedGoal.scope).toBe("team");
    expect(importedGoal.source_document_id).toBe(document.id);
    expect(importedGoal.start_date).toBe("2026-01-01");
    expect(importedGoal.end_date).toBe("2026-12-31");

    const authorization = await goalImportResponse.request().headerValue("authorization");
    expect(authorization).toBeTruthy();
    const repeatedImport = await page.request.post(goalImportResponse.request().url(), {
      headers: { authorization: authorization! },
    });
    expect(repeatedImport.status()).toBe(201);
    expect(
      (await repeatedImport.json()).imported_goals.map((goal: { id: string }) => goal.id),
    ).toEqual([importedGoal.id]);

    await expect(
      page.getByRole("heading", { name: "Review the imported goals" }),
    ).toBeVisible({ timeout: 120_000 });
    await expect(page.locator(".goal-import-status").first()).toContainText("DRAFT");
    await expect(page.getByText("Scope: team", { exact: true }).first()).toBeVisible();

    await page.getByRole("link", { name: "Review / edit" }).first().click();
    const titleField = page.getByLabel(/Goal title/);
    await expect(titleField).toHaveValue(importedGoal.title);
    const reviewedTitle = `${importedGoal.title} (reviewed)`;
    await titleField.fill(reviewedTitle);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: reviewedTitle, exact: true })).toBeVisible();
    await expect(page.locator(".goal-detail-lifecycle").first()).toHaveText("Draft");

    await page.getByRole("button", { name: "Approve goal" }).click();
    await expect(page.locator(".goal-detail-lifecycle").first()).toHaveText("Approved");
    await page.getByRole("button", { name: "Activate goal" }).click();
    await expect(page.locator(".goal-detail-lifecycle").first()).toHaveText("Active");
  } finally {
    execFileSync(
      python,
      [resolve(aiRoot, "scripts/cleanup_playwright_user.py"), testEmail],
      { cwd: aiRoot, stdio: "pipe" },
    );
  }
});
