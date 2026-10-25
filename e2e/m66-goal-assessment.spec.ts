import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  installMockApi,
  makeGoal,
  now,
  signInAndOpen,
  type MockState,
} from "./goal-e2e-helpers";

type EvaluationCase = {
  case_id: string;
  criterion: {
    definition: {
      description: string;
      completion_conditions: string;
    };
  };
  evidence: Array<{
    mapping_id: string;
    title: string;
    content: string;
  }>;
  labels: {
    expected_result: "MET" | "IN_PROGRESS" | "NEEDS_REVIEW";
    expected_rationale: string;
    expected_contradictory_mapping_ids: string[];
  };
};

const evaluationDataset = JSON.parse(
  readFileSync(
    new URL("../../myimpact-ai/evaluation/m66_criterion_assessment.json", import.meta.url),
    "utf8",
  ),
) as { cases: EvaluationCase[] };

function makeJourneyAssessment(
  lifecycle: "CURRENT" | "STALE",
  runId: string,
  assessmentId: string,
  evidenceId: string,
  mappingId: string,
  title: string,
  excerpt: string,
) {
  return {
    goal_id: "goal-1",
    run_id: runId,
    run_status: "COMPLETED",
    run_error_message: null,
    criteria_count: 1,
    assessed_criteria_count: lifecycle === "CURRENT" ? 1 : 0,
    criteria_met_count: lifecycle === "CURRENT" ? 1 : 0,
    criteria_met_percentage: lifecycle === "CURRENT" ? 100 : 0,
    goal_progress_percentage: lifecycle === "CURRENT" ? 100 : null,
    evidence_coverage_percentage: 100,
    average_confidence: 0.9,
    criteria: [{
      criterion_id: "criterion-journey",
      criterion_version: 2,
      result: "MET",
      lifecycle_state: lifecycle,
      progress_percentage: 100,
      assessment: {
        id: assessmentId,
        run_id: runId,
        criterion_id: "criterion-journey",
        criterion_version_id: "criterion-version-2",
        criterion_version: 2,
        result: "MET",
        lifecycle_state: lifecycle,
        progress_percentage: 100,
        rationale: "The cited evidence supports the approved completion conditions.",
        confidence: 0.9,
        input_fingerprint: `${runId}-fingerprint`,
        model_version: "test-model",
        prompt_version: "m66-criterion-assessment-v1",
        created_at: now,
        evidence: [{
          id: `${assessmentId}-evidence`,
          evidence_mapping_id: mappingId,
          evidence_id: evidenceId,
          title,
          source_url: `https://example.com/${evidenceId}`,
          captured_at: now,
          source_updated_at: now,
          review_state: "pending",
          source_validity: "STORED_SNAPSHOT",
          relationship_type: "SUPPORTING",
          citation_excerpt: excerpt,
        }],
        events: [],
      },
    }],
    updated_at: now,
  };
}

