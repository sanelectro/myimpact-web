export type GoalStatus = "draft" | "approved" | "active" | "completed" | "archived";
export type GoalSubStatus = "needs_review" | "ready_for_approval" | "not_started" | "on_track" | "at_risk" | "off_track" | "completed" | "none";
export type GoalCategory = "personal" | "team" | "organization";
export type GoalScope = GoalCategory;
export type ProfileRole =
  | "Trainee Software Engineer"
  | "Junior Software Engineer"
  | "Software Engineer"
  | "Senior Software Engineer"
  | "Lead Software Engineer"
  | "Lead Software Architect"
  | "Engineering Manager"
  | "Senior Engineering Manager"
  | "Engineering Director";

export interface ReportingManagerOption {
  id: string;
  name: string;
  role: string;
}

export interface TeamOption {
  id: string;
  name: string;
}

export interface DirectReportOption {
  id: string;
  name: string;
  role: string | null;
}

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  company: string | null;
  organization_id: string | null;
  team: string | null;
  role: string | null;
  reporting_manager_id: string | null;
  reporting_manager: ReportingManagerOption | null;
  direct_reports: DirectReportOption[];
  direct_report_role_options: ProfileRole[];
}

export interface CompanyRoleResponsibility {
  id: string;
  statement: string;
  position: number;
}

export interface CompanyRoleGoal {
  id: string;
  title: string;
  description: string | null;
  position: number;
}

export interface CompanyRoleCompetency {
  id: string;
  name: string;
  expected_level: string | null;
  description: string | null;
  position: number;
}

