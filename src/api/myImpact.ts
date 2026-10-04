import { apiRequest, MYIMPACT_USER_ID } from "./client";
import type {
  Goal,
  GoalEvidence,
  GoalInsight,
  ImpactAssessment,
  KnowledgeDocument,
} from "../types/api";

const userQuery = `?user_id=${encodeURIComponent(MYIMPACT_USER_ID)}`;

export function getGoals() {
  return apiRequest<Goal[]>(`/api/v1/goals${userQuery}`);
}

export function getGoalEvidence(goalId: string) {
  return apiRequest<GoalEvidence[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/evidence${userQuery}`,
  );
}

export function getGoalImpact(goalId: string) {
  return apiRequest<ImpactAssessment[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/impact${userQuery}`,
  );
}

export function getGoalInsight(goalId: string) {
  return apiRequest<GoalInsight>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/insight${userQuery}`,
  );
}

export function getKnowledgeDocuments() {
  return apiRequest<KnowledgeDocument[]>(`/api/v1/knowledge/documents${userQuery}`);
}