test("dashboard and goal detail use the same assessment, and detail links evidence to impact", async ({ page }) => {
  const goal = makeGoal("goal-assessed", "Improve service reliability", "organization", "active");
  const criterion = {
    id: "criterion-1",
    goal_id: goal.id,
    current_version: 1,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-1",
      criterion_id: "criterion-1",
      version: 1,
      definition: {
        criterion_type: "BINARY",
        description: "Reduce deployment incidents",
        completion_conditions: "Deployment incidents are reduced.",
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      },
      approval_status: "APPROVED",
      created_by_user_id: "user-1",
      prompt_version: null,
      model_version: null,
      created_at: now,
      approved_by_user_id: "user-1",
      approved_at: now,
    }],
  };
  const assessment = {
    criteria_count: 1,
    assessed_criteria_count: 1,
    criteria_met_count: 1,
    criteria_met_percentage: 100,
    goal_progress_percentage: 100,
    evidence_coverage_percentage: 100,
    average_confidence: 0.95,
    criteria: [{
      criterion_id: "criterion-1",
      criterion_version: 1,
      result: "MET",
      lifecycle_state: "CURRENT",
      progress_percentage: 100,
      assessment: {
        id: "assessment-1",
        run_id: "run-1",
        criterion_id: "criterion-1",
        criterion_version_id: "criterion-version-1",
        criterion_version: 1,
        result: "MET",
        lifecycle_state: "CURRENT",
        progress_percentage: 100,
        rationale: "The cited evidence supports the completion condition.",
        confidence: 0.95,
        input_fingerprint: "fingerprint",
        model_version: "test-model",
        prompt_version: "m66-criterion-assessment-v1",
        created_at: now,
        evidence: [{
          id: "assessment-evidence-1",
          evidence_mapping_id: "mapping-1",
          evidence_id: "evidence-1",
          title: "Reduced deployment incidents",
          source_url: null,
          captured_at: now,
          source_updated_at: null,
          review_state: "pending",
          source_validity: "STORED_SNAPSHOT",
          relationship_type: "SUPPORTING",
          citation_excerpt: "Introduced deployment safeguards and reduced incidents.",
        }],
        events: [],
      },
    }],
  };
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [criterion] },
    assessments: { [goal.id]: assessment },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, "/dashboard");

  const dashboardGoalCard = page.locator(".progress-card").filter({ has: page.locator(".progress-card-title", { hasText: "Goals" }) });
  await expect(dashboardGoalCard.locator(".progress-card-status")).toHaveText("1/1");
  await expect(dashboardGoalCard.locator(".progress-card-meta")).toContainText("0 goals need review");

  await page.goto("/goals");
  const goalCard = page.locator(".goal-list-card").filter({ hasText: goal.title });
  await expect(goalCard.locator(".goal-progress-status")).toHaveText("Criteria met");
  const progressFill = goalCard.locator(".goal-list-progress-fill");
  await expect(progressFill).toHaveCSS("background-color", "rgb(37, 99, 235)");
  await expect.poll(async () => progressFill.evaluate((fill) => {
    const track = fill.parentElement;
    return track ? fill.getBoundingClientRect().width / track.getBoundingClientRect().width : 0;
  })).toBeGreaterThan(0.99);
  await page.goto(`/goals/${goal.id}`);
  await expect(page.getByRole("heading", { name: "Criteria and evidence assessment" })).toBeVisible();
  await expect(page.getByText("The cited evidence supports the completion condition.")).toBeVisible();
  await expect(page.getByText("Reduced deployment incidents", { exact: true })).toBeVisible();
  await expect(page.getByText("Deployment incidents fell by 30%.")).toBeVisible();
  await expect(page.getByText("YOUR EVIDENCE")).toBeVisible();
  await expect(page.locator(".m66-metrics")).toContainText("1/1");
  await expect(page.locator(".m66-metrics")).toContainText("criteria met");
  await expect(page.getByRole("heading", { name: "AI milestone suggestions" })).toBeVisible();
  await page.locator(".milestone-suggestion-card").getByRole("button", { name: "Add milestone" }).click();
  await expect(page.getByText("AI suggested")).toBeVisible();
  expect(state.milestoneCreateRequests?.[0].source).toBe("ai");

  await page.getByRole("button", { name: "Add milestone" }).first().click();
  await page.getByLabel("Title").fill("Manually chosen reliability review");
  await page.getByRole("button", { name: "Create milestone" }).click();
  await expect(page.getByText("Manually added")).toBeVisible();
  expect(state.milestoneCreateRequests?.[1].source).toBe("manual");

  await page.goto("/impact");
  await expect(page.getByRole("heading", { name: "Where your work is making a difference" })).toBeVisible();
});

