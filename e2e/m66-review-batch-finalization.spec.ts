import { expect, test, type Page, type Route } from "@playwright/test";
import type { HumanReviewSubmission } from "../src/types/api";

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installReviewApi(page: Page, initialSaved = 50, failSave = false) {
  const batch = {
    id: "review-batch",
    dataset_id: "review-dataset",
    dataset_version: "review-v3",
    status: "IN_REVIEW",
    expected_case_count: 52,
    review_mode: "SINGLE_REVIEWER",
    started_at: "2026-11-08T00:00:00Z",
    completed_at: null,
  };
  const caseIds = Array.from({ length: 52 }, (_, index) => `case-${index + 1}`);
  const reviews = new Map<string, HumanReviewSubmission>();
  const saveRequests: Array<Record<string, unknown>> = [];
  const finalRequests: Array<{ preview_token: string }> = [];
  let version = 0;
  function makeReview(caseId: string): HumanReviewSubmission {
    return {
      id: `review-${caseId}`,
      case_id: caseId,
      reviewer_user_id: "reviewer-one",
      label: "MET",
      rationale: `Saved rationale for ${caseId}.`,
      submitted_at: "2026-11-08T00:00:00Z",
      updated_at: "2026-11-08T00:00:00Z",
      is_final: false,
      review_stage: "BLIND",
      ai_attempt_id: null,
      reference_proposal_id: null,
      confidence: null,
      context_notes: null,
      evidence_findings: null,
    };
  }
  for (const caseId of caseIds.slice(0, initialSaved)) reviews.set(caseId, makeReview(caseId));
  function context(caseId: string) {
    return {
      case_id: caseId,
      category: "outcome_classification",
      scenario: `Evidence assessment for ${caseId}.`,
      goal: { title: "Improve release safety", description: "Reduce deployment risk." },
      criterion: { definition: { description: "Validate canary releases", completion_conditions: "Validation is verified." } },
      evidence: [],
      review_label_options: ["MET", "IN_PROGRESS"],
    };
  }
  await page.route("**/auth/refresh", async (route) => json(route, 200, {
    access_token: "test-reviewer-token",
    expires_in: 3600,
    user: {
      id: "reviewer-one",
      name: "Reviewer One",
      email: "reviewer@example.test",
      role: "Evaluation Reviewer",
      is_reviewer: true,
    },
  }));
  await page.route("**/api/v1/human-review/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const base = "/api/v1/human-review/batches";
    if (path === base) return json(route, 200, [batch]);
    if (path === `${base}/${batch.id}/queue`) {
      return json(route, 200, caseIds.map((caseId) => ({
        case_id: caseId,
        category: "outcome_classification",
        status: reviews.get(caseId)?.is_final ? "REVIEWED" : "PENDING_REVIEW",
        submitted_by_current_user: reviews.get(caseId)?.is_final === true,
        has_draft: reviews.has(caseId) && !reviews.get(caseId)!.is_final,
        assigned_at: batch.started_at,
        last_reviewed_at: reviews.get(caseId)?.updated_at ?? null,
      })));
    }
    if (path === `${base}/${batch.id}/reviews/preview`) {
      const isFinal = reviews.size === 52 && Array.from(reviews.values()).every((review) => review.is_final);
      return json(route, 200, {
        batch,
        total_cases: 52,
        saved_cases: reviews.size,
        can_finalize: reviews.size === 52 && !isFinal,
        is_final: isFinal,
        preview_token: String(version).padStart(64, "0"),
        reviews: caseIds.flatMap((caseId) => reviews.has(caseId) ? [{ case: context(caseId), review: reviews.get(caseId) }] : []),
      });
    }
    if (path === `${base}/${batch.id}/reviews/final`) {
      const body = request.postDataJSON() as { preview_token: string };
      finalRequests.push(body);
      if (body.preview_token !== String(version).padStart(64, "0")) {
        return json(route, 409, { error: { message: "Your reviews changed after this preview. Reload the preview before final submission." } });
      }
      for (const review of reviews.values()) review.is_final = true;
      batch.status = "HUMAN_REVIEWED";
      return json(route, 200, { is_final: true, finalized_cases: 52 });
    }
    const match = path.match(/\/cases\/(case-\d+)(\/reviews)?$/);
    if (match) {
      const caseId = match[1];
      if (match[2] && request.method() === "POST") {
        const body = request.postDataJSON() as { label: string; rationale: string };
        saveRequests.push(body);
        if (failSave) return json(route, 409, { error: { message: "Review save failed." } });
        const review = { ...(reviews.get(caseId) ?? makeReview(caseId)), ...body, is_final: false };
        reviews.set(caseId, review);
        version++;
        return json(route, 201, review);
      }
      return json(route, 200, {
        case: context(caseId),
        status: reviews.get(caseId)?.is_final ? "REVIEWED" : "PENDING_REVIEW",
        own_review: reviews.get(caseId) ?? null,
        reviews: [],
        reference_proposal: null,
        post_ai_review: null,
        post_ai_draft: null,
        ai_assessment: null,
      });
    }
    return json(route, 404, { error: { message: `Unexpected test API path: ${path}` } });
  });
  return {
    reviews, saveRequests, finalRequests,
    changeReview() {
      reviews.get("case-1")!.rationale = "Updated in another tab.";
      version++;
    },
  };
}

