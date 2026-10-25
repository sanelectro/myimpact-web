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

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  scope: GoalCategory;
  organization_id: string | null;
  organization_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: GoalStatus;
  sub_status: GoalSubStatus;
  deactivation_reason: string | null;
  source: string | null;
  source_document_id: string | null;
  created_at: string;
  updated_at: string;
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
  start_date: string | null;
  end_date: string | null;
  source: string | null;
}

export type GoalUpdateRequest = Partial<GoalCreateRequest>;

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