test("employee completes criteria-to-evidence assessment and refreshes a stale result", async ({ page }) => {
  const generatedCriterion = {
    id: "criterion-journey",
    goal_id: "goal-1",
    current_version: null,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-1",
      criterion_id: "criterion-journey",
      version: 1,
      definition: {
        criterion_type: "BINARY",
        description: "Reduce deployment failures",
        completion_conditions: "Production canary validation is enabled.",
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: ["Deployment verification changes"],
        assumptions_and_clarifications: [],
      },
      approval_status: "PROPOSED",
      created_by_user_id: "user-1",
      prompt_version: "m66-criteria-v1",
      model_version: "test-model",
      created_at: now,
      approved_by_user_id: null,
      approved_at: null,
    }],
  };
  const firstAssessment = makeJourneyAssessment(
    "CURRENT",
    "run-journey-1",
    "assessment-journey-1",
    "evidence-1",
    "mapping-1",
    "Canary validation pull request",
    "Enabled and verified production canary validation.",
  );
  const staleAssessment = makeJourneyAssessment(
    "STALE",
    "run-journey-1",
    "assessment-journey-1",
    "evidence-1",
    "mapping-1",
    "Canary validation pull request",
    "Enabled and verified production canary validation.",
  );
  const refreshedAssessment = makeJourneyAssessment(
    "CURRENT",
    "run-journey-2",
    "assessment-journey-2",
    "evidence-2",
    "mapping-2",
    "Updated canary rollout evidence",
    "The updated rollout evidence confirms the canary checks are active.",
  );
  const state: MockState = {
    goals: [],
    history: {},
    generatedCriteria: { "goal-1": [generatedCriterion] },
    criteria: { "goal-1": [] },
    assessments: {},
    reanalysisResponseSequences: {
      "goal-1": [firstAssessment, refreshedAssessment],
    },
    evidenceByGoal: { "goal-1": [] },
    staleAssessmentsAfterEvidenceCreate: { "goal-1": staleAssessment },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, "/goals/new");

  await page.getByLabel(/Goal title/).fill("Improve deployment reliability");
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByRole("heading", { name: "Improve deployment reliability" })).toBeVisible();

  await page.getByRole("button", { name: "Suggest criteria" }).click();
  const criterionCard = page.locator(".m66-criterion");
  await expect(
    criterionCard.getByRole("heading", { name: "Reduce deployment failures" }),
  ).toBeVisible();
  await criterionCard.getByRole("button", { name: "Edit" }).click();
  await page.locator(".m66-editor").getByLabel("Description").fill(
    "Reduce production deployment failures with canary validation",
  );
  await page.locator(".m66-editor").getByLabel("Completion conditions").fill(
    "Canary validation is enabled and verified for production releases.",
  );
  await page.locator(".m66-editor").getByRole("button", { name: "Save proposal" }).click();
  await expect(
    criterionCard.getByRole("heading", {
      name: "Reduce production deployment failures with canary validation",
    }),
  ).toBeVisible();
  await criterionCard.getByRole("button", { name: "Approve" }).click();
  await expect(criterionCard.locator(".m66-badge")).toHaveText("Approved");

  await page.getByRole("button", { name: "Approve goal" }).click();
  await page.getByRole("button", { name: "Activate goal" }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add evidence" }).click();
  await page.getByRole("tab", { name: "Add manually" }).click();
  await page.getByLabel("Evidence title").fill("Canary validation pull request");
  await page.getByLabel("What did you do, and what changed?").fill(
    "Enabled and verified production canary validation.",
  );
  await page.getByLabel("Link to supporting proof").fill("https://example.com/evidence-1");
  await page.getByRole("button", { name: "Save evidence" }).click();
  await expect(
    page.locator(".achievement-title", { hasText: "Canary validation pull request" }),
  ).toBeVisible();
  expect(state.evidenceCreateRequests).toHaveLength(1);

  await page.getByRole("button", { name: "Reanalyze evidence" }).click();
  await expect(page.getByText("Latest run: completed")).toBeVisible();
  await expect(criterionCard.locator(".m66-assessment")).toContainText(/current/i);
  await expect(
    criterionCard.getByRole("link", { name: "Canary validation pull request" }),
  ).toBeVisible();
  await expect(
    criterionCard.getByText("Enabled and verified production canary validation."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add evidence" }).click();
  await page.getByRole("tab", { name: "Add manually" }).click();
  await page.getByLabel("Evidence title").fill("Updated canary rollout evidence");
  await page.getByLabel("What did you do, and what changed?").fill(
    "The updated rollout confirms the canary checks are active.",
  );
  await page.getByLabel("Link to supporting proof").fill("https://example.com/evidence-2");
  await page.getByRole("button", { name: "Save evidence" }).click();
  await expect(criterionCard.locator(".m66-assessment")).toContainText("stale");

  await page.getByRole("button", { name: "Reanalyze evidence" }).click();
  await expect(page.getByText("Latest run: completed")).toBeVisible();
  await expect(criterionCard.locator(".m66-assessment")).toContainText(/current/i);
  await expect(
    criterionCard.getByRole("link", { name: "Updated canary rollout evidence" }),
  ).toBeVisible();
  expect(state.criterionUpdateRequests).toHaveLength(1);
  expect(state.criterionApprovalRequests).toEqual([{
    criterionId: "criterion-journey",
    versionId: "criterion-version-2",
  }]);
  expect(state.reanalysisRequests).toEqual(["goal-1", "goal-1"]);
});

test("employee can confirm, correct, or challenge an assessment without changing its AI result", async ({ page }) => {
  const goal = makeGoal("goal-1", "Improve deployment reliability", "personal", "active");
  const criterion = {
    id: "criterion-journey",
    goal_id: goal.id,
    current_version: 2,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-2",
      criterion_id: "criterion-journey",
      version: 2,
      definition: {
        criterion_type: "BINARY",
        description: "Reduce deployment failures",
        completion_conditions: "Production canary validation is enabled.",
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      },
      approval_status: "APPROVED",
      created_by_user_id: "user-1",
      prompt_version: null,
      model_version: null,
      created_at: now,
      approved_by_user_id: "user-1",
      approved_at: now,
    }],
  };
  const assessment = makeJourneyAssessment(
    "CURRENT",
    "run-feedback",
    "assessment-feedback",
    "evidence-feedback",
    "mapping-feedback",
    "Canary validation pull request",
    "Enabled production canary validation.",
  );
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [criterion] },
    assessments: { [goal.id]: assessment },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  const result = page.locator(".m66-assessment-heading strong");
  await expect(result).toHaveText("Met");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect.poll(() => state.feedbackRequests?.length).toBe(1);
  await page.getByLabel("Correct assessment for Reduce deployment failures").selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Submit correction" }).click();
  await expect.poll(() => state.feedbackRequests?.length).toBe(2);
  await page.getByRole("button", { name: "Challenge" }).click();
  await expect.poll(() => state.feedbackRequests?.length).toBe(3);

  expect(state.feedbackRequests?.map((request) => request.feedbackType)).toEqual([
    "CONFIRMED",
    "CORRECTED",
    "CHALLENGED",
  ]);
  expect(state.feedbackRequests?.[1].correctedResult).toBe("IN_PROGRESS");
  expect(assessment.criteria[0].assessment.result).toBe("MET");
  await expect(result).toHaveText("Met");
});

