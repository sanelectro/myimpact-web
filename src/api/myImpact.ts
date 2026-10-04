import { apiRequest, MYIMPACT_USER_ID } from "./client";
import type {
  Goal,
  GoalEvidence,
  GoalInsight,
  ImpactAssessment,
  KnowledgeDocument,
  GoalAssessment,
  GoalCreateRequest,
  GoalUpdateRequest,
} from "../types/api";

const userQuery = `?user_id=${encodeURIComponent(MYIMPACT_USER_ID)}`;

export function getGoals() {
  return apiRequest<Goal[]>(`/api/v1/goals${userQuery}`);
}


export function getGoal(goalId: string) {
  return apiRequest<Goal>(`/api/v1/goals/${encodeURIComponent(goalId)}${userQuery}`);
}

export function createGoal(payload: GoalCreateRequest) {
  return apiRequest<Goal>(`/api/v1/goals${userQuery}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateGoal(goalId: string, payload: GoalUpdateRequest) {
  return apiRequest<Goal>(`/api/v1/goals/${encodeURIComponent(goalId)}${userQuery}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getGoalAssessment(goalId: string) {
  return apiRequest<GoalAssessment>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/assessment${userQuery}`,
  );
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