export interface CompanyRoleDefinition {
  id: string;
  name: string;
  summary: string | null;
  responsibilities: CompanyRoleResponsibility[];
  goals: CompanyRoleGoal[];
  competencies: CompanyRoleCompetency[];
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyRoleWriteRequest {
  name: string;
  summary: string | null;
  responsibilities: Array<{ statement: string }>;
  goals: Array<{ title: string; description: string | null }>;
  competencies: Array<{
    name: string;
    expected_level: string | null;
    description: string | null;
  }>;
}

export interface CompanyRoleHistoryEvent {
  id: string;
  role_id: string;
  role_name: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  actor_user_id: string | null;
  actor_name: string;
  actor_role: string;
  before_snapshot: CompanyRoleDefinition | null;
  after_snapshot: CompanyRoleDefinition | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  is_active: boolean;
  invitation_pending: boolean;
}

export interface AdminCompany {
  id: string;
  name: string;
  user_count: number;
  created_at: string;
}

export interface AdminCompanyUpdateRequest {
  name: string;
}

export interface AssessmentCategoryCriterion {
  id: string;
  title: string;
  definition: GoalCriterionDefinition;
  created_at: string;
  created_by_user_id: string;
}

export interface AssessmentCategory {
  id: string;
  name: string;
  description: string | null;
  criteria: AssessmentCategoryCriterion[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserInvitationRequest {
  name: string;
  email: string;
  company: string;
  role: string | null;
}

export interface AdminUserInvitation extends AdminUserInvitationRequest {
  id: string;
  invite_token: string;
  expires_at: string;
}

export type ImpactType =
  | "technical"
  | "business"
  | "customer"
  | "reliability"
  | "performance"
  | "automation"
  | "leadership"
  | "mentoring"
  | "innovation"
  | "operational";

export type GoalLevel = "ANNUAL" | "QUARTERLY" | "MONTHLY" | "SPRINT";

export interface GoalHierarchySummary {
  id: string;
  title: string;
  goal_level: GoalLevel | null;
  status: GoalStatus;
  parent_goal_id: string | null;
  relationship_revision: number;
}

export interface GoalHierarchy {
  goal: GoalHierarchySummary;
  ancestors: GoalHierarchySummary[];
  next_ancestor_id: string | null;
}

export interface GoalRelationshipEvent {
  id: string;
  goal_id: string;
  old_parent_goal_id: string | null;
  new_parent_goal_id: string | null;
  actor_user_id: string;
  reason: string | null;
  relationship_revision: number;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  scope: GoalCategory;
  goal_level?: GoalLevel | null;
  organization_id: string | null;
  organization_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: GoalStatus;
  sub_status: GoalSubStatus;
  deactivation_reason: string | null;
  source: string | null;
  source_document_id: string | null;
  structured_fields: GoalStructuredFields | null;
  created_at: string;
  updated_at: string;
}

export interface GoalStructuredFields {
  goal_type: string | null;
  accountability: string | null;
  success_criteria: GoalCriterionDefinition[];
  deliverables: string[];
  outcome: string | null;
  impact: string | null;
  measurement: string | null;
  baseline: string | null;
  target: string | null;
  dependencies: string[];
  role_alignment: string | null;
  deferred_requirements?: GoalDeferredRequirement[];
}

export interface GoalDeferredRequirement {
  requirement: "baseline" | "target";
  reason: string;
  due_date: string | null;
  resolution_stage: string | null;
  state: "OPEN" | "RESOLVED" | "NOT_APPLICABLE";
  resolution_reason: string | null;
  related_child_goal_id: string | null;
}

export interface GoalRequirements {
  goal_version: number;
  evaluated_on: string;
  requirements: Array<{
    requirement: string;
    classification: "REQUIRED_NOW" | "DEFERRED_ALLOWED" | "NOT_APPLICABLE";
    state: "PRESENT" | "MISSING" | "DEFERRED" | "OVERDUE" | "NOT_APPLICABLE";
  }>;
  deferred_requirements: GoalDeferredRequirement[];
}

export interface GoalMeasures {
  goal_id: string;
  child_execution: { total: number; by_status: Partial<Record<GoalStatus, number>> };
  own_criterion_assessment: GoalAssessment | null;
  outcome_achievement: null;
  demonstrated_impact: null;
}

export type GoalValidationStatus = "READY" | "NEEDS_REFINEMENT" | "NEEDS_DISCUSSION" | "INVALID";
export type GoalValidationSeverity = "INFO" | "WARNING" | "ERROR";

export interface GoalValidationFinding {
  dimension: string;
  finding_code: string;
  severity: GoalValidationSeverity;
  validation_status: GoalValidationStatus;
  explanation: string;
  missing_info: string[];
  clarification_questions: string[];
  suggested_improvement: string | null;
  human_intervention_required: boolean;
}

export interface GoalValidationRun {
  id: string;
  goal_id: string;
  goal_version_id: string;
  goal_version: number;
  status: GoalValidationStatus;
  findings: GoalValidationFinding[];
  rule_set_version: string;
  prompt_version: string;
  model_provider: string | null;
  model_version: string | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface GoalEvidenceEligibility {
  eligible: boolean;
  reason: string;
  goal_status: GoalStatus;
  latest_version: number | null;
  latest_version_origin: string | null;
  legacy_compatibility: boolean;
  ready_validation_exists: boolean;
  approved_for_latest_version: boolean;
}

export interface GoalStatusHistory {
  id: string;
  goal_id: string;
  from_status: GoalStatus;
  to_status: GoalStatus;
  reason: string | null;
  changed_by_user_id: string | null;
  created_at: string;
}

export type GoalMilestoneStatus = "not_started" | "in_progress" | "completed" | "blocked";
export type GoalMilestoneSource = "ai" | "manual";

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  completion_criteria: string | null;
  status: GoalMilestoneStatus;
  source: GoalMilestoneSource;
  due_date: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalMilestoneCreateRequest {
  goalId: string;
  title: string;
  description: string | null;
  completion_criteria: string | null;
  status: GoalMilestoneStatus;
  due_date: string | null;
  source?: GoalMilestoneSource;
}

export type GoalMilestoneUpdateRequest = Partial<Omit<GoalMilestoneCreateRequest, "goalId" | "source">>;

export interface GoalMilestoneSuggestion {
  title: string;
  description: string;
  completion_criteria: string;
}


export interface GoalCreateRequest {
  title: string;
  description: string | null;
  scope: GoalScope;
  goal_level?: GoalLevel | null;
  start_date: string | null;
  end_date: string | null;
  source: string | null;
  structured_fields: GoalStructuredFields;
}

export type GoalUpdateRequest = Partial<GoalCreateRequest> & {
  expected_deferred_requirements?: GoalDeferredRequirement[];
};

export type GoalCriterionType = "BINARY" | "MILESTONE_BASED" | "MEASURABLE_TARGET";
export type GoalCriterionApprovalStatus = "PROPOSED" | "APPROVED";
export type GoalCriterionResult =
  | "NOT_ASSESSED"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "MET"
  | "NEEDS_REVIEW";
export type GoalAssessmentLifecycle = "CURRENT" | "STALE" | "OBSOLETE";
export type GoalAssessmentRunStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED";
export type GoalAssessmentFeedbackType = "CONFIRMED" | "CORRECTED" | "CHALLENGED";

export interface GoalCriterionMilestone {
  id: string;
  title: string;
  completion_conditions: string;
}

export interface GoalCriterionDefinition {
  criterion_type: GoalCriterionType;
  description: string;
  completion_conditions: string | null;
  milestones: GoalCriterionMilestone[];
  target_value: number | null;
  unit: string | null;
  evidence_suggestions: string[];
  assumptions_and_clarifications: string[];
}

export interface GoalCriterionVersion {
  id: string;
  criterion_id: string;
  version: number;
  definition: GoalCriterionDefinition;
  approval_status: GoalCriterionApprovalStatus;
  created_by_user_id: string;
  prompt_version: string | null;
  model_version: string | null;
  created_at: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
}

export interface GoalCriterion {
  id: string;
  goal_id: string;
  current_version: number | null;
  is_retired: boolean;
  created_at: string;
  updated_at: string;
  versions: GoalCriterionVersion[];
}

export interface GoalCriterionEvidence {
  id: string;
  evidence_mapping_id: string;
  evidence_id: string;
  title: string;
  source_url: string | null;
  captured_at: string;
  source_updated_at: string | null;
  review_state: string | null;
  source_validity: string;
  relationship_type: string;
  citation_excerpt: string | null;
}

export interface GoalCriterionAssessmentEvent {
  id: string;
  event_type: string;
  lifecycle_state: GoalAssessmentLifecycle | null;
  actor_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface GoalCriterionAssessment {
  id: string;
  run_id: string;
  criterion_id: string;
  criterion_version_id: string;
  criterion_version: number;
  result: GoalCriterionResult;
  lifecycle_state: GoalAssessmentLifecycle;
  progress_percentage: number | null;
  rationale: string;
  confidence: number;
  input_fingerprint: string;
  model_version: string | null;
  prompt_version: string;
  created_at: string;
  evidence: GoalCriterionEvidence[];
  events: GoalCriterionAssessmentEvent[];
}

export interface GoalCriterionSummary {
  criterion_id: string;
  criterion_version: number | null;
  result: GoalCriterionResult;
  lifecycle_state: GoalAssessmentLifecycle | null;
  progress_percentage: number | null;
  assessment: GoalCriterionAssessment | null;
}

export interface GoalAssessment {
  goal_id: string;
  run_id: string | null;
  run_status: GoalAssessmentRunStatus | null;
  run_error_message: string | null;
  criteria_count: number;
  assessed_criteria_count: number;
  criteria_met_count: number;
  criteria_met_percentage: number | null;
  goal_progress_percentage: number | null;
  evidence_coverage_percentage: number | null;
  average_confidence: number | null;
  criteria: GoalCriterionSummary[];
  source_retrieval_history: GoalSourceRetrieval[];
  updated_at: string | null;
}

export interface GoalSourceRetrieval {
  id: string;
  goal_id: string;
  run_id: string;
  provider: "github" | "jira";
  status: "SUCCESS" | "FAILURE";
  checked_at: string;
  failure_reason: string | null;
  used_snapshot: boolean;
  snapshot_captured_at: string | null;
  outcome: "COMPLETE" | "PARTIAL" | "NO_RESULTS" | "INACCESSIBLE" | "FAILED";
  error_category: string | null;
  attempted_at: string | null;
  last_verified_at: string | null;
  last_retrieved_at: string | null;
  retry_count: number;
  bounds: Record<string, unknown> | null;
  coverage: Record<string, unknown> | null;
}

export interface GoalAssessmentRun {
  id: string;
  batch_id: string | null;
  goal_id: string;
  status: GoalAssessmentRunStatus;
  trigger: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
}

export interface GoalAssessmentBatch {
  batch_id: string;
  runs: GoalAssessmentRun[];
}

export interface GoalAssessmentFeedbackRequest {
  feedback_type: GoalAssessmentFeedbackType;
  corrected_result?: GoalCriterionResult | null;
  comment?: string | null;
}

export interface GoalCriterionRequest {
  definition: GoalCriterionDefinition;
}

export interface GoalEvidence {
  evidence_id: string;
  approval_id?: string | null;
  approval_status?: EvidenceApprovalStatus | null;
  approval_comment?: string | null;
  milestone_id: string | null;
  title: string;
  description: string | null;
  source_type: string;
  source_url: string | null;
  captured_at: string;
  source_updated_at?: string | null;
  relevance: string;
  confidence: number;
  reason: string | null;
}

export interface GoalEvidenceOrigin {
  origin: "DIRECT" | "INHERITED";
  source_goal_id: string;
  goal_path: string[];
  mapping_id: string;
  mapping_kind: "PRIMARY" | "CONTRIBUTION";
  contribution_description: string | null;
  relevance: "low" | "medium" | "high";
  confidence: number;
  approval_status: EvidenceApprovalStatus | null;
}

export interface GoalEvidenceContext {
  items: Array<{
    evidence_id: string;
    title: string;
    description: string | null;
    source_type: string;
    source_url: string | null;
    captured_at: string;
    source_updated_at: string | null;
    origins: GoalEvidenceOrigin[];
  }>;
  has_more: boolean;
  next_offset: number | null;
  hierarchy_truncated: boolean;
}

export type EvidenceApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_information";

export interface PendingEvidenceApproval {
  approval_id: string;
  evidence_id: string;
  employee_id: string;
  employee_name: string;
  goal_id: string;
  goal_title: string;
  goal_description: string | null;
  goal_status: string;
  goal_start_date: string | null;
  goal_end_date: string | null;
  milestone_id: string | null;
  milestone_title: string | null;
  milestone_description: string | null;
  milestone_completion_criteria: string | null;
  milestone_status: string | null;
  milestone_due_date: string | null;
  evidence_title: string;
  evidence_description: string | null;
  evidence_source_type: string;
  evidence_source_url: string | null;
  evidence_captured_at: string;
  relevance: string;
  confidence: number;
  reason: string | null;
  submitted_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  related_path: string | null;
  status: "read" | "unread";
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  responses: NotificationResponseEntry[];
  history: NotificationHistoryEntry[];
}

export interface NotificationResponseEntry {
  id: string;
  user_id: string;
  response_text: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationHistoryEntry {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HumanReviewBatch {
  id: string;
  dataset_id: string;
  dataset_version: string;
  status: string;
  expected_case_count: number;
  review_mode: "SINGLE_REVIEWER" | "DUAL_ADJUDICATED";
  started_at: string;
  completed_at: string | null;
}

export interface HumanReviewCaseSummary {
  case_id: string;
  category: string | null;
  status: string;
  submitted_by_current_user: boolean;
  has_draft: boolean;
  assigned_at: string | null;
  last_reviewed_at: string | null;
}

export interface HumanReviewSubmission {
  id: string;
  case_id: string;
  reviewer_user_id: string;
  label: string;
  rationale: string;
  submitted_at: string;
  updated_at: string | null;
  is_final: boolean;
  review_stage: "BLIND" | "POST_AI" | "PROPOSAL_ASSISTED";
  ai_attempt_id: string | null;
  reference_proposal_id: string | null;
  confidence: number | null;
  context_notes: string | null;
  evidence_findings: Array<Record<string, unknown>> | null;
}

export interface HumanReviewBatchPreview {
  batch: HumanReviewBatch;
  total_cases: number;
  saved_cases: number;
  can_finalize: boolean;
  is_final: boolean;
  preview_token: string;
  reviews: Array<{
    case: Record<string, unknown> | null;
    review: HumanReviewSubmission;
  }>;
}

export interface HumanReviewCase {
  case: Record<string, unknown>;
  status: string;
  own_review: HumanReviewSubmission | null;
  post_ai_review: HumanReviewSubmission | null;
  post_ai_draft: HumanReviewSubmission | null;
  reviews: HumanReviewSubmission[];
  ai_assessment: HumanReviewAIAssessment | null;
  reference_proposal: HumanReviewReferenceProposal | null;
}

export interface HumanReviewReferenceProposal {
  id: string;
  source_document: string;
  proposed_label: string;
  rationale: string;
  confidence: string | null;
  review_flags: string[];
  requires_owner_attention: boolean;
  status: string;
}

export interface HumanReviewAIAssessment {
  attempt_id: string;
  model_identifier: string;
  assessment_label: string;
  rationale: string | null;
  confidence: number | null;
  supporting_mapping_ids: string[];
  contradictory_mapping_ids: string[];
  limitations: string[];
  abstained: boolean;
  structured_status: string;
}

export interface HumanReviewAdjudicationCase {
  case: Record<string, unknown> | null;
  status: string;
  reviews: HumanReviewSubmission[];
}

export interface HumanReviewProgress {
  batch: HumanReviewBatch;
  total_cases: number;
  awaiting_first_review: number;
  awaiting_second_review: number;
  reviewed: number;
  agreed: number;
  disagreement: number;
  adjudicated: number;
  category_progress: Array<{
    category: string;
    total_cases: number;
    evaluated_cases: number;
    reviewed_cases: number;
    agreed_cases: number;
    disagreement_cases: number;
    adjudicated_cases: number;
    last_reviewed_at: string | null;
  }>;
  evaluation: {
    status: string;
    experiment_id: string | null;
    started_at: string | null;
    finished_at: string | null;
    evaluated_case_count: number;
    attempt_count: number;
  };
}

export interface ReliabilityExperiment {
  id: string;
  name: string;
  dataset_id: string;
  dataset_version: string;
  case_selection: string[];
  repetitions_per_case: number;
  status: string;
  planned_attempts: number;
  completed_attempts: number;
  failed_attempts: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface ReliabilityAttempt {
  id: string;
  case_id: string;
  sequence: number;
  status: string;
  schema_valid: boolean;
  raw_output: Record<string, unknown> | null;
  normalized_output: Record<string, unknown> | null;
  error_category: string | null;
  error_detail: string | null;
}

export interface ReliabilityComparison {
  id: string;
  case_id: string;
  status: string;
  metrics: Record<string, Record<string, unknown>>;
  exact_output_consistent: boolean | null;
  difference_categories: string[];
  differences: Array<Record<string, unknown>>;
  exclusion_reasons: string[];
}

export interface ReliabilityReport {
  id: string;
  report_version: string;
  threshold_result: "PASS" | "FAIL" | "NOT_EVALUABLE";
  metrics: Record<string, Record<string, unknown>>;
  coverage: Record<string, number>;
  divergent_case_ids: string[];
  limitations: string[];
  generated_at: string;
  benchmark?: {
    dataset_id?: string;
    dataset_version?: string;
    label_status?: string;
    human_review_status?: string;
    threshold_approval_status?: string;
    case_count?: number;
    categories?: string[];
    category_breakdown?: Record<string, {
      cases: number;
      complete: number;
      divergent: number;
    }>;
    metrics?: Record<string, {
      value: number | null;
      numerator: number;
      denominator: number;
      status: string;
      reason: string;
    }>;
    baseline_dataset_id?: string;
    minimum_sample_policy?: string;
  };
}

export interface ThresholdMetricDefinition {
  metric_id: string;
  definition_version: string;
  name: string;
  description: string;
  unit: string;
  direction: string;
  numerator_definition: string;
  denominator_definition: string;
  zero_denominator_behavior: string;
  inclusion_rules: string;
  exclusion_rules: string;
  required_inputs: string[];
  limitations: string;
  calculation_version: string;
}

export interface ThresholdItem {
  metric_id: string;
  metric_definition_version: string;
  operator: string;
  threshold_value: number;
  unit: string;
  rationale: string;
  required: boolean;
}

export interface ThresholdApproval {
  decision: "APPROVED" | "REJECTED";
  approver_user_id: string;
  decided_at: string;
  rationale: string;
  policy_reference: string | null;
}

export interface ThresholdSet {
  id: string;
  version: number;
  name: string;
  status: "DRAFT" | "PROPOSED" | "APPROVED" | "REJECTED" | "SUPERSEDED" | "REVOKED";
  dataset_id: string;
  dataset_version: string;
  prompt_version: string;
  model_identifier: string;
  model_configuration: Record<string, unknown>;
  evaluation_code_version: string;
  created_by_user_id: string;
  created_at: string;
  proposal_rationale: string;
  items: ThresholdItem[];
  approvals: ThresholdApproval[];
}

export type EvidenceSourceType =
  | "jira"
  | "github"
  | "confluence"
  | "workday"
  | "personal"
  | "document"
  | "other";

export interface DocumentExpectation {
  id: string;
  document_id: string;
  category: string;
  description: string;
  evidence_hints: string[];
  source_page: number | null;
  source_section: string | null;
  source_text_span: string | null;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface EvidenceCreateRequest {
  user_id: string;
  source_type: EvidenceSourceType;
  source_id: string | null;
  title: string;
  description: string | null;
  source_url: string | null;
  captured_at: string;
  source_updated_at?: string | null;
}

export interface EvidenceCreateResponse {
  id: string;
}

export interface EvidenceMappingCreateRequest {
  evidence_id: string;
  goal_id: string;
  relevance: "low" | "medium" | "high";
  confidence: number;
  reason: string | null;
}

export interface GoalEvidenceCreateRequest {
  goalId: string;
  milestone_id: string | null;
  source_type: EvidenceSourceType;
  source_id: string | null;
  content_hash: string | null;
  title: string;
  description: string | null;
  source_url: string | null;
  captured_at: string;
  source_updated_at?: string | null;
  relevance: "low" | "medium" | "high";
}

export interface SourceConnection {
  provider: "github" | "jira";
  connected: boolean;
  account: string;
  managed_locally: boolean;
}

export interface EvidenceDiscoveryRequest {
  start_date: string;
  end_date: string;
  sources: Array<"github" | "jira">;
  milestone_id: string | null;
}

export interface DiscoveredEvidence {
  id: string;
  source_type: "github" | "jira";
  source_id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  captured_at: string;
  source_updated_at: string | null;
  summary: string;
  relevance: "high" | "medium" | "low";
  repository: string | null;
  status: string | null;
  issue_type: string | null;
  jira_keys: string[];
}

export interface ImpactAssessment {
  id: string;
  evidence_id: string;
  goal_id: string;
  impact_type: ImpactType;
  impact_summary: string;
  impact_score: number;
  confidence: number;
  assessment_version: number;
  created_at: string;
  updated_at: string;
}

export interface GoalInsight {
  goal_id: string;
  headline: string;
  summary: string;
  impact_types: ImpactType[];
  supporting_assessment_ids: string[];
  confidence: number;
}

export interface GoalReport {
  goal_id: string;
  goal_title: string;
  generated_at: string;
  headline: string;
  summary: string;
  impact_types: ImpactType[];
  supporting_assessment_ids: string[];
  confidence: number;
  impact_assessment_count: number;
}

export interface KnowledgeDocument {
  id: string;
  file_name: string;
  content_type: string;
  document_type: string;
  scope_type: string;
  scope_id: string | null;
  status: string;
  classification_type: string | null;
  classification_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArchivedEvidence {
  id: string;
  title: string;
  description: string | null;
  source_type: string;
  source_url: string | null;
  captured_at: string;
  archived_at: string;
  goal_titles: string[];
}

export interface ArchivedMilestone {
  id: string;
  goal_id: string;
  goal_title: string;
  title: string;
  description: string | null;
  completion_criteria: string | null;
  status: GoalMilestoneStatus;
  source: GoalMilestoneSource;
  due_date: string | null;
  archived_at: string;
}

export interface Archives {
  goals: Goal[];
  evidence: ArchivedEvidence[];
  milestones: ArchivedMilestone[];
}