test("manager can approve, reject, or request more information for pending evidence", async ({ page }) => {
  const makeApproval = (approvalId: string, evidenceTitle: string) => ({
    approval_id: approvalId,
    evidence_id: `evidence-${approvalId}`,
    employee_id: "employee-1",
    employee_name: "Jamie Rivera",
    goal_id: "goal-approval",
    goal_title: "Improve release reliability",
    goal_description: "Reduce failed releases.",
    goal_status: "active",
    goal_start_date: "2026-01-01",
    goal_end_date: null,
    milestone_id: null,
    milestone_title: null,
    milestone_description: null,
    milestone_completion_criteria: null,
    milestone_status: null,
    milestone_due_date: null,
    evidence_title: evidenceTitle,
    evidence_description: "The linked change improves release checks.",
    evidence_source_type: "github",
    evidence_source_url: "https://example.com/pull/1",
    evidence_captured_at: now,
    relevance: "high",
    confidence: 0.9,
    reason: "Directly supports the goal.",
    submitted_at: now,
  });
  const state: MockState = {
    goals: [],
    history: {},
    pendingApprovals: [
      makeApproval("approval-approve", "Canary checks"),
      makeApproval("approval-reject", "Release rollback"),
      makeApproval("approval-info", "Test evidence"),
    ],
  };
  await installMockApi(page, state);
  await signInAndOpen(page, "/pending-requests");

  const submitDecision = async (
    evidenceTitle: string,
    decisionLabel: string,
    comment: string,
  ) => {
    const request = page.locator(".approval-request").filter({ hasText: evidenceTitle });
    await request.locator("summary").click();
    await request.getByLabel(/Comment for Jamie Rivera/).fill(comment);
    await request.getByRole("button", { name: decisionLabel }).click();
    await expect(request).toHaveCount(0);
  };
  await submitDecision("Canary checks", "Approve", "Verified in production.");
  await submitDecision("Release rollback", "Reject", "This is unrelated to the goal.");
  await submitDecision("Test evidence", "Need more information", "Please attach the test run.");

  expect(state.evidenceApprovalDecisionRequests?.map((request) => request.decision)).toEqual([
    "approved",
    "rejected",
    "needs_information",
  ]);
  expect(state.evidenceApprovalDecisionRequests?.map((request) => request.comment)).toEqual([
    "Verified in production.",
    "This is unrelated to the goal.",
    "Please attach the test run.",
  ]);
  await expect(page.getByRole("heading", { name: "All caught up" })).toBeVisible();
});

