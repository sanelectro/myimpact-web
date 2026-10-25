import { expect, type Page, type Route } from "@playwright/test";

export type GoalStatus = "draft" | "approved" | "active" | "completed" | "archived";
export type GoalScope = "personal" | "team" | "organization";

export interface Goal {
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

export interface MockState {
  goals: Goal[];
  history: Record<string, Array<Record<string, string>>>;
  milestones?: Record<string, Array<Record<string, unknown>>>;
  milestoneCreateRequests?: Array<Record<string, unknown>>;
  criteria?: Record<string, Array<Record<string, unknown>>>;
  generatedCriteria?: Record<string, Array<Record<string, unknown>>>;
  criterionUpdateRequests?: Array<Record<string, unknown>>;
  criterionApprovalRequests?: Array<{ criterionId: string; versionId: string }>;
  assessments?: Record<string, Record<string, unknown>>;
  sourceRetrievalHistory?: Record<string, Array<Record<string, unknown>>>;
  reanalysisRequests?: string[];
  reanalysisResponses?: Record<string, Record<string, unknown>>;
  reanalysisResponseSequences?: Record<string, Array<Record<string, unknown>>>;
  assessmentLoadingDelayMs?: number;
  criteriaLoadFailures?: number;
  assessmentLoadFailures?: number;
  criteriaLoadError?: string;
  assessmentLoadError?: string;
  queryLoadRequests?: string[];
  feedbackRequests?: Array<{
    goalId: string;
    criterionId: string;
    assessmentId: string;
    feedbackType: string;
    correctedResult?: string;
  }>;
  evidenceByGoal?: Record<string, Array<Record<string, unknown>>>;
  evidenceCreateRequests?: Array<Record<string, unknown>>;
  pendingApprovals?: Array<Record<string, unknown>>;
  evidenceApprovalDecisionRequests?: Array<{
    approvalId: string;
    decision: string;
    comment: string | null;
  }>;
  staleAssessmentsAfterEvidenceCreate?: Record<string, Record<string, unknown>>;
  importResponse?: {
    imported_goals: Goal[];
    skipped_duplicates: Array<{ title: string; existing_goal_id: string }>;
  };
  uploadError?: boolean;
}

export const now = "2026-10-22T12:00:00Z";

export function makeGoal(
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

export async function installMockApi(page: Page, state: MockState) {
  const milestonesByGoal = state.milestones ?? (state.milestones = {});
  const milestoneCreateRequests =
    state.milestoneCreateRequests ?? (state.milestoneCreateRequests = []);
  const reanalysisCountByGoal: Record<string, number> = {};

  await page.route("**/auth/refresh", async (route) => {
    await json(route, 200, {
      access_token: "test-access-token",
      expires_in: 3600,
      user: {
        id: "user-1",
        name: "Alex Johnson",
        email: "alex@example.com",
        role: "Lead Software Engineer",
      },
    });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const goalIdMatch = path.match(/^\/api\/v1\/goals\/([^/]+)(?:\/(.*))?$/);
    const goalId = goalIdMatch?.[1] ? decodeURIComponent(goalIdMatch[1]) : undefined;
    const action = goalIdMatch?.[2];

    if (path === "/api/v1/evidence-approvals/pending" && method === "GET") {
      return json(route, 200, state.pendingApprovals ?? []);
    }
    const approvalDecision = path.match(/^\/api\/v1\/evidence-approvals\/([^/]+)\/decision$/);
    if (approvalDecision && method === "POST") {
      const [, approvalId] = approvalDecision;
      const body = request.postDataJSON() as Record<string, unknown>;
      const decision = String(body.decision);
      const comment = typeof body.comment === "string" ? body.comment : null;
      state.evidenceApprovalDecisionRequests ??= [];
      state.evidenceApprovalDecisionRequests.push({ approvalId, decision, comment });
      state.pendingApprovals = (state.pendingApprovals ?? []).filter(
        (approval) => approval.approval_id !== approvalId,
      );
      return json(route, 200, {
        id: approvalId,
        status: decision,
        manager_comment: comment,
        reviewed_at: now,
      });
    }

    if (path === "/api/v1/profile" && method === "GET") {
      return json(route, 200, {
        user_id: "user-1",
        name: "Alex Johnson",
        email: "alex@example.com",
        company: "MyImpact E2E",
        organization_id: "organization-1",
        role: "Lead Software Engineer",
        reporting_manager_id: null,
        reporting_manager: null,
        direct_reports: [],
      });
    }
    if (path === "/api/v1/integrations/connections" && method === "GET") {
      return json(route, 200, []);
    }

    if (path === "/api/v1/goals" && method === "GET") {
      return json(route, 200, state.goals.filter((goal) => goal.status !== "archived"));
    }
    if (path === "/api/v1/goals/assessment-runs" && method === "POST") {
      return json(route, 200, { batch_id: "batch-1", runs: [] });
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

    if (goalId && action === "criteria" && method === "GET") {
      state.queryLoadRequests ??= [];
      state.queryLoadRequests.push("criteria");
      if ((state.criteriaLoadFailures ?? 0) > 0) {
        state.criteriaLoadFailures = (state.criteriaLoadFailures ?? 1) - 1;
        return json(route, 503, {
          detail: state.criteriaLoadError ?? "Criteria service quota exceeded.",
        });
      }
      return json(route, 200, state.criteria?.[goalId] ?? []);
    }
    if (goalId && action === "criteria/generate" && method === "POST") {
      state.criteria ??= {};
      state.criteria[goalId] = state.generatedCriteria?.[goalId] ?? [];
      return json(route, 201, state.criteria[goalId]);
    }
    const criterionUpdate = action?.match(/^criteria\/([^/]+)$/);
    if (goalId && criterionUpdate && method === "PUT") {
      const [, criterionId] = criterionUpdate;
      const criterion = state.criteria?.[goalId]?.find((item) => item.id === criterionId);
      if (!criterion) return json(route, 404, { detail: "Criterion not found" });
      const body = request.postDataJSON() as Record<string, unknown>;
      state.criterionUpdateRequests ??= [];
      state.criterionUpdateRequests.push(body);
      const versions = Array.isArray(criterion.versions)
        ? criterion.versions as Array<Record<string, unknown>>
        : [];
      const latest = versions.at(-1);
      const nextVersion = Number(latest?.version ?? 0) + 1;
      const version = {
        ...latest,
        id: `criterion-version-${nextVersion}`,
        criterion_id: criterionId,
        version: nextVersion,
        definition: body.definition,
        approval_status: "PROPOSED",
        approved_by_user_id: null,
        approved_at: null,
        created_at: now,
      };
      criterion.versions = [...versions, version];
      state.criteria[goalId] = [...(state.criteria[goalId] ?? [])];
      const assessment = state.assessments?.[goalId];
      const summaries = Array.isArray(assessment?.criteria)
        ? assessment.criteria as Array<Record<string, unknown>>
        : [];
      for (const summary of summaries) {
        if (summary.criterion_id !== criterionId) continue;
        summary.lifecycle_state = "OBSOLETE";
        const result = summary.assessment;
        if (result && typeof result === "object") {
          (result as Record<string, unknown>).lifecycle_state = "OBSOLETE";
        }
      }
      return json(route, 200, criterion);
    }
    const criterionApproval = action?.match(
      /^criteria\/([^/]+)\/versions\/([^/]+)\/approve$/,
    );
    if (goalId && criterionApproval && method === "POST") {
      const [, criterionId, versionId] = criterionApproval;
      const criterion = state.criteria?.[goalId]?.find((item) => item.id === criterionId);
      const versions = Array.isArray(criterion?.versions)
        ? criterion.versions as Array<Record<string, unknown>>
        : [];
      const version = versions.find((item) => item.id === versionId);
      if (!criterion || !version) return json(route, 404, { detail: "Criterion version not found" });
      version.approval_status = "APPROVED";
      version.approved_by_user_id = "user-1";
      version.approved_at = now;
      criterion.current_version = version.version;
      state.criterionApprovalRequests ??= [];
      state.criterionApprovalRequests.push({ criterionId, versionId });
      return json(route, 200, criterion);
    }

    if (goalId && action === "assessment" && method === "GET") {
      state.queryLoadRequests ??= [];
      state.queryLoadRequests.push("assessment");
      if ((state.assessmentLoadFailures ?? 0) > 0) {
        state.assessmentLoadFailures = (state.assessmentLoadFailures ?? 1) - 1;
        return json(route, 503, {
          detail: state.assessmentLoadError ?? "Assessment data service is unavailable.",
        });
      }
      if (state.assessmentLoadingDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, state.assessmentLoadingDelayMs));
      }
      return json(route, 200, {
        goal_id: goalId,
        run_id: null,
        run_status: null,
        run_error_message: null,
        criteria_count: 0,
        assessed_criteria_count: 0,
        criteria_met_count: 0,
        criteria_met_percentage: null,
        goal_progress_percentage: null,
        evidence_coverage_percentage: null,
        average_confidence: null,
        criteria: [],
        source_retrieval_history: state.sourceRetrievalHistory?.[goalId] ?? [],
        updated_at: null,
        ...state.assessments?.[goalId],
      });
    }
    const feedback = action?.match(
      /^criteria\/([^/]+)\/assessments\/([^/]+)\/feedback$/,
    );
    if (goalId && feedback && method === "POST") {
      const [, criterionId, assessmentId] = feedback;
      const body = request.postDataJSON() as Record<string, unknown>;
      const summaries = Array.isArray(state.assessments?.[goalId]?.criteria)
        ? state.assessments?.[goalId].criteria as Array<Record<string, unknown>>
        : [];
      const summary = summaries.find((item) => item.criterion_id === criterionId);
      const assessment = summary?.assessment as Record<string, unknown> | undefined;
      if (!assessment || assessment.id !== assessmentId) {
        return json(route, 404, { detail: "Assessment not found" });
      }
      const feedbackType = String(body.feedback_type);
      const correctedResult = typeof body.corrected_result === "string"
        ? body.corrected_result
        : undefined;
      state.feedbackRequests ??= [];
      state.feedbackRequests.push({
        goalId,
        criterionId,
        assessmentId,
        feedbackType,
        correctedResult,
      });
      const events = Array.isArray(assessment.events)
        ? assessment.events as Array<Record<string, unknown>>
        : [];
      assessment.events = [
        ...events,
        {
          id: `feedback-${events.length + 1}`,
          event_type: feedbackType,
          lifecycle_state: null,
          actor_user_id: "user-1",
          details: { corrected_result: correctedResult ?? null },
          created_at: now,
        },
      ];
      return json(route, 200, state.assessments?.[goalId]);
    }
    if (goalId && action === "assessment/reanalyze" && method === "POST") {
      state.reanalysisRequests ??= [];
      state.reanalysisRequests.push(goalId);
      const sequence = state.reanalysisResponseSequences?.[goalId];
      const sequenceIndex = reanalysisCountByGoal[goalId] ?? 0;
      const result = sequence?.[Math.min(sequenceIndex, sequence.length - 1)]
        ?? state.reanalysisResponses?.[goalId]
        ?? {
        goal_id: goalId,
        run_id: "run-reanalysis",
        run_status: "COMPLETED",
        run_error_message: null,
        criteria_count: 0,
        assessed_criteria_count: 0,
        criteria_met_count: 0,
        criteria_met_percentage: null,
        goal_progress_percentage: null,
        evidence_coverage_percentage: null,
        average_confidence: null,
        criteria: [],
        updated_at: now,
      };
      reanalysisCountByGoal[goalId] = sequenceIndex + 1;
      state.assessments ??= {};
      state.assessments[goalId] = result;
      return json(route, 200, result);
    }

    if (goalId && action === "evidence" && method === "GET") {
      if (state.evidenceByGoal?.[goalId]) {
        return json(route, 200, state.evidenceByGoal[goalId]);
      }
      return json(route, 200, [
        {
          evidence_id: "evidence-1",
          title: "Reduced deployment incidents",
          description: "Introduced deployment safeguards and reduced incidents.",
          source_type: "personal",
          source_url: null,
          captured_at: now,
          milestone_id: null,
          relevance: "high",
          confidence: 0.95,
          reason: "Directly supports the goal.",
        },
      ]);
    }
    if (goalId && action === "evidence" && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      state.evidenceCreateRequests ??= [];
      state.evidenceCreateRequests.push(body);
      state.evidenceByGoal ??= {};
      const evidence = {
        evidence_id: `evidence-${(state.evidenceByGoal[goalId]?.length ?? 0) + 1}`,
        approval_id: `approval-${(state.evidenceByGoal[goalId]?.length ?? 0) + 1}`,
        approval_status: "pending",
        description: null,
        source_updated_at: null,
        confidence: 1,
        reason: null,
        ...body,
      };
      state.evidenceByGoal[goalId] = [...(state.evidenceByGoal[goalId] ?? []), evidence];
      const staleAssessment = state.staleAssessmentsAfterEvidenceCreate?.[goalId];
      if (staleAssessment && state.assessments?.[goalId]) {
        state.assessments[goalId] = staleAssessment;
      }
      return json(route, 201, evidence);
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

    if (goalId && action === "milestones" && method === "GET") {
      return json(route, 200, milestonesByGoal[goalId] ?? []);
    }
    if (goalId && action === "milestones/suggestions" && method === "POST") {
      return json(route, 200, [
        {
          title: "Review current reliability risks",
          description: "Identify the main reliability risks affecting the goal.",
          completion_criteria: "A prioritized risk list has been reviewed.",
        },
      ]);
    }
    if (goalId && action === "milestones" && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      milestoneCreateRequests.push(body);
      const milestone = {
        id: `milestone-${milestoneCreateRequests.length}`,
        goal_id: goalId,
        title: body.title,
        description: body.description ?? null,
        completion_criteria: body.completion_criteria ?? null,
        status: body.status ?? "not_started",
        source: body.source ?? "manual",
        due_date: body.due_date ?? null,
        archived_at: null,
        created_at: now,
        updated_at: now,
      };
      milestonesByGoal[goalId] = [...(milestonesByGoal[goalId] ?? []), milestone];
      return json(route, 201, milestone);
    }
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

export async function signInAndOpen(page: Page, path: string) {
  await page.goto(path);
  await expect(page).not.toHaveURL(/\/login$/);
}
