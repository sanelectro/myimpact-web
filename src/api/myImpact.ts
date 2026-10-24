import {
  getCurrentUserIdForApi,
  apiFileRequest,
  apiRequest,
  authRequest,
} from "./client";
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
  PendingEvidenceApproval,
  Notification,
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

export function getUserGoals(userId: string) {
  return apiRequest<Goal[]>(`/api/v1/goals${userQuery(userId)}`);
}

export function getAllCompanyUsers() {
  return apiRequest<AdminUser[]>("/api/v1/admin/users");
}

export function getAdminCompanies() {
  return apiRequest<AdminCompany[]>("/api/v1/admin/companies");
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

export function getGoalEvidence(goalId: string, userId?: string) {
  return apiRequest<GoalEvidence[]>(
    `/api/v1/goals/${encodeURIComponent(goalId)}/evidence${userQuery(userId)}`,
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