test("insufficient evidence is shown as needs review without a citation", async ({ page }) => {
  const goal = makeGoal("goal-insufficient", "Improve release safety", "personal", "active");
  const criterion = {
    id: "criterion-insufficient",
    goal_id: goal.id,
    current_version: 1,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-insufficient",
      criterion_id: "criterion-insufficient",
      version: 1,
      definition: {
        criterion_type: "BINARY",
        description: "Reduce production release failures",
        completion_conditions: "Release failures decrease.",
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      },
      approval_status: "APPROVED",
      created_by_user_id: "user-1",
      prompt_version: null,
      model_version: null,
      created_at: now,
      approved_by_user_id: "user-1",
      approved_at: now,
    }],
  };
  const insufficient = makeJourneyAssessment(
    "CURRENT",
    "run-insufficient",
    "assessment-insufficient",
    "evidence-unused",
    "mapping-unused",
    "Unused source",
    "This evidence is not relevant.",
  );
  insufficient.goal_id = goal.id;
  insufficient.criteria[0].criterion_id = criterion.id;
  insufficient.criteria[0].assessment.criterion_id = criterion.id;
  insufficient.criteria[0].result = "NEEDS_REVIEW";
  insufficient.criteria[0].progress_percentage = null;
  insufficient.criteria[0].assessment.result = "NEEDS_REVIEW";
  insufficient.criteria[0].assessment.progress_percentage = null;
  insufficient.criteria[0].assessment.rationale = "There is not enough relevant evidence to assess this criterion.";
  insufficient.criteria[0].assessment.evidence = [];
  insufficient.goal_progress_percentage = null;
  insufficient.evidence_coverage_percentage = 0;
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [criterion] },
    assessments: { [goal.id]: insufficient },
    evidenceByGoal: { [goal.id]: [] },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  const assessmentCard = page.locator(".m66-assessment");
  await expect(assessmentCard.locator(".m66-assessment-heading strong")).toHaveText("Needs Review");
  await expect(assessmentCard).toContainText("Progress: unavailable");
  await expect(assessmentCard.locator(".m66-evidence")).toHaveCount(0);
});

test("contradictory evidence is cited for a needs-review result", async ({ page }) => {
  const evaluationCase = evaluationDataset.cases.find(
    (item) => item.case_id === "contradictory-release-outcomes",
  );
  if (!evaluationCase) throw new Error("The contradiction benchmark case is missing.");
  const contradictoryEvidence = evaluationCase.evidence.find(
    (item) => item.mapping_id === evaluationCase.labels.expected_contradictory_mapping_ids[0],
  );
  if (!contradictoryEvidence) {
    throw new Error("The benchmark's contradictory evidence is missing.");
  }

  const goal = makeGoal("goal-contradiction", "Improve release safety", "personal", "active");
  const criterion = {
    id: "criterion-contradiction",
    goal_id: goal.id,
    current_version: 1,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-contradiction",
      criterion_id: "criterion-contradiction",
      version: 1,
      definition: {
        criterion_type: "BINARY",
        description: evaluationCase.criterion.definition.description,
        completion_conditions: evaluationCase.criterion.definition.completion_conditions,
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      },
      approval_status: "APPROVED",
      created_by_user_id: "user-1",
      prompt_version: null,
      model_version: null,
      created_at: now,
      approved_by_user_id: "user-1",
      approved_at: now,
    }],
  };
  const contradictory = makeJourneyAssessment(
    "CURRENT",
    "run-contradiction",
    "assessment-contradiction",
    contradictoryEvidence.mapping_id,
    contradictoryEvidence.mapping_id,
    contradictoryEvidence.title,
    contradictoryEvidence.content,
  );
  contradictory.goal_id = goal.id;
  contradictory.criteria[0].criterion_id = criterion.id;
  contradictory.criteria[0].assessment.criterion_id = criterion.id;
  contradictory.criteria[0].result = evaluationCase.labels.expected_result;
  contradictory.criteria[0].assessment.result = evaluationCase.labels.expected_result;
  contradictory.criteria[0].assessment.progress_percentage = null;
  contradictory.criteria[0].assessment.rationale = evaluationCase.labels.expected_rationale;
  contradictory.criteria[0].assessment.evidence[0].relationship_type = "CONTRADICTORY";
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [criterion] },
    assessments: { [goal.id]: contradictory },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  const assessmentCard = page.locator(".m66-assessment");
  await expect(assessmentCard.locator(".m66-assessment-heading strong")).toHaveText(
    evaluationCase.labels.expected_result
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
  );
  await expect(assessmentCard).toContainText("contradictory");
  await expect(assessmentCard.getByRole("link", { name: contradictoryEvidence.title })).toBeVisible();
  await expect(assessmentCard).toContainText(contradictoryEvidence.content);
});