test("save all cases, preview all 52, edit from preview, then finalize together", async ({ page }) => {
  const state = await installReviewApi(page);
  await page.goto("/evaluate");
  await expect(page.getByRole("link", { name: "Submit final review", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Review next pending case" }).click();
  await expect(page).toHaveURL(/\/evaluate\/cases\/case-51$/);
  await expect(page.getByRole("button", { name: "Preview final review", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Your label", exact: true }).selectOption("MET");
  await page.getByRole("textbox", { name: "Your rationale", exact: true }).fill("First submitted case rationale.");
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(page).toHaveURL(/\/evaluate\/cases\/case-52$/);
  expect(state.finalRequests).toHaveLength(0);
  expect(state.reviews.get("case-51")!.is_final).toBe(false);
  await page.getByRole("combobox", { name: "Your label", exact: true }).selectOption("IN_PROGRESS");
  await page.getByRole("textbox", { name: "Your rationale", exact: true }).fill("Last submitted case rationale.");
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(page).toHaveURL(/\/evaluate$/);
  await page.getByRole("link", { name: "Submit final review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Final review preview", exact: true })).toBeVisible();
  await expect(page.locator('section[aria-label^="Review case-"]')).toHaveCount(52);
  expect(state.finalRequests).toHaveLength(0);
  await page.getByRole("region", { name: "Review case-51", exact: true }).getByRole("link", { name: "Edit review", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Your rationale", exact: true })).toHaveValue("First submitted case rationale.");
  await page.getByRole("combobox", { name: "Your label", exact: true }).selectOption("IN_PROGRESS");
  await page.getByRole("textbox", { name: "Your rationale", exact: true }).fill("Revised after reading the full preview.");
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(page).toHaveURL(/\/evaluate\/final-review$/);
  await expect(page.getByRole("region", { name: "Review case-51", exact: true })).toContainText("Revised after reading the full preview.");
  await page.getByRole("button", { name: "Confirm and submit final review" }).click();
  await expect(page).toHaveURL(/\/evaluate$/);
  await expect(page.getByRole("status")).toContainText("Your final review has been submitted");
  expect(state.finalRequests).toHaveLength(1);
  expect(Array.from(state.reviews.values()).every((review) => review.is_final)).toBe(true);
  await page.goto("/evaluate/cases/case-51");
  await expect(page.getByRole("status")).toContainText("cannot be changed");
  await expect(page.getByRole("button", { name: "Submit review", exact: true })).toHaveCount(0);
});

test("incomplete batches cannot be finalized even by opening the preview URL", async ({ page }) => {
  await installReviewApi(page, 51);
  await page.goto("/evaluate/final-review");
  await expect(page.getByRole("status")).toContainText("every assigned case");
  await expect(page.getByRole("button", { name: "Confirm and submit final review" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit review", exact: true })).toHaveCount(51);
});

test("case save errors retain editable inputs and do not advance", async ({ page }) => {
  const state = await installReviewApi(page, 50, true);
  await page.goto("/evaluate/cases/case-51");
  await page.getByRole("combobox", { name: "Your label", exact: true }).selectOption("MET");
  await page.getByRole("textbox", { name: "Your rationale", exact: true }).fill("Keep my review after a failed save.");
  await page.getByRole("button", { name: "Submit review", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Review save failed.");
  await expect(page.getByRole("textbox", { name: "Your rationale", exact: true })).toHaveValue("Keep my review after a failed save.");
  await expect(page).toHaveURL(/\/evaluate\/cases\/case-51$/);
  expect(state.reviews.size).toBe(50);
  expect(state.finalRequests).toHaveLength(0);
});

test("changed previews require reload before final confirmation", async ({ page }) => {
  const state = await installReviewApi(page, 52);
  await page.goto("/evaluate/final-review");
  await expect(page.getByRole("heading", { name: "Final review preview", exact: true })).toBeVisible();
  state.changeReview();
  await page.getByRole("button", { name: "Confirm and submit final review" }).click();
  await expect(page.getByRole("alert")).toContainText("changed after this preview");
  await expect(page.getByRole("button", { name: "Confirm and submit final review" })).toBeDisabled();
  expect(Array.from(state.reviews.values()).every((review) => !review.is_final)).toBe(true);
  await page.getByRole("button", { name: "Reload preview" }).click();
  await expect(page.getByRole("region", { name: "Review case-1", exact: true })).toContainText("Updated in another tab.");
  await page.getByRole("button", { name: "Confirm and submit final review" }).click();
  await expect(page).toHaveURL(/\/evaluate$/);
  expect(state.finalRequests).toHaveLength(2);
});
