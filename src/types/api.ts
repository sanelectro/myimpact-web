export type GoalStatus = "draft" | "approved" | "active" | "completed" | "archived";
export type GoalSubStatus = "needs_review" | "ready_for_approval" | "not_started" | "on_track" | "at_risk" | "off_track" | "completed" | "none";
export type GoalScope = "personal" | "team" | "organization";

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
  scope: GoalScope;
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

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  completion_criteria: string | null;
  status: GoalMilestoneStatus;
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
}

export type GoalMilestoneUpdateRequest = Partial<Omit<GoalMilestoneCreateRequest, "goalId">>;


export interface GoalCreateRequest {
  title: string;
  description: string | null;
  scope: GoalScope;
  start_date: string | null;
  end_date: string | null;
  source: string | null;
}

export type GoalUpdateRequest = Partial<GoalCreateRequest>;

export type GoalExpectationStatus = "not_started" | "in_progress" | "met" | "above";

export interface GoalAssessment {
  goal_id: string;
  expected_achievement_count: number;
  achievement_count: number;
  evidence_count: number;
  demonstrated_impact_count: number;
  qualifying_achievement_count: number;
  progress_percentage: number;
  status: GoalExpectationStatus;
  description: string;
}

export interface GoalEvidence {
  evidence_id: string;
  title: string;
  description: string | null;
  source_type: string;
  source_url: string | null;
  captured_at: string;
  relevance: string;
  confidence: number;
  reason: string | null;
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
  source_type: EvidenceSourceType;
  source_id: string | null;
  content_hash: string | null;
  title: string;
  description: string | null;
  source_url: string | null;
  captured_at: string;
  relevance: "low" | "medium" | "high";
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
  due_date: string | null;
  archived_at: string;
}

export interface Archives {
  goals: Goal[];
  evidence: ArchivedEvidence[];
  milestones: ArchivedMilestone[];
}
