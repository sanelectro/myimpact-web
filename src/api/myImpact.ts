import { getCurrentUserIdForApi, apiRequest } from "./client";
import type {
  Goal,
  GoalStatusHistory,
  GoalEvidence,
  GoalInsight,
  ImpactAssessment,
  KnowledgeDocument,
  GoalAssessment,
  GoalCreateRequest,
  GoalUpdateRequest,
  DocumentExpectation,
  EvidenceCreateRequest,
  EvidenceCreateResponse,
  EvidenceMappingCreateRequest,
  GoalEvidenceCreateRequest,
  GoalMilestone,
  GoalMilestoneCreateRequest,
  GoalMilestoneUpdateRequest,
  Archives,
} from "../types/api";

function userQuery() {
  return `?user_id=${encodeURIComponent(getCurrentUserIdForApi())}`;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export function getGoals() {
  return apiRequest<Goal[]>(`/api/v1/goals${userQuery()}`);
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

export function getGoalMilestones(goalId: string) {
  return apiRequest<GoalMilestone[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/milestones${userQuery()}`,
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

export function getGoalEvidence(goalId: string) {
  return apiRequest<GoalEvidence[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/evidence${userQuery()}`,
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

export function createEvidenceMapping(payload: EvidenceMappingCreateRequest) {
  return apiRequest<{ id: string }>("/evidence-mappings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getGoalImpact(goalId: string) {
  return apiRequest<ImpactAssessment[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/impact${userQuery()}`,
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
