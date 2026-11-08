import {
  getCurrentUserIdForApi,
  apiFileRequest,
  apiRequest,
  authRequest,
} from "./client";
import type {
  Goal,
  GoalHierarchy,
  GoalHierarchySummary,
  GoalRelationshipEvent,
  GoalEvidenceEligibility,
  GoalStatusHistory,
  GoalValidationRun,
  GoalEvidence,
  GoalEvidenceContext,
  EvidenceApprovalStatus,
  GoalInsight,
  ImpactAssessment,
  KnowledgeDocument,
  GoalAssessment,
  GoalAssessmentBatch,
  GoalAssessmentFeedbackRequest,
  GoalCreateRequest,
  GoalCriterion,
  GoalCriterionRequest,
  GoalUpdateRequest,
  DocumentExpectation,
  EvidenceCreateRequest,
  EvidenceCreateResponse,
  EvidenceMappingCreateRequest,
  GoalEvidenceCreateRequest,
  GoalMilestone,
  GoalMilestoneCreateRequest,
  GoalMilestoneSuggestion,
  GoalMilestoneUpdateRequest,
  Archives,
  DiscoveredEvidence,
  EvidenceDiscoveryRequest,
  SourceConnection,
  ProfileRole,
  ReportingManagerOption,
  DirectReportOption,
  TeamOption,
  UserProfile,
  AdminUser,
  AdminCompany,
  AdminCompanyUpdateRequest,
  AdminUserInvitation,
  AdminUserInvitationRequest,
  AssessmentCategory,
  GoalCriterionDefinition,
  CompanyRoleDefinition,
  CompanyRoleHistoryEvent,
  CompanyRoleWriteRequest,
  PendingEvidenceApproval,
  Notification,
  HumanReviewBatch,
  HumanReviewBatchPreview,
  HumanReviewCase,
  HumanReviewCaseSummary,
  HumanReviewSubmission,
  HumanReviewAdjudicationCase,
  HumanReviewProgress,
  ReliabilityExperiment,
  ReliabilityAttempt,
  ReliabilityComparison,
  ReliabilityReport,
  ThresholdMetricDefinition,
  ThresholdSet,
  ThresholdApproval,
} from "../types/api";

