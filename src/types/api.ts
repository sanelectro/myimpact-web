export type GoalStatus = "draft" | "active" | "completed" | "archived";
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
  source: string | null;
  created_at: string;
  updated_at: string;
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
  captured_at: string;
  relevance: string;
  confidence: number;
  reason: string | null;
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