test("criterion edits make the previous assessment obsolete but preserve its result", async ({ page }) => {
  const goal = makeGoal("goal-obsolete", "Improve release safety", "personal", "active");
  const criterion = {
    id: "criterion-obsolete",
    goal_id: goal.id,
    current_version: 1,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-1",
      criterion_id: "criterion-obsolete",
      version: 1,
      definition: {
        criterion_type: "BINARY",
        description: "Enable release validation",
        completion_conditions: "Validation is enabled in production.",
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      },
      approval_status: "APPROVED",
      created_by_user_id: "user-1",
      prompt_version: null,
      model_version: null,
      created_at: now,
      approved_by_user_id: "user-1",
      approved_at: now,
    }],
  };
  const previousAssessment = makeJourneyAssessment(
    "CURRENT",
    "run-obsolete",
    "assessment-obsolete",
    "evidence-obsolete",
    "mapping-obsolete",
    "Release validation change",
    "Enabled production release validation.",
  );
  previousAssessment.goal_id = goal.id;
  previousAssessment.criteria[0].criterion_id = criterion.id;
  previousAssessment.criteria[0].assessment.criterion_id = criterion.id;
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [criterion] },
    assessments: { [goal.id]: previousAssessment },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  const card = page.locator(".m66-criterion");
  await card.getByRole("button", { name: "Edit" }).click();
  await page.locator(".m66-editor").getByLabel("Description").fill(
    "Enable and verify release validation",
  );
  await page.locator(".m66-editor").getByRole("button", { name: "Save proposal" }).click();
  await expect(card.getByRole("heading", { name: "Enable and verify release validation" })).toBeVisible();
  await expect(card.locator(".m66-assessment-heading")).toContainText("obsolete");
  await expect(card.locator(".m66-assessment-heading strong")).toHaveText("Met");
  await card.locator(".m66-version-history summary").click();
  await expect(card.locator(".m66-version-history")).toContainText("Version 2 · proposed");
  expect(previousAssessment.criteria[0].assessment.result).toBe("MET");
  expect(previousAssessment.criteria[0].assessment.lifecycle_state).toBe("OBSOLETE");
});

test("criteria and assessment loading and empty states are visible", async ({ page }) => {
  const goal = makeGoal("goal-empty", "Improve service quality", "personal", "active");
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [] },
    assessments: {
      [goal.id]: {
        criteria_count: 0,
        criteria_met_count: 0,
        criteria: [],
      },
    },
    assessmentLoadingDelayMs: 400,
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  await expect(page.getByText(/Loading goal criteria and assessment/)).toBeVisible();
  await expect(page.getByText(/No criteria yet/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reanalyze evidence" })).toBeDisabled();
});

test("reanalyze refreshes linked evidence and displays partial source failures", async ({ page }) => {
  const goal = makeGoal("goal-reanalyze", "Improve deployment safety", "personal", "active");
  const criterion = {
    id: "criterion-reanalyze",
    goal_id: goal.id,
    current_version: 1,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-reanalyze",
      criterion_id: "criterion-reanalyze",
      version: 1,
      definition: {
        criterion_type: "BINARY",
        description: "Enable production canary validation",
        completion_conditions: "Canary validation is enabled and verified in production.",
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      },
      approval_status: "APPROVED",
      created_by_user_id: "user-1",
      prompt_version: null,
      model_version: null,
      created_at: now,
      approved_by_user_id: "user-1",
      approved_at: now,
    }],
  };
  const refreshed = {
    goal_id: goal.id,
    run_id: "run-reanalyze",
    run_status: "PARTIAL",
    run_error_message: "Jira evidence refresh failed: The connection could not be refreshed.",
    criteria_count: 1,
    assessed_criteria_count: 1,
    criteria_met_count: 1,
    criteria_met_percentage: 100,
    goal_progress_percentage: 100,
    evidence_coverage_percentage: 100,
    average_confidence: 0.9,
    criteria: [{
      criterion_id: criterion.id,
      criterion_version: 1,
      result: "MET",
      lifecycle_state: "CURRENT",
      progress_percentage: 100,
      assessment: {
        id: "assessment-reanalyze",
        run_id: "run-reanalyze",
        criterion_id: criterion.id,
        criterion_version_id: "criterion-version-reanalyze",
        criterion_version: 1,
        result: "MET",
        lifecycle_state: "CURRENT",
        progress_percentage: 100,
        rationale: "The refreshed evidence supports the completion condition.",
        confidence: 0.9,
        input_fingerprint: "refreshed-fingerprint",
        model_version: "test-model",
        prompt_version: "m66-criterion-assessment-v1",
        created_at: now,
        evidence: [{
          id: "assessment-evidence-reanalyze",
          evidence_mapping_id: "mapping-reanalyze",
          evidence_id: "evidence-reanalyze",
          title: "Production canary pull request",
          source_url: "https://github.com/acme/app/pull/7",
          captured_at: now,
          source_updated_at: now,
          review_state: "pending",
          source_validity: "STORED_SNAPSHOT",
          relationship_type: "SUPPORTING",
          citation_excerpt: "Implemented and verified the production canary release path.",
        }],
        events: [],
      },
    }],
    updated_at: now,
  };
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [criterion] },
    assessments: { [goal.id]: { criteria_count: 1, criteria: [] } },
    reanalysisResponses: { [goal.id]: refreshed },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  await page.getByRole("button", { name: "Reanalyze evidence" }).click();
  await expect(page.getByText("Latest run: partial")).toBeVisible();
  await expect(page.locator(".m66-error")).toContainText("Jira evidence refresh failed");
  await expect(page.getByRole("link", { name: "Production canary pull request" })).toBeVisible();
  await expect(page.getByText(/Review: pending/)).toBeVisible();
  expect(state.reanalysisRequests).toEqual([goal.id]);
});