function userQuery(userId?: string) {
  return `?user_id=${encodeURIComponent(userId ?? getCurrentUserIdForApi())}`;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export function getGoals() {
  return apiRequest<Goal[]>(`/api/v1/goals${userQuery()}`);
}

export function getGoalHierarchy(goalId: string) {
  return apiRequest<GoalHierarchy>(`/api/v1/goals/${encodeURIComponent(goalId)}/hierarchy${userQuery()}`);
}

export function getGoalChildren(goalId: string, offset: number, limit = 50) {
  return apiRequest<GoalHierarchySummary[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/children${userQuery()}&limit=${limit}&offset=${offset}`,
  );
}

export function getGoalRelationshipHistory(goalId: string, offset: number, limit = 50) {
  return apiRequest<GoalRelationshipEvent[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/relationship-history${userQuery()}&limit=${limit}&offset=${offset}`,
  );
}

export function changeGoalParent(
  goalId: string,
  parentGoalId: string | null,
  expectedRevision: number,
  reason: string | null,
) {
  return apiRequest<{ id: string; parent_goal_id: string | null; relationship_revision: number }>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/parent${userQuery()}`,
    {
      method: parentGoalId === null ? "DELETE" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(parentGoalId === null ? {} : { parent_goal_id: parentGoalId }),
        expected_revision: expectedRevision,
        reason,
      }),
    },
  );
}

export function getUserGoals(userId: string) {
  return apiRequest<Goal[]>(`/api/v1/goals${userQuery(userId)}`);
}

export function getAllCompanyUsers() {
  return apiRequest<AdminUser[]>("/api/v1/admin/users");
}

export function getAdminCompanies() {
  return apiRequest<AdminCompany[]>("/api/v1/admin/companies");
}

export function getAssessmentCategories() {
  return apiRequest<AssessmentCategory[]>("/api/v1/admin/assessment-categories");
}

export function createAssessmentCategory(payload: {
  name: string;
  description: string | null;
}) {
  return apiRequest<AssessmentCategory>("/api/v1/admin/assessment-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function addAssessmentCategoryCriterion(
  categoryId: string,
  payload: { title: string; definition: GoalCriterionDefinition },
) {
  return apiRequest<AssessmentCategory>(
    `/api/v1/admin/assessment-categories/${encodeURIComponent(categoryId)}/criteria`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminCompany(
  companyId: string,
  payload: AdminCompanyUpdateRequest,
) {
  return apiRequest<AdminCompany>(
    `/api/v1/admin/companies/${encodeURIComponent(companyId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function inviteCompanyUser(payload: AdminUserInvitationRequest) {
  return authRequest<AdminUserInvitation>("/admin/users/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function setCompanyUserActive(userId: string, isActive: boolean) {
  return authRequest<{ id: string; is_active: boolean }>(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    },
  );
}

export function getProfile() {
  return apiRequest<UserProfile>("/api/v1/profile");
}

export function getPendingEvidenceApprovals() {
  return apiRequest<PendingEvidenceApproval[]>(
    "/api/v1/evidence-approvals/pending",
  );
}

export function decideEvidenceApproval(
  approvalId: string,
  decision: "approved" | "rejected" | "needs_information",
  comment: string,
) {
  return apiRequest<{
    id: string;
    status: string;
    manager_comment: string | null;
    reviewed_at: string | null;
  }>(`/api/v1/evidence-approvals/${encodeURIComponent(approvalId)}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, comment: comment.trim() || null }),
  });
}

export function resubmitEvidence(
  approvalId: string,
  payload: {
    title: string;
    description: string | null;
    source_url: string | null;
    notes: string;
  },
) {
  return apiRequest<{
    approval_id: string;
    evidence_id: string;
    status: string;
    notification_id: string;
  }>(`/api/v1/evidence-approvals/${encodeURIComponent(approvalId)}/resubmit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getNotifications() {
  return apiRequest<Notification[]>("/api/v1/notifications");
}

export function getHumanReviewBatches() {
  return apiRequest<HumanReviewBatch[]>("/api/v1/human-review/batches");
}

export function getHumanReviewQueue(batchId: string) {
  return apiRequest<HumanReviewCaseSummary[]>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/queue`,
  );
}

export function getHumanReviewCase(batchId: string, caseId: string) {
  return apiRequest<HumanReviewCase>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/cases/${encodeURIComponent(caseId)}`,
  );
}

export function getHumanReviewBatchPreview(batchId: string) {
  return apiRequest<HumanReviewBatchPreview>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/reviews/preview`,
  );
}

export function submitFinalHumanReview(batchId: string, previewToken: string) {
  return apiRequest<{ is_final: boolean; finalized_cases: number }>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/reviews/final`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview_token: previewToken }),
    },
  );
}

export function submitHumanReview(
  batchId: string,
  caseId: string,
  payload: HumanReviewPayload,
) {
  return apiRequest<HumanReviewSubmission>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/cases/${encodeURIComponent(caseId)}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function saveHumanReviewDraft(
  batchId: string,
  caseId: string,
  payload: HumanReviewPayload,
) {
  return apiRequest<HumanReviewSubmission>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/cases/${encodeURIComponent(caseId)}/reviews/draft`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

interface HumanReviewPayload {
    label: string;
    rationale: string;
    review_stage?: "BLIND" | "POST_AI" | "PROPOSAL_ASSISTED";
    ai_attempt_id?: string;
    reference_proposal_id?: string;
    confidence?: number;
    context_notes?: string;
    evidence_findings?: Array<Record<string, unknown>>;
}

export function getHumanReviewAdjudications(batchId: string) {
  return apiRequest<HumanReviewAdjudicationCase[]>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/adjudications`,
  );
}

export function getHumanReviewProgress(batchId: string) {
  return apiRequest<HumanReviewProgress>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/progress`,
  );
}

export function submitHumanReviewAdjudication(
  batchId: string,
  caseId: string,
  payload: { final_label: string; rationale: string },
) {
  return apiRequest<Record<string, unknown>>(
    `/api/v1/human-review/batches/${encodeURIComponent(batchId)}/cases/${encodeURIComponent(caseId)}/adjudication`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function getReliabilityExperiments() {
  return apiRequest<ReliabilityExperiment[]>("/api/v1/reliability/experiments");
}

export interface ReliabilityExperimentCreateRequest {
  name: string;
  dataset_id: string;
  dataset_version: string;
  case_selection?: string[];
  prompt_version: string;
  model_identifier: string;
  model_configuration: Record<string, unknown>;
  retrieval_configuration_version: string;
  source_snapshot_id?: string | null;
  evaluation_code_version: string;
  output_schema_version: string;
  normalization_version: string;
  repetitions_per_case: number;
}

export function createReliabilityExperiment(
  payload: ReliabilityExperimentCreateRequest,
) {
  return apiRequest<ReliabilityExperiment>("/api/v1/reliability/experiments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function validateReliabilityExperiment(experimentId: string) {
  return apiRequest<{ valid: boolean; errors: string[] }>(
    `/api/v1/reliability/experiments/${encodeURIComponent(experimentId)}/validate`,
    { method: "POST" },
  );
}

export function startReliabilityExperiment(experimentId: string) {
  return apiRequest<ReliabilityExperiment>(
    `/api/v1/reliability/experiments/${encodeURIComponent(experimentId)}/start`,
    { method: "POST" },
  );
}

export function getReliabilityAttempts(experimentId: string) {
  return apiRequest<ReliabilityAttempt[]>(
    `/api/v1/reliability/experiments/${encodeURIComponent(experimentId)}/attempts`,
  );
}

export function getReliabilityComparisons(experimentId: string) {
  return apiRequest<ReliabilityComparison[]>(
    `/api/v1/reliability/experiments/${encodeURIComponent(experimentId)}/comparisons`,
  );
}

export function getReliabilityReport(experimentId: string) {
  return apiRequest<ReliabilityReport>(
    `/api/v1/reliability/experiments/${encodeURIComponent(experimentId)}/report`,
  );
}

export function getThresholdMetricDefinitions() {
  return apiRequest<ThresholdMetricDefinition[]>(
    "/api/v1/threshold-governance/metric-definitions",
  );
}

export function getThresholdSets() {
  return apiRequest<ThresholdSet[]>("/api/v1/threshold-governance/threshold-sets");
}

export interface ThresholdSetCreateRequest {
  name: string;
  dataset_id: string;
  dataset_version: string;
  prompt_version: string;
  model_identifier: string;
  model_configuration: Record<string, unknown>;
  evaluation_code_version: string;
  proposal_rationale: string;
  items: Array<{
    metric_id: string;
    metric_definition_version: string;
    operator: string;
    threshold_value: number;
    unit: string;
    rationale: string;
    required: boolean;
  }>;
}

export function createThresholdSet(payload: ThresholdSetCreateRequest) {
  return apiRequest<ThresholdSet>("/api/v1/threshold-governance/threshold-sets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function proposeThresholdSet(thresholdSetId: string) {
  return apiRequest<ThresholdSet>(
    `/api/v1/threshold-governance/threshold-sets/${encodeURIComponent(thresholdSetId)}/propose`,
    { method: "POST" },
  );
}

export function decideThresholdSet(
  thresholdSetId: string,
  payload: { decision: "APPROVED" | "REJECTED"; rationale: string; policy_reference?: string },
) {
  return apiRequest<ThresholdApproval>(
    `/api/v1/threshold-governance/threshold-sets/${encodeURIComponent(thresholdSetId)}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function markNotificationRead(notificationId: string) {
  return apiRequest<Notification>(
    `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH" },
  );
}

export function getTeams(company: string) {
  const query = new URLSearchParams({ company });
  return apiRequest<TeamOption[]>(`/api/v1/profile/teams?${query.toString()}`);
}

export function getReportingManagers(
  company: string,
  role?: ProfileRole,
  team?: string,
) {
  const query = new URLSearchParams({ company });
  if (role) query.set("role", role);
  if (team) query.set("team", team);
  return apiRequest<ReportingManagerOption[]>(
    `/api/v1/profile/reporting-managers?${query.toString()}`,
  );
}

export function updateProfile(payload: {
  company: string;
  team: string | null;
  role: ProfileRole | null;
  reporting_manager_id: string | null;
}) {
  return apiRequest<UserProfile & {
    reporting_manager_options: ReportingManagerOption[];
  }>("/api/v1/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateDirectReportRole(userId: string, role: ProfileRole) {
  return apiRequest<DirectReportOption>(
    `/api/v1/profile/direct-reports/${encodeURIComponent(userId)}/role`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    },
  );
}

export function getCompanyRoles() {
  return apiRequest<CompanyRoleDefinition[]>("/api/v1/role-catalog/roles");
}

export function createCompanyRole(payload: CompanyRoleWriteRequest) {
  return apiRequest<CompanyRoleDefinition>("/api/v1/role-catalog/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateCompanyRole(
  roleId: string,
  payload: CompanyRoleWriteRequest,
) {
  return apiRequest<CompanyRoleDefinition>(
    `/api/v1/role-catalog/roles/${encodeURIComponent(roleId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function deleteCompanyRole(roleId: string) {
  return apiRequest<void>(
    `/api/v1/role-catalog/roles/${encodeURIComponent(roleId)}`,
    { method: "DELETE" },
  );
}

export function getCompanyRoleHistory() {
  return apiRequest<CompanyRoleHistoryEvent[]>("/api/v1/role-catalog/history");
}

export function getArchives() {
  return apiRequest<Archives>(`/api/v1/archives${userQuery()}`);
}

export function archiveEvidence(evidenceId: string) {
  return apiRequest<void>(
    `/api/v1/evidence/${encodeURIComponent(evidenceId)}/archive${userQuery()}`,
    { method: "POST" },
  );
}

export function deleteArchivedEvidence(evidenceId: string) {
  return apiRequest<void>(
    `/api/v1/evidence/${encodeURIComponent(evidenceId)}${userQuery()}`,
    { method: "DELETE" },
  );
}

export function archiveMilestone(goalId: string, milestoneId: string) {
  return apiRequest<void>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/milestones/${encodeURIComponent(milestoneId)}/archive${userQuery()}`,
    { method: "POST" },
  );
}

export function deleteArchivedMilestone(goalId: string, milestoneId: string) {
  return apiRequest<void>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/milestones/${encodeURIComponent(milestoneId)}${userQuery()}`,
    { method: "DELETE" },
  );
}

export function deleteArchivedGoal(goalId: string) {
  return apiRequest<void>(
    `/api/v1/goals/${encodeURIComponent(goalId)}${userQuery()}`,
    { method: "DELETE" },
  );
}

export function getGoal(goalId: string) {
  return apiRequest<Goal>(`/api/v1/goals/${encodeURIComponent(goalId)}${userQuery()}`);
}

export function getGoalStatusHistory(goalId: string) {
  return apiRequest<GoalStatusHistory[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/history${userQuery()}`,
  );
}

export function getGoalValidationHistory(goalId: string) {
  return apiRequest<GoalValidationRun[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/validation-history${userQuery()}`,
  );
}

export function validateGoal(goalId: string) {
  return apiRequest<GoalValidationRun>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/validate${userQuery()}`,
    { method: "POST" },
  );
}

export function getGoalEvidenceEligibility(goalId: string) {
  return apiRequest<GoalEvidenceEligibility>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/evidence-eligibility${userQuery()}`,
  );
}

export function getGoalMilestones(goalId: string) {
  return apiRequest<GoalMilestone[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/milestones${userQuery()}`,
  );
}

export function getGoalMilestoneSuggestions(goalId: string) {
  return apiRequest<GoalMilestoneSuggestion[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/milestones/suggestions${userQuery()}`,
    { method: "POST" },
  );
}

export function createGoalMilestone(payload: GoalMilestoneCreateRequest) {
  const { goalId, ...body } = payload;
  return apiRequest<GoalMilestone>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/milestones${userQuery()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export function updateGoalMilestone(
  goalId: string,
  milestoneId: string,
  payload: GoalMilestoneUpdateRequest,
) {
  return apiRequest<GoalMilestone>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/milestones/${encodeURIComponent(milestoneId)}${userQuery()}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function createGoal(payload: GoalCreateRequest) {
  return apiRequest<Goal>(`/api/v1/goals${userQuery()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateGoal(goalId: string, payload: GoalUpdateRequest) {
  return apiRequest<Goal>(`/api/v1/goals/${encodeURIComponent(goalId)}${userQuery()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getGoalAssessment(goalId: string) {
  return apiRequest<GoalAssessment>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/assessment${userQuery()}`,
  );
}

export function reanalyzeGoal(goalId: string) {
  return apiRequest<GoalAssessment>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/assessment/reanalyze${userQuery()}`,
    { method: "POST" },
  );
}

export function analyzeGoals(goalIds: string[]) {
  return apiRequest<GoalAssessmentBatch>(`/api/v1/goals/assessment-runs${userQuery()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal_ids: goalIds }),
  });
}

export function getGoalCriteria(goalId: string) {
  return apiRequest<GoalCriterion[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/criteria${userQuery()}`,
  );
}

export function generateGoalCriteria(goalId: string) {
  return apiRequest<GoalCriterion[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/criteria/generate${userQuery()}`,
    { method: "POST" },
  );
}

export function createGoalCriterion(goalId: string, request: GoalCriterionRequest) {
  return apiRequest<GoalCriterion>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/criteria${userQuery()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
}

export function updateGoalCriterion(
  goalId: string,
  criterionId: string,
  request: GoalCriterionRequest,
) {
  return apiRequest<GoalCriterion>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/criteria/${encodeURIComponent(criterionId)}${userQuery()}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
}

export function approveGoalCriterionVersion(
  goalId: string,
  criterionId: string,
  versionId: string,
) {
  return apiRequest<GoalCriterion>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/criteria/${encodeURIComponent(criterionId)}/versions/${encodeURIComponent(versionId)}/approve${userQuery()}`,
    { method: "POST" },
  );
}

export function retireGoalCriterion(goalId: string, criterionId: string) {
  return apiRequest<void>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/criteria/${encodeURIComponent(criterionId)}${userQuery()}`,
    { method: "DELETE" },
  );
}

export function submitGoalAssessmentFeedback(
  goalId: string,
  criterionId: string,
  assessmentId: string,
  request: GoalAssessmentFeedbackRequest,
) {
  return apiRequest<GoalAssessment>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/criteria/${encodeURIComponent(criterionId)}/assessments/${encodeURIComponent(assessmentId)}/feedback${userQuery()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
}

export function getGoalEvidence(goalId: string, userId?: string) {
  return apiRequest<GoalEvidence[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/evidence${userQuery(userId)}`,
  );
}

export function getGoalEvidenceContext(goalId: string, offset: number, limit = 50) {
  return apiRequest<GoalEvidenceContext>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/evidence-context${userQuery()}&limit=${limit}&offset=${offset}`,
  );
}

export function linkGoalEvidence(goalId: string, payload: {
  evidence_id: string;
  mapping_kind: "PRIMARY" | "CONTRIBUTION";
  contribution_description: string | null;
  relevance: "low" | "medium" | "high";
}) {
  return apiRequest<{ mapping_id: string; approval_status: EvidenceApprovalStatus }>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/evidence-links${userQuery()}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
}

export function createGoalEvidence(payload: GoalEvidenceCreateRequest) {
  const { goalId, ...body } = payload;
  return apiRequest<GoalEvidence>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/evidence${userQuery()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export function getSourceConnections() {
  return apiRequest<SourceConnection[]>(`/api/v1/integrations/connections${userQuery()}`);
}

export function getSourceAuthorizationUrl(provider: "github" | "jira", goalId: string) {
  return apiRequest<{ authorization_url: string }>(
    `/api/v1/integrations/${provider}/authorize${userQuery()}&goal_id=${encodeURIComponent(goalId)}`,
  );
}

export function disconnectSource(provider: "github" | "jira") {
  return apiRequest<void>(`/api/v1/integrations/${provider}${userQuery()}`, {
    method: "DELETE",
  });
}

export function discoverGoalEvidence(
  goalId: string,
  payload: EvidenceDiscoveryRequest,
) {
  return apiRequest<DiscoveredEvidence[]>(
    `/api/v1/integrations/goals/${encodeURIComponent(goalId)}/evidence-discovery${userQuery()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function getDocumentExpectations(documentId: string) {
  return apiRequest<DocumentExpectation[]>(
    `/api/v1/knowledge/documents/${encodeURIComponent(documentId)}/expectations${userQuery()}`,
  );
}

export function createEvidence(payload: EvidenceCreateRequest) {
  return apiRequest<EvidenceCreateResponse>("/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function uploadEvidenceFile(file: File) {
  const formData = new FormData();
  formData.append("user_id", getCurrentUserIdForApi());
  formData.append("file", file);
  return apiRequest<KnowledgeDocument>("/api/v1/knowledge/documents/evidence-files", {
    method: "POST",
    body: formData,
  });
}

export function getEvidenceFileUrl(documentId: string) {
  return `${API_BASE_URL}/api/v1/knowledge/documents/${encodeURIComponent(documentId)}/file${userQuery()}`;
}

export async function downloadEvidenceFile(url: string, title: string) {
  const file = await apiFileRequest(url);
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = title.replace(/[\\/:*?"<>|]/g, "_") || "evidence";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function createEvidenceMapping(payload: EvidenceMappingCreateRequest) {
  return apiRequest<{ id: string }>("/evidence-mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getGoalImpact(goalId: string, userId?: string) {
  return apiRequest<ImpactAssessment[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/impact${userQuery(userId)}`,
  );
}

export function getGoalInsight(goalId: string) {
  return apiRequest<GoalInsight>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/insight${userQuery()}`,
  );
}

export function importDocument(file: File, source = "file_import") {
  const formData = new FormData();
  formData.append("user_id", getCurrentUserIdForApi());
  formData.append("source", source);
  formData.append("file", file);
  return apiRequest<KnowledgeDocument>("/api/v1/documents/import", {
    method: "POST",
    body: formData,
  });
}

export type GoalImportResult = {
  imported_goals: Goal[];
  skipped_duplicates: Array<{ title: string; existing_goal_id: string }>;
};

export function importGoalsFromDocument(documentId: string) {
  return apiRequest<GoalImportResult>(
    `/api/v1/goals/import-from-document?document_id=${encodeURIComponent(documentId)}&user_id=${encodeURIComponent(getCurrentUserIdForApi())}`,
    { method: "POST" },
  );
}

export function approveGoal(goalId: string) {
  return apiRequest<Goal>(`/api/v1/goals/${encodeURIComponent(goalId)}/approve?user_id=${encodeURIComponent(getCurrentUserIdForApi())}`, { method: "POST" });
}

export function activateGoal(goalId: string) {
  return apiRequest<Goal>(`/api/v1/goals/${encodeURIComponent(goalId)}/activate?user_id=${encodeURIComponent(getCurrentUserIdForApi())}`, { method: "POST" });
}

export function completeGoal(goalId: string) {
  return apiRequest<Goal>(`/api/v1/goals/${encodeURIComponent(goalId)}/complete?user_id=${encodeURIComponent(getCurrentUserIdForApi())}`, { method: "POST" });
}

export function reopenGoal(goalId: string, reason: string) {
  return apiRequest<Goal>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/reopen?user_id=${encodeURIComponent(getCurrentUserIdForApi())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
  );
}

export function deactivateGoal(goalId: string, reason: string) {
  return apiRequest<Goal>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/deactivate?user_id=${encodeURIComponent(getCurrentUserIdForApi())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
  );
}

export function getKnowledgeDocuments() {
  return apiRequest<KnowledgeDocument[]>(`/api/v1/knowledge/documents${userQuery()}`);
}
