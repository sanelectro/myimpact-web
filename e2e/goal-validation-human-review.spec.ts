import { expect, test } from "@playwright/test";

test("reviewers can select the Goal Validation batch without losing the evidence batch", async ({ page }) => {
  const goalBatch = {
    id: "goal-review-batch",
    dataset_id: "goal-validation",
    dataset_version: "goal-validation-v1",
    status: "DRAFT_UNREVIEWED",
    expected_case_count: 30,
    review_mode: "DUAL_ADJUDICATED",
    started_at: "2026-11-08T00:00:00Z",
    completed_at: null,
  };
  const evidenceBatch = { ...goalBatch, id: "evidence-batch", dataset_id: "m66", dataset_version: "m66-v1", expected_case_count: 1 };
  await page.route("**/auth/refresh", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      access_token: "test-reviewer-token",
      expires_in: 3600,
      user: { id: "reviewer-one", name: "Reviewer One", email: "reviewer@example.test", role: "Evaluation Reviewer", is_reviewer: true },
    }),
  }));
  await page.route("**/api/v1/human-review/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const base = "/api/v1/human-review/batches";
    let body: unknown;
    if (path === base) {
      body = [evidenceBatch, goalBatch];
    } else if (path.endsWith("/queue")) {
      const isGoalBatch = path.includes(goalBatch.id);
      body = Array.from({ length: isGoalBatch ? 30 : 1 }, (_, index) => ({
        case_id: isGoalBatch ? `gv-${String(index + 1).padStart(2, "0")}` : "evidence-case",
        category: isGoalBatch ? "clarity_structure" : "evidence_relevance",
        status: "PENDING_REVIEW",
        submitted_by_current_user: false,
        has_draft: false,
        assigned_at: goalBatch.started_at,
        last_reviewed_at: null,
      }));
    } else if (path.endsWith("/cases/gv-01")) {
      body = {
        case: {
          case_id: "gv-01",
          category: "clarity_structure",
          review_kind: "GOAL_VALIDATION",
          scenario: "Assess goal readiness, not evidence achievement.",
          goal: { title: "Improve platform quality", goal_type: null, accountability: null, success_criteria: [], target: null, scope: "Team" },
          goal_validation_context: { role: "Not specified", role_expectations: null },
          review_label_options: ["READY", "NEEDS_REFINEMENT", "NEEDS_DISCUSSION", "INVALID"],
        },
        status: "PENDING_REVIEW",
        own_review: null,
        reviews: [],
        reference_proposal: null,
        ai_assessment: null,
        post_ai_review: null,
        post_ai_draft: null,
      };
    } else {
      throw new Error(`Unexpected human-review route: ${path}`);
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });

  await page.goto("/evaluate");
  const selector = page.getByRole("combobox", { name: "Review batch", exact: true });
  await expect(selector).toHaveValue(evidenceBatch.id);
  await selector.selectOption(goalBatch.id);
  await expect(page.getByRole("heading", { name: "goal-validation-v1", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Review next pending case" }).click();
  await expect(page).toHaveURL(/\/evaluate\/cases\/gv-01$/);
  await expect(page.getByText("Improve platform quality", { exact: true })).toBeVisible();
  await expect(page.getByText("Team", { exact: true })).toBeVisible();
  await expect(page.getByText("Independent blind review: provisional reference labels are not shown.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show example for goal type" })).toHaveCount(0);
  const attributes = page.getByText("View all goal attributes");
  await attributes.click();
  const example = page.getByRole("button", { name: "Show example for goal type" });
  const tooltip = page.getByRole("tooltip", { name: "Example: Delivery", includeHidden: true });
  await expect(tooltip).toBeHidden();
  await example.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await example.click();
  await expect(tooltip).toBeVisible();
  await page.mouse.move(0, 0);
  const grid = page.locator(".goal-review-context").first();
  await page.setViewportSize({ width: 1400, height: 900 });
  await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(3);
  await page.setViewportSize({ width: 700, height: 900 });
  await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);
  await page.setViewportSize({ width: 400, height: 900 });
  await expect.poll(() => grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(1);
  const labels = page.getByRole("combobox", { name: "Your label", exact: true });
  await expect(labels.locator("option")).toHaveText([
    "Select a label", "Ready", "Needs Refinement", "Needs Discussion", "Invalid",
  ]);
  await expect(page.getByText("No evidence was provided. Consider whether that is enough to support the criterion.")).toHaveCount(0);
  await page.getByRole("link", { name: "Review dashboard", exact: true }).click();
  await expect(selector).toHaveValue(goalBatch.id);
  await selector.selectOption(evidenceBatch.id);
  await expect(page.getByRole("heading", { name: "m66-v1", exact: true })).toBeVisible();
});