test("reanalyze displays a completed result with its evidence citation", async ({ page }) => {
  const goal = makeGoal("goal-reanalyze-success", "Improve release safety", "personal", "active");
  const criterion = {
    id: "criterion-reanalyze-success",
    goal_id: goal.id,
    current_version: 1,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-reanalyze-success",
      criterion_id: "criterion-reanalyze-success",
      version: 1,
      definition: {
        criterion_type: "BINARY",
        description: "Enable production canary validation",
        completion_conditions: "Canary validation is enabled in production.",
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      },
      approval_status: "APPROVED",
      created_by_user_id: "user-1",
      prompt_version: null,
      model_version: null,
      created_at: now,
      approved_by_user_id: "user-1",
      approved_at: now,
    }],
  };
  const completed = {
    goal_id: goal.id,
    run_id: "run-reanalyze-success",
    run_status: "COMPLETED",
    run_error_message: null,
    criteria_count: 1,
    assessed_criteria_count: 1,
    criteria_met_count: 1,
    criteria_met_percentage: 100,
    goal_progress_percentage: 100,
    evidence_coverage_percentage: 100,
    average_confidence: 0.9,
    criteria: [{
      criterion_id: criterion.id,
      criterion_version: 1,
      result: "MET",
      lifecycle_state: "CURRENT",
      progress_percentage: 100,
      assessment: {
        id: "assessment-reanalyze-success",
        run_id: "run-reanalyze-success",
        criterion_id: criterion.id,
        criterion_version_id: "criterion-version-reanalyze-success",
        criterion_version: 1,
        result: "MET",
        lifecycle_state: "CURRENT",
        progress_percentage: 100,
        rationale: "The source confirms production canary validation.",
        confidence: 0.9,
        input_fingerprint: "success-fingerprint",
        model_version: "test-model",
        prompt_version: "m66-criterion-assessment-v1",
        created_at: now,
        evidence: [{
          id: "assessment-evidence-reanalyze-success",
          evidence_mapping_id: "mapping-reanalyze-success",
          evidence_id: "evidence-reanalyze-success",
          title: "Release safety pull request",
          source_url: "https://github.com/acme/app/pull/8",
          captured_at: now,
          source_updated_at: now,
          review_state: "pending",
          source_validity: "STORED_SNAPSHOT",
          relationship_type: "SUPPORTING",
          citation_excerpt: "Enabled and verified the production canary release path.",
        }],
        events: [],
      },
    }],
    updated_at: now,
  };
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [criterion] },
    assessments: { [goal.id]: { criteria_count: 1, criteria: [] } },
    reanalysisResponses: { [goal.id]: completed },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  await page.getByRole("button", { name: "Reanalyze evidence" }).click();
  await expect(page.getByText("Latest run: completed")).toBeVisible();
  await expect(page.locator(".m66-metrics")).toContainText("1/1");
  await expect(page.locator(".m66-metrics")).toContainText("100%");
  await expect(page.getByText("The source confirms production canary validation.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Release safety pull request" })).toBeVisible();
  await expect(page.getByText(/Review: pending/)).toBeVisible();
  expect(state.reanalysisRequests).toEqual([goal.id]);
});

test("reanalyze displays a failed run and its recovery message", async ({ page }) => {
  const goal = makeGoal("goal-reanalyze-failed", "Improve release safety", "personal", "active");
  const criterion = {
    id: "criterion-reanalyze-failed",
    goal_id: goal.id,
    current_version: 1,
    is_retired: false,
    created_at: now,
    updated_at: now,
    versions: [{
      id: "criterion-version-reanalyze-failed",
      criterion_id: "criterion-reanalyze-failed",
      version: 1,
      definition: {
        criterion_type: "BINARY",
        description: "Enable production canary validation",
        completion_conditions: "Canary validation is enabled in production.",
        milestones: [],
        target_value: null,
        unit: null,
        evidence_suggestions: [],
        assumptions_and_clarifications: [],
      },
      approval_status: "APPROVED",
      created_by_user_id: "user-1",
      prompt_version: null,
      model_version: null,
      created_at: now,
      approved_by_user_id: "user-1",
      approved_at: now,
    }],
  };
  const failed = {
    goal_id: goal.id,
    run_id: "run-reanalyze-failed",
    run_status: "FAILED",
    run_error_message: "Assessment provider failed.",
    criteria_count: 1,
    assessed_criteria_count: 0,
    criteria_met_count: 0,
    criteria_met_percentage: 0,
    goal_progress_percentage: null,
    evidence_coverage_percentage: 0,
    average_confidence: null,
    criteria: [],
    updated_at: now,
  };
  const recovered = {
    ...failed,
    run_id: "run-reanalyze-recovered",
    run_status: "COMPLETED",
    run_error_message: null,
  };
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [criterion] },
    assessments: { [goal.id]: { criteria_count: 1, criteria: [] } },
    reanalysisResponseSequences: { [goal.id]: [failed, recovered] },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  await page.getByRole("button", { name: "Reanalyze evidence" }).click();
  await expect(page.getByText("Latest run: failed")).toBeVisible();
  await expect(page.locator(".m66-error")).toContainText("Assessment provider failed.");

  await page.getByRole("button", { name: "Reanalyze evidence" }).click();
  await expect(page.getByText("Latest run: completed")).toBeVisible();
  await expect(page.locator(".m66-error")).toHaveCount(0);
  expect(state.reanalysisRequests).toEqual([goal.id, goal.id]);
});

test("source access failure shows the stored snapshot and opens manual evidence entry", async ({ page }) => {
  const goal = makeGoal("goal-source-unavailable", "Improve release safety", "personal", "active");
  const failureReason = "GitHub rate limit exceeded; the stored snapshot was retained.";
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [] },
    assessments: {
      [goal.id]: {
        goal_id: goal.id,
        run_id: "run-source-failure",
        run_status: "PARTIAL",
        run_error_message: failureReason,
        criteria_count: 0,
        assessed_criteria_count: 0,
        criteria_met_count: 0,
        criteria_met_percentage: null,
        goal_progress_percentage: null,
        evidence_coverage_percentage: null,
        average_confidence: null,
        criteria: [],
        source_retrieval_history: [{
          id: "retrieval-failure",
          goal_id: goal.id,
          run_id: "run-source-failure",
          provider: "github",
          status: "FAILURE",
          checked_at: now,
          failure_reason: failureReason,
          used_snapshot: true,
          snapshot_captured_at: now,
        }],
        updated_at: now,
      },
    },
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  const sourceHistory = page.locator(".m66-source-retrieval.failure");
  await expect(sourceHistory).toContainText(failureReason);
  await expect(sourceHistory).toContainText("this assessment uses the snapshot captured");
  await sourceHistory.getByRole("link", { name: "Add evidence manually" }).click();

  await expect(page.getByRole("heading", { name: "Add evidence to this goal" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Add manually" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Evidence title")).toBeVisible();
});

test("Retry reloads criteria after the criteria request fails", async ({ page }) => {
  const goal = makeGoal("goal-criteria-retry", "Improve release safety", "personal", "active");
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [] },
    criteriaLoadFailures: 1,
    criteriaLoadError: "Criteria service quota exceeded.",
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  await expect(page.locator(".m66-error")).toContainText("Criteria service quota exceeded.");
  const failedRequests = state.queryLoadRequests?.filter((request) => request === "criteria").length ?? 0;
  expect(failedRequests).toBe(1);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator(".m66-error")).toHaveCount(0);
  await expect.poll(
    () => state.queryLoadRequests?.filter((request) => request === "criteria").length ?? 0,
  ).toBe(failedRequests + 1);
});

test("Retry reloads assessment after the assessment request fails", async ({ page }) => {
  const goal = makeGoal("goal-assessment-retry", "Improve release safety", "personal", "active");
  const state: MockState = {
    goals: [goal],
    history: {},
    criteria: { [goal.id]: [] },
    assessmentLoadFailures: 1,
    assessmentLoadError: "MCP assessment service is unavailable.",
  };
  await installMockApi(page, state);
  await signInAndOpen(page, `/goals/${goal.id}`);

  await expect(page.locator(".m66-error")).toContainText("MCP assessment service is unavailable.");
  const failedRequests = state.queryLoadRequests?.filter((request) => request === "assessment").length ?? 0;
  expect(failedRequests).toBe(1);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator(".m66-error")).toHaveCount(0);
  await expect.poll(
    () => state.queryLoadRequests?.filter((request) => request === "assessment").length ?? 0,
  ).toBe(failedRequests + 1);
});