test("Goal Validation proposals are shown before review and submitted as proposal-assisted", async ({ page }) => {
  let proposalAvailable = true;
  const batch = {
    id: "proposal-batch", dataset_id: "goal-validation-v1", dataset_version: "1.0.0",
    status: "IN_REVIEW", expected_case_count: 1, review_mode: "DUAL_ADJUDICATED",
    started_at: "2026-11-08T00:00:00Z", completed_at: null,
  };
  await page.route("**/auth/refresh", (route) => route.fulfill({
    json: {
      access_token: "test-reviewer-token", expires_in: 3600,
      user: { id: "reviewer-one", name: "Reviewer One", email: "reviewer@example.test", role: "Evaluation Reviewer", is_reviewer: true },
    },
  }));
  await page.route("**/api/v1/human-review/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown;
    if (path === "/api/v1/human-review/batches") {
      body = [batch];
    } else if (path.endsWith("/queue")) {
      body = [{
        case_id: "gv-01", category: "clarity_structure", status: "PENDING_REVIEW",
        submitted_by_current_user: false, has_draft: false, assigned_at: batch.started_at, last_reviewed_at: null,
      }];
    } else if (path.endsWith("/cases/gv-01/reviews")) {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toMatchObject({
      label: "READY", rationale: "My decision.", review_stage: "PROPOSAL_ASSISTED",
      reference_proposal_id: "proposal-1",
      });
      body = { id: "review-1", label: "READY", rationale: "My decision.", review_stage: "PROPOSAL_ASSISTED", is_final: false };
    } else if (path.endsWith("/cases/gv-01")) {
      body = {
      case: { case_id: "gv-01", review_kind: "GOAL_VALIDATION", reference_visibility: "PROPOSAL_ASSISTED", review_label_options: ["READY", "NEEDS_REFINEMENT"], goal: { title: "Test goal" } },
      status: "PENDING_REVIEW",
      own_review: null,
        reviews: [],
        reference_proposal: proposalAvailable ? {
          id: "proposal-1", proposed_label: "NEEDS_REFINEMENT", rationale: "AI rationale.",
          source_document: "source.json", status: "PROPOSED", requires_owner_attention: false,
        } : null,
        ai_assessment: null, post_ai_review: null, post_ai_draft: null,
      };
    } else {
      throw new Error(`Unexpected human-review route: ${path}`);
    }
    await route.fulfill({ json: body });
  });
  await page.goto("/evaluate/cases/gv-01");
  await expect(page.getByRole("heading", { name: "Proposal-assisted case review" })).toBeVisible();
  await expect(page.getByText("AI rationale.")).toBeVisible();
  await expect(page.getByText("AI proposals are shown for proposal-assisted review, not blind review.")).toBeVisible();
  await expect(page.getByText("Suggested label:", { exact: false })).toContainText("Needs Refinement");
  await page.getByLabel("Your label").selectOption("READY");
  await page.getByLabel("Your rationale").fill("My decision.");
  const submitted = page.waitForResponse((response) =>
    response.url().endsWith("/cases/gv-01/reviews") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Submit review" }).click();
  expect((await submitted).ok()).toBeTruthy();
  await page.waitForURL(/\/evaluate$/);
  proposalAvailable = false;
  await page.goto("/evaluate/cases/gv-01");
  await expect(page.getByRole("alert")).toHaveText("The AI proposal for this case is unavailable. Contact the review administrator before submitting.");
  await page.getByLabel("Your label").selectOption("READY");
  await page.getByLabel("Your rationale").fill("My decision.");
  await expect(page.getByRole("button", { name: "Submit review" })).toBeDisabled();
});
