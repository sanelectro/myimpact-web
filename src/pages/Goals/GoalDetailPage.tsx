import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getGoal,
  getGoalStatusHistory,
  getGoalEvidence,
  getGoalMilestones,
  getDocumentExpectations,
  getGoalImpact,
  getGoalInsight,
  createGoalEvidence,
  resubmitEvidence,
  getEvidenceFileUrl,
  downloadEvidenceFile,
  uploadEvidenceFile,
  approveGoal,
  activateGoal,
  completeGoal,
  reopenGoal,
  deactivateGoal,
  archiveEvidence,
  discoverGoalEvidence,
  disconnectSource,
  getSourceAuthorizationUrl,
  getSourceConnections,
} from "../../api/myImpact";
import type {
  DocumentExpectation,
  GoalEvidence,
  GoalMilestone,
  ImpactAssessment,
  KnowledgeDocument,
  DiscoveredEvidence,
  SourceConnection,
} from "../../types/api";
import GoalMilestones from "../../components/Milestones/GoalMilestones";
import GoalCriteriaAssessment from "../../components/Goals/GoalCriteriaAssessment";
import "./GoalDetail.css";

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatImpactType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatScope(scope: string) {
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

function formatGoalStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatSubStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

type GoalTransition =
  | { action: "approve" | "activate" | "complete" }
  | { action: "reopen"; reason: string };

export default function GoalDetailPage() {
  const { goalId } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showDeactivationForm, setShowDeactivationForm] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [deactivationReason, setDeactivationReason] = useState("");
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceSourceMode, setEvidenceSourceMode] = useState<"link" | "file">("link");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploadedEvidenceDocument, setUploadedEvidenceDocument] = useState<KnowledgeDocument | null>(null);
  const [fileDownloadError, setFileDownloadError] = useState("");
  const [resubmissionApprovalId, setResubmissionApprovalId] = useState<string | null>(null);
  const [resubmissionTitle, setResubmissionTitle] = useState("");
  const [resubmissionDescription, setResubmissionDescription] = useState("");
  const [resubmissionUrl, setResubmissionUrl] = useState("");
  const [resubmissionNotes, setResubmissionNotes] = useState("");
  const [evidenceRelevance, setEvidenceRelevance] = useState<"low" | "medium" | "high">("medium");
  const [evidenceMilestoneId, setEvidenceMilestoneId] = useState("");
  const [evidenceEntryMode, setEvidenceEntryMode] = useState<"ai" | "manual">("ai");
  const [discoveryStartDate, setDiscoveryStartDate] = useState(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 6);
    return dateInputValue(date);
  });
  const [discoveryEndDate, setDiscoveryEndDate] = useState(() => dateInputValue(new Date()));
  const [discoverySources, setDiscoverySources] = useState<Array<"github" | "jira">>([
    "github",
    "jira",
  ]);
  const [selectedDiscoveredEvidence, setSelectedDiscoveredEvidence] = useState<Set<string>>(
    new Set(),
  );
  const [discoverySaveError, setDiscoverySaveError] = useState("");
  useEffect(() => {
    if (searchParams.get("evidence") === "manual") {
      setShowEvidenceForm(true);
      setEvidenceEntryMode("manual");
    }
  }, [searchParams]);
  const goal = useQuery({
    queryKey: ["goal", goalId],
    queryFn: () => getGoal(goalId!),
    enabled: Boolean(goalId),
  });
  const statusHistory = useQuery({
    queryKey: ["goal-status-history", goalId],
    queryFn: () => getGoalStatusHistory(goalId!),
    enabled: Boolean(goalId),
  });

  const transitionMutation = useMutation({
    mutationFn: async (transition: GoalTransition) => {
      const { action } = transition;
      if (action === "approve") return approveGoal(goalId!);
      if (action === "activate") return activateGoal(goalId!);
      if (action === "complete") return completeGoal(goalId!);
      if (transition.action === "reopen") return reopenGoal(goalId!, transition.reason);
      throw new Error("Unsupported goal status transition.");
    },
    onSuccess: async (updated) => {
      setShowCompletionConfirm(false);
      setShowReopenForm(false);
      setReopenReason("");
      await queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
      await queryClient.invalidateQueries({ queryKey: ["goal-status-history", goalId] });
      queryClient.setQueryData(["goal", goalId], updated);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (reason: string) => deactivateGoal(goalId!, reason),
    onSuccess: async (updated) => {
      setShowDeactivationForm(false);
      setDeactivationReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goal", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
        queryClient.invalidateQueries({ queryKey: ["archives"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-status-history", goalId] }),
      ]);
      queryClient.setQueryData(["goal", goalId], updated);
    },
  });

  const archiveEvidenceMutation = useMutation({
    mutationFn: archiveEvidence,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goal-evidence", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-assessment", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-impact", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-insight", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["archives"] }),
      ]);
    },
  });

  const resubmitEvidenceMutation = useMutation({
    mutationFn: ({
      approvalId,
      title,
      description,
      sourceUrl,
      notes,
    }: {
      approvalId: string;
      title: string;
      description: string;
      sourceUrl: string;
      notes: string;
    }) =>
      resubmitEvidence(approvalId, {
        title: title.trim(),
        description: description.trim() || null,
        source_url: sourceUrl.trim() || null,
        notes: notes.trim(),
      }),
    onSuccess: async () => {
      setResubmissionApprovalId(null);
      setResubmissionNotes("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goal-evidence", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-assessment", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-impact", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-insight", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["pending-evidence-approvals"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });

  async function handleEvidenceFileDownload(url: string, title: string) {
    setFileDownloadError("");
    try {
      await downloadEvidenceFile(url, title);
    } catch (error) {
      setFileDownloadError(
        error instanceof Error ? error.message : "Could not download the attached file.",
      );
    }
  }

  const evidence = useQuery({
    queryKey: ["goal-evidence", goalId],
    queryFn: () => getGoalEvidence(goalId!),
    enabled: Boolean(goalId),
  });
  const milestones = useQuery({
    queryKey: ["goal-milestones", goalId],
    queryFn: () => getGoalMilestones(goalId!),
    enabled: Boolean(goalId),
  });
  const sourceConnections = useQuery({
    queryKey: ["source-connections"],
    queryFn: getSourceConnections,
    enabled: showEvidenceForm,
  });

  const connectSourceMutation = useMutation({
    mutationFn: (provider: "github" | "jira") =>
      getSourceAuthorizationUrl(provider, goalId!),
    onSuccess: ({ authorization_url }) => window.location.assign(authorization_url),
  });

  const disconnectSourceMutation = useMutation({
    mutationFn: disconnectSource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-connections"] });
    },
  });

  const evidenceDiscoveryMutation = useMutation({
    mutationFn: () =>
      discoverGoalEvidence(goalId!, {
        start_date: discoveryStartDate,
        end_date: discoveryEndDate,
        sources: discoverySources,
        milestone_id: evidenceMilestoneId || null,
      }),
    onSuccess: () => {
      setSelectedDiscoveredEvidence(new Set());
      setDiscoverySaveError("");
    },
  });

  const saveDiscoveredEvidenceMutation = useMutation({
    mutationFn: async () => {
      const selected = (evidenceDiscoveryMutation.data ?? []).filter((item) =>
        selectedDiscoveredEvidence.has(item.id),
      );
      const saved: string[] = [];
      const failures: string[] = [];
      for (const item of selected) {
        try {
          await createGoalEvidence({
            goalId: goalId!,
            source_type: item.source_type,
            source_id: item.source_id,
            content_hash: null,
            title: item.title,
            description: item.summary,
            source_url: item.source_url,
            captured_at: item.captured_at,
            source_updated_at: item.source_updated_at,
            relevance: item.relevance,
            milestone_id: evidenceMilestoneId || null,
          });
          saved.push(item.id);
        } catch (error) {
          failures.push(
            `${item.title}: ${error instanceof Error ? error.message : "Could not save evidence."}`,
          );
        }
      }
      return { saved, failures };
    },
    onSuccess: async ({ saved, failures }) => {
      setSelectedDiscoveredEvidence((previous) => {
        const remaining = new Set(previous);
        saved.forEach((id) => remaining.delete(id));
        return remaining;
      });
      setDiscoverySaveError(failures.join(" "));
      if (saved.length) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["goal-evidence", goalId] }),
          queryClient.invalidateQueries({ queryKey: ["goal-assessment", goalId] }),
          queryClient.invalidateQueries({ queryKey: ["goal-impact", goalId] }),
          queryClient.invalidateQueries({ queryKey: ["goal-insight", goalId] }),
        ]);
      }
    },
  });

  const requirements = useQuery({
    queryKey: ["goal-source-expectations", goal.data?.source_document_id],
    queryFn: () => getDocumentExpectations(goal.data!.source_document_id!),
    enabled: Boolean(goal.data?.source_document_id),
  });

  const addEvidenceMutation = useMutation({
    mutationFn: async () => {
      let sourceType: "personal" | "other" | "document" = evidenceUrl.trim() ? "other" : "personal";
      let sourceId: string | null = null;
      let sourceUrl = evidenceUrl.trim() || null;

      if (evidenceSourceMode === "file") {
        if (evidenceFile && evidenceFile.size > 10 * 1024 * 1024) {
          throw new Error("Files must be 10 MB or smaller.");
        }
        const document = uploadedEvidenceDocument ??
          (evidenceFile ? await uploadEvidenceFile(evidenceFile) : null);
        if (!document) {
          throw new Error("Choose a PDF or image file to upload.");
        }
        setUploadedEvidenceDocument(document);
        sourceType = "document";
        sourceId = document.id;
        sourceUrl = getEvidenceFileUrl(document.id);
      }

      return createGoalEvidence({
        goalId: goalId!,
        source_type: sourceType,
        source_id: sourceId,
        content_hash: null,
        title: evidenceTitle.trim(),
        description: evidenceDescription.trim() || null,
        source_url: sourceUrl,
        captured_at: new Date().toISOString(),
        relevance: evidenceRelevance,
        milestone_id: evidenceMilestoneId || null,
      });
    },
    onSuccess: async () => {
      setEvidenceTitle("");
      setEvidenceDescription("");
      setEvidenceUrl("");
      setEvidenceSourceMode("link");
      setEvidenceFile(null);
      setUploadedEvidenceDocument(null);
      setEvidenceRelevance("medium");
      setEvidenceMilestoneId("");
      setShowEvidenceForm(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["goal-evidence", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-assessment", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-impact", goalId] }),
        queryClient.invalidateQueries({ queryKey: ["goal-insight", goalId] }),
      ]);
    },
  });

  const impact = useQuery({
    queryKey: ["goal-impact", goalId],
    queryFn: () => getGoalImpact(goalId!),
    enabled: Boolean(goalId),
  });

  const insight = useQuery({
    queryKey: ["goal-insight", goalId],
    queryFn: () => getGoalInsight(goalId!),
    enabled: Boolean(goalId && impact.data?.length),
  });

  if (goal.isLoading) return <p>Loading goal…</p>;
  if (goal.isError || !goal.data) {
    return (
      <p>
        Goal not found. <Link to="/goals">Back to goals</Link>
      </p>
    );
  }

  const goalData = goal.data;
  const evidenceItems = evidence.data ?? [];
  const impactItems = impact.data ?? [];
  const impactByEvidence = new Map<string, ImpactAssessment>();
  impactItems.forEach((item) => impactByEvidence.set(item.evidence_id, item));

  const sourceConnected = (provider: SourceConnection["provider"]) =>
      sourceConnections.data?.some(
        (connection) => connection.provider === provider && connection.connected,
      ) ?? false;
  const selectedSourcesConnected =
      discoverySources.length > 0 &&
      discoverySources.every((provider) => sourceConnected(provider));

  return (
    <div className="goal-detail-page">
      <Link className="back-link goal-detail-back" to="/goals">
        ← All goals
      </Link>

      <header className="goal-detail-hero">
        <div className="goal-detail-meta-label">
          GOAL DETAIL <span>·</span> {formatScope(goalData.scope).toUpperCase()}
        </div>
        <div className="goal-detail-hero-row">
          <div className="goal-detail-title-block">
            <h1>{goalData.title}</h1>
            {goalData.description && <p>{goalData.description}</p>}
          </div>
          <div className="goal-detail-actions">
            <span className={`goal-detail-lifecycle goal-detail-lifecycle-${goalData.status}`}>
              {formatGoalStatus(goalData.status)}
            </span>
            {goalData.sub_status !== goalData.status && goalData.sub_status !== "none" && (
              <span className="goal-detail-lifecycle goal-detail-substatus">
                {formatSubStatus(goalData.sub_status)}
              </span>
            )}
            <Link className="goal-edit-button" to={`/goals/${goalData.id}/edit`}>
              Edit goal
            </Link>
            {goalData.status === "draft" && (
              <button className="goal-edit-button" type="button" disabled={transitionMutation.isPending} onClick={() => transitionMutation.mutate({ action: "approve" })}>
                Approve goal
              </button>
            )}
            {goalData.status === "completed" && (
              <button
                className="goal-edit-button"
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => {
                  transitionMutation.reset();
                  setShowReopenForm(true);
                }}
              >
                Reopen goal
              </button>
            )}
            {goalData.status === "approved" && (
              <button className="goal-edit-button" type="button" disabled={transitionMutation.isPending} onClick={() => transitionMutation.mutate({ action: "activate" })}>
                Activate goal
              </button>
            )}
            {goalData.status === "active" && (
              <button
                className="goal-edit-button goal-complete-button"
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => {
                  transitionMutation.reset();
                  setShowCompletionConfirm(true);
                }}
              >
                Mark completed
              </button>
            )}
            {goalData.status !== "archived" && (
              <button
                className="goal-edit-button goal-deactivate-button"
                type="button"
                onClick={() => setShowDeactivationForm(true)}
              >
                Archive goal
              </button>
            )}
          </div>
        </div>
      </header>

      {transitionMutation.isError && (
        <p className="form-error" role="alert">
          Could not update goal status: {transitionMutation.error instanceof Error ? transitionMutation.error.message : "Unknown error"}
        </p>
      )}
      {searchParams.get("source_connected") && (
        <p className="form-success" role="status">
          {searchParams.get("source_connected") === "github" ? "GitHub" : "Jira"} connected. You can now discover evidence from it.
        </p>
      )}
      {searchParams.get("source_error") && (
        <p className="form-error" role="alert">
          Could not connect {searchParams.get("source_error") === "github" ? "GitHub" : "Jira"}. Check the provider authorization and try again.
        </p>
      )}

      {showCompletionConfirm && goalData.status === "active" && (
        <section className="goal-detail-card goal-completion-panel">
          <h2>Mark this goal as completed?</h2>
          <p>This updates the goal’s lifecycle status. Its evidence and progress assessment will remain available.</p>
          <div className="goal-deactivation-actions">
            <button
              className="goal-edit-button"
              type="button"
              disabled={transitionMutation.isPending}
              onClick={() => setShowCompletionConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="goal-edit-button goal-completion-confirm"
              type="button"
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate({ action: "complete" })}
            >
              {transitionMutation.isPending ? "Completing…" : "Confirm completion"}
            </button>
          </div>
        </section>
      )}

      {showReopenForm && goalData.status === "completed" && (
        <section className="goal-detail-card goal-completion-panel">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const reason = reopenReason.trim();
              if (reason) transitionMutation.mutate({ action: "reopen", reason });
            }}
          >
            <h2>Reopen this goal?</h2>
            <p>The goal will return to Active. Provide a reason so the change is recorded in its history.</p>
            <label htmlFor="goal-reopen-reason">Reason for reopening</label>
            <textarea
              id="goal-reopen-reason"
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              maxLength={1000}
              rows={3}
              required
            />
            <div className="goal-deactivation-actions">
              <button
                className="goal-edit-button"
                type="button"
                disabled={transitionMutation.isPending}
                onClick={() => {
                  setShowReopenForm(false);
                  setReopenReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="goal-edit-button goal-completion-confirm"
                type="submit"
                disabled={transitionMutation.isPending || !reopenReason.trim()}
              >
                {transitionMutation.isPending ? "Reopening…" : "Confirm reopen"}
              </button>
            </div>
          </form>
        </section>
      )}

      {showDeactivationForm && goalData.status !== "archived" && (
        <section className="goal-detail-card goal-deactivation-panel">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const reason = deactivationReason.trim();
              if (reason) deactivateMutation.mutate(reason);
            }}
          >
            <h2>Archive this goal?</h2>
            <p>It will move to Archives and remain there until you permanently delete it.</p>
            <label htmlFor="goal-deactivation-reason">Reason for archiving</label>
            <textarea
              id="goal-deactivation-reason"
              value={deactivationReason}
              onChange={(event) => setDeactivationReason(event.target.value)}
              maxLength={1000}
              rows={4}
              required
            />
            {deactivateMutation.isError && (
              <div className="form-error" role="alert">
                {deactivateMutation.error.message}
              </div>
            )}
            <div className="goal-deactivation-actions">
              <button
                className="goal-edit-button"
                type="button"
                disabled={deactivateMutation.isPending}
                onClick={() => {
                  setShowDeactivationForm(false);
                  setDeactivationReason("");
                  deactivateMutation.reset();
                }}
              >
                Cancel
              </button>
              <button
                className="goal-edit-button goal-deactivate-confirm"
                type="submit"
                disabled={deactivateMutation.isPending || !deactivationReason.trim()}
              >
                {deactivateMutation.isPending ? "Archiving…" : "Confirm archive"}
              </button>
            </div>
          </form>
        </section>
      )}

      {goalData.status === "archived" && (
        <section className="goal-detail-card goal-deactivation-reason">
          <div className="card-eyebrow">DEACTIVATION REASON</div>
          <p>{goalData.deactivation_reason || "No reason was recorded for this archived goal."}</p>
        </section>
      )}

      <section className="goal-detail-card goal-history-card">
        <div className="card-eyebrow">GOAL STATUS HISTORY</div>
        <h2>Status changes</h2>
        <p className="goal-history-empty">
          Changes made before status-history tracking was enabled are not available.
        </p>
        {statusHistory.isLoading ? (
          <p className="goal-inline-status">Loading status history…</p>
        ) : statusHistory.isError ? (
          <p className="form-error" role="alert">
            Could not load status history: {statusHistory.error instanceof Error ? statusHistory.error.message : "Unknown error"}
          </p>
        ) : statusHistory.data?.length ? (
          <ol className="goal-history-list">
            {statusHistory.data.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{formatGoalStatus(entry.from_status)} → {formatGoalStatus(entry.to_status)}</strong>
                  <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
                </div>
                {entry.reason && <p>{entry.reason}</p>}
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <GoalCriteriaAssessment goalId={goalData.id} />

      <GoalMilestones goalId={goalData.id} />

      <section className="goal-detail-card">
        <div className="card-eyebrow">SOURCE DOCUMENT EXPECTATIONS</div>
        <div className="section-title-row">
          <div>
            <h2>What you need to demonstrate</h2>
            <p>Review expectations extracted from the source document. Use the Milestones section to turn these into trackable steps.</p>
          </div>
        </div>

        {!goalData.source_document_id ? (
          <div className="empty-goal-state">
            <strong>No source document is linked to this goal</strong>
            <span>Expectations extracted from a linked source document appear here.</span>
          </div>
        ) : requirements.isLoading ? (
          <p className="goal-inline-status">Loading source document expectations…</p>
        ) : requirements.isError ? (
          <p className="form-error" role="alert">
            Could not load source document expectations: {requirements.error instanceof Error ? requirements.error.message : "Unknown error"}
          </p>
        ) : (requirements.data ?? []).length === 0 ? (
          <div className="empty-goal-state">
            <strong>No extracted expectations</strong>
            <span>The linked document does not contain any extracted expectations.</span>
          </div>
        ) : (
          <div className="requirement-list">
            {(requirements.data ?? []).map((requirement: DocumentExpectation) => (
              <details className="requirement-item" key={requirement.id}>
                <summary>
                  <span className="requirement-category">{formatSubStatus(requirement.category)}</span>
                  <span className="requirement-summary">{requirement.description}</span>
                  <span className="requirement-toggle">View details</span>
                </summary>
                <div className="requirement-details">
                  <p>{requirement.description}</p>
                  {requirement.source_text_span && (
                    <div>
                      <strong>Original source text</strong>
                      <p>{requirement.source_text_span}</p>
                    </div>
                  )}
                  {requirement.evidence_hints.length > 0 && (
                    <div>
                      <strong>Ways to demonstrate this</strong>
                      <ul>
                        {requirement.evidence_hints.map((hint) => <li key={hint}>{hint}</li>)}
                      </ul>
                    </div>
                  )}
                  {(requirement.source_section || requirement.source_page) && (
                    <small>
                      Source: {[requirement.source_section, requirement.source_page && `page ${requirement.source_page}`].filter(Boolean).join(" · ")}
                    </small>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="goal-detail-card">
        <div className="card-eyebrow">YOUR EVIDENCE</div>
        <div className="section-title-row">
          <div>
            <h2>{evidenceItems.length} pieces of evidence</h2>
            <p>What you have done and the proof connected to this goal.</p>
          </div>
          {goalData.status === "active" ? (
            <button
              className="goal-edit-button"
              type="button"
              onClick={() => {
                if (!showEvidenceForm) {
                  setEvidenceEntryMode("ai");
                  setSelectedDiscoveredEvidence(new Set());
                  evidenceDiscoveryMutation.reset();
                  saveDiscoveredEvidenceMutation.reset();
                  setDiscoverySaveError("");
                }
                setShowEvidenceForm((visible) => !visible);
                addEvidenceMutation.reset();
              }}
            >
              {showEvidenceForm ? "Cancel" : "Add evidence"}
            </button>
          ) : (
            <p className="goal-evidence-inactive-notice" role="status">
              {goalData.status === "draft"
                ? "Approve and activate this goal before adding evidence."
                : goalData.status === "approved"
                  ? "Activate this goal before adding evidence."
                  : `This goal is ${goalData.status}. Only active goals can accept new evidence.`}
            </p>
          )}
        </div>

        {showEvidenceForm && goalData.status === "active" && (
          <form
            className="goal-evidence-form"
            onSubmit={(event) => {
              event.preventDefault();
              addEvidenceMutation.mutate();
            }}
          >
            <h3>Add evidence to this goal</h3>
            <div className="evidence-entry-modes" role="tablist" aria-label="Evidence entry method">
              <button
                className={evidenceEntryMode === "ai" ? "is-active" : ""}
                type="button"
                role="tab"
                aria-selected={evidenceEntryMode === "ai"}
                onClick={() => setEvidenceEntryMode("ai")}
              >
                Discover with AI
              </button>
              <button
                className={evidenceEntryMode === "manual" ? "is-active" : ""}
                type="button"
                role="tab"
                aria-selected={evidenceEntryMode === "manual"}
                onClick={() => setEvidenceEntryMode("manual")}
              >
                Add manually
              </button>
            </div>
            <label htmlFor="goal-evidence-destination">Attach evidence to</label>
            <select
              id="goal-evidence-destination"
              value={evidenceMilestoneId}
              onChange={(event) => setEvidenceMilestoneId(event.target.value)}
              disabled={addEvidenceMutation.isPending || milestones.isLoading}
            >
              <option value="">Goal directly</option>
              {(milestones.data ?? []).map((milestone: GoalMilestone) => (
                <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
              ))}
            </select>
            {milestones.isError && (
              <p className="form-error" role="alert">
                Could not load milestones, so evidence can only be attached directly to the goal: {milestones.error.message}
              </p>
            )}
            {evidenceEntryMode === "ai" ? (
              <div className="evidence-discovery-panel">
                <p>
                  Search your connected sources for work related to this {evidenceMilestoneId ? "milestone" : "goal"}.
                  AI summaries include the original source link; review and select the items you want to attach.
                </p>
                <div className="evidence-connection-list">
                  {(["github", "jira"] as const).map((provider) => {
                    const connection = sourceConnections.data?.find(
                      (item) => item.provider === provider,
                    );
                    return (
                      <div className="evidence-connection-row" key={provider}>
                        <span>
                          <strong>{provider === "github" ? "GitHub" : "Jira"}</strong>
                          <small>
                            {sourceConnections.isLoading
                              ? "Checking connection…"
                              : connection?.connected
                                ? connection.managed_locally
                                  ? "Using local development credentials"
                                  : `Connected as ${connection.account}`
                                : "Not connected"}
                          </small>
                        </span>
                        {connection?.connected ? (
                          !connection.managed_locally && (
                            <button
                              className="goal-edit-button"
                              type="button"
                              disabled={disconnectSourceMutation.isPending}
                              onClick={() => disconnectSourceMutation.mutate(provider)}
                            >
                              Disconnect
                            </button>
                          )
                        ) : (
                          <button
                            className="goal-edit-button"
                            type="button"
                            disabled={sourceConnections.isLoading || connectSourceMutation.isPending}
                            onClick={() => connectSourceMutation.mutate(provider)}
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {sourceConnections.isError && (
                  <p className="form-error" role="alert">
                    Could not load source connections: {sourceConnections.error.message}
                  </p>
                )}
                {connectSourceMutation.isError && (
                  <p className="form-error" role="alert">{connectSourceMutation.error.message}</p>
                )}
                {disconnectSourceMutation.isError && (
                  <p className="form-error" role="alert">{disconnectSourceMutation.error.message}</p>
                )}
                <fieldset className="evidence-source-options">
                  <legend>Search sources</legend>
                  {(["github", "jira"] as const).map((provider) => (
                    <label key={provider}>
                      <input
                        type="checkbox"
                        checked={discoverySources.includes(provider)}
                        onChange={(event) => {
                          setDiscoverySources((previous) =>
                            event.target.checked
                              ? [...previous, provider]
                              : previous.filter((source) => source !== provider),
                          );
                        }}
                      />
                      {provider === "github" ? "GitHub contributions" : "Delivered Jira stories"}
                    </label>
                  ))}
                </fieldset>
                <div className="evidence-date-range">
                  <label htmlFor="evidence-discovery-start">From</label>
                  <input
                    id="evidence-discovery-start"
                    type="date"
                    value={discoveryStartDate}
                    max={discoveryEndDate}
                    onChange={(event) => setDiscoveryStartDate(event.target.value)}
                  />
                  <label htmlFor="evidence-discovery-end">To</label>
                  <input
                    id="evidence-discovery-end"
                    type="date"
                    value={discoveryEndDate}
                    min={discoveryStartDate}
                    onChange={(event) => setDiscoveryEndDate(event.target.value)}
                  />
                </div>
                <button
                  className="goal-edit-button evidence-submit-button"
                  type="button"
                  disabled={
                    evidenceDiscoveryMutation.isPending ||
                    !selectedSourcesConnected ||
                    !discoverySources.length ||
                    !discoveryStartDate ||
                    !discoveryEndDate
                  }
                  onClick={() => evidenceDiscoveryMutation.mutate()}
                >
                  {evidenceDiscoveryMutation.isPending ? "Searching sources and summarizing…" : "Find related evidence"}
                </button>
                {evidenceDiscoveryMutation.isError && (
                  <p className="form-error" role="alert">
                    {evidenceDiscoveryMutation.error.message}
                  </p>
                )}
                {evidenceDiscoveryMutation.isSuccess && (
                  <div className="discovered-evidence-list">
                    <h4>
                      {evidenceDiscoveryMutation.data.length
                        ? `${evidenceDiscoveryMutation.data.length} AI-suggested evidence item${evidenceDiscoveryMutation.data.length === 1 ? "" : "s"}`
                        : "No related evidence found for this date range"}
                    </h4>
                    {evidenceDiscoveryMutation.data.map((item: DiscoveredEvidence) => (
                      <div className="discovered-evidence-card" key={item.id}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.title} as evidence`}
                          checked={selectedDiscoveredEvidence.has(item.id)}
                          onChange={(event) =>
                            setSelectedDiscoveredEvidence((previous) => {
                              const next = new Set(previous);
                              if (event.target.checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            })
                          }
                        />
                        <span className="discovered-evidence-content">
                          <span className="discovered-evidence-meta">
                            {item.source_type.toUpperCase()} · {formatDate(item.captured_at)}
                            {item.repository ? ` · ${item.repository}` : ""}
                            {item.status ? ` · ${item.status}` : ""}
                          </span>
                          <strong>{item.title}</strong>
                          <span>{item.summary}</span>
                          <span className={`tag evidence-relevance-${item.relevance}`}>
                            {item.relevance} relevance
                          </span>
                          {item.source_url && (
                            <a href={item.source_url} target="_blank" rel="noreferrer">
                              View source ↗
                            </a>
                          )}
                          {item.description && (
                            <details>
                              <summary>Source details</summary>
                              <span>{item.description}</span>
                            </details>
                          )}
                        </span>
                      </div>
                    ))}
                    {discoverySaveError && (
                      <p className="form-error" role="alert">{discoverySaveError}</p>
                    )}
                    {saveDiscoveredEvidenceMutation.isError && (
                      <p className="form-error" role="alert">
                        Could not save selected evidence: {saveDiscoveredEvidenceMutation.error.message}
                      </p>
                    )}
                    {evidenceDiscoveryMutation.data.length > 0 && (
                      <button
                        className="goal-edit-button evidence-submit-button"
                        type="button"
                        disabled={
                          !selectedDiscoveredEvidence.size ||
                          saveDiscoveredEvidenceMutation.isPending
                        }
                        onClick={() => saveDiscoveredEvidenceMutation.mutate()}
                      >
                        {saveDiscoveredEvidenceMutation.isPending
                          ? "Saving selected evidence…"
                          : `Add ${selectedDiscoveredEvidence.size} selected item${selectedDiscoveredEvidence.size === 1 ? "" : "s"}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
            <label htmlFor="goal-evidence-title">Evidence title</label>
            <input
              id="goal-evidence-title"
              value={evidenceTitle}
              onChange={(event) => setEvidenceTitle(event.target.value)}
              maxLength={300}
              disabled={addEvidenceMutation.isPending}
            />
            <label htmlFor="goal-evidence-description">What did you do, and what changed?</label>
            <textarea
              id="goal-evidence-description"
              value={evidenceDescription}
              onChange={(event) => setEvidenceDescription(event.target.value)}
              maxLength={5000}
              rows={4}
              disabled={addEvidenceMutation.isPending}
            />
            <fieldset className="evidence-source-options" disabled={addEvidenceMutation.isPending}>
              <legend>Supporting proof</legend>
              <label>
                <input
                  type="radio"
                  name="goal-evidence-source"
                  value="link"
                  checked={evidenceSourceMode === "link"}
                  onChange={() => setEvidenceSourceMode("link")}
                />
                Link (including Microsoft Teams)
              </label>
              <label>
                <input
                  type="radio"
                  name="goal-evidence-source"
                  value="file"
                  checked={evidenceSourceMode === "file"}
                  onChange={() => setEvidenceSourceMode("file")}
                />
                Upload PDF or image
              </label>
            </fieldset>
            {evidenceSourceMode === "link" ? (
              <>
                <label htmlFor="goal-evidence-url">Link to supporting proof</label>
                <input
                  id="goal-evidence-url"
                  type="url"
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder="Paste a Teams, SharePoint, or other https:// link"
                  required
                  disabled={addEvidenceMutation.isPending}
                />
              </>
            ) : (
              <>
                <label htmlFor="goal-evidence-file">PDF or image file (max 10 MB)</label>
                <input
                  id="goal-evidence-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/png,image/jpeg,image/gif,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setEvidenceFile(file);
                    if (file && !evidenceTitle.trim()) setEvidenceTitle(file.name);
                  }}
                  disabled={addEvidenceMutation.isPending || Boolean(uploadedEvidenceDocument)}
                  required={!uploadedEvidenceDocument}
                />
                <small>
                  {uploadedEvidenceDocument
                    ? `Uploaded: ${uploadedEvidenceDocument.file_name}`
                    : evidenceFile
                      ? `Selected: ${evidenceFile.name}`
                      : "Supported formats: PDF, PNG, JPG, GIF, and WEBP."}
                </small>
              </>
            )}
            <label htmlFor="goal-evidence-relevance">How relevant is it to this goal?</label>
            <select
              id="goal-evidence-relevance"
              value={evidenceRelevance}
              disabled={addEvidenceMutation.isPending}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "low" || value === "medium" || value === "high") {
                  setEvidenceRelevance(value);
                }
              }}
            >
              <option value="high">Highly relevant</option>
              <option value="medium">Somewhat relevant</option>
              <option value="low">Loosely related</option>
            </select>
              </>
            )}
            {addEvidenceMutation.isError && (
              <div className="form-error" role="alert">
                {addEvidenceMutation.error.message}
              </div>
            )}
            <div className="goal-deactivation-actions">
              <button
                className="goal-edit-button"
                type="button"
                disabled={addEvidenceMutation.isPending}
                onClick={() => {
                  setShowEvidenceForm(false);
                  addEvidenceMutation.reset();
                  evidenceDiscoveryMutation.reset();
                  saveDiscoveredEvidenceMutation.reset();
                }}
              >
                Cancel
              </button>
              {evidenceEntryMode === "manual" && (
                <button
                  className="goal-edit-button evidence-submit-button"
                  type="submit"
                  disabled={addEvidenceMutation.isPending || !evidenceTitle.trim()}
                >
                  {addEvidenceMutation.isPending ? "Saving…" : "Save evidence"}
                </button>
              )}
            </div>
          </form>
        )}

        {evidenceItems.length === 0 ? (
          <div className="empty-goal-state">
            <strong>No evidence recorded yet</strong>
            <span>Add evidence that shows your contribution and the outcome it supported.</span>
          </div>
        ) : (
          <div className="achievement-list">
            {evidenceItems.map((item: GoalEvidence) => {
              const itemImpact = impactByEvidence.get(item.evidence_id);
              return (
                <article className="achievement-card" key={item.evidence_id}>
                  <div className="achievement-main">
                    <div className="achievement-meta">
                      {item.source_type} · {formatDate(item.captured_at) ?? "Date not available"}
                    </div>
                    <div className="achievement-meta">
                      {item.milestone_id
                        ? `Milestone: ${milestones.data?.find((milestone) => milestone.id === item.milestone_id)?.title ?? "Selected milestone"}`
                        : "Attached directly to goal"}
                    </div>
                    <strong className="achievement-title">{item.title}</strong>
                    {item.description && <p>{item.description}</p>}
                    {item.source_url && (
                      item.source_type === "document" ? (
                        <button
                          className="evidence-proof-link"
                          type="button"
                          onClick={() => void handleEvidenceFileDownload(item.source_url!, item.title)}
                        >
                          Download attached file
                        </button>
                      ) : (
                        <a className="evidence-proof-link" href={item.source_url} target="_blank" rel="noreferrer">
                          Open supporting link ↗
                        </a>
                      )
                    )}
                    {fileDownloadError && item.source_type === "document" && (
                      <p className="login-error" role="alert">{fileDownloadError}</p>
                    )}
                    {item.reason && <p className="achievement-reason">{item.reason}</p>}
                    <div className="tag-list achievement-tags">
                      <span className="tag">{item.relevance}</span>
                      <span className="tag">{Math.round(item.confidence * 100)}% confidence</span>
                      {item.approval_status && (
                        <span className="tag">
                          Manager review: {item.approval_status.replaceAll("_", " ")}
                        </span>
                      )}
                      {itemImpact ? (
                        <span className="tag tag-positive">
                          {formatImpactType(itemImpact.impact_type)} impact
                        </span>
                      ) : (
                        <span className="tag">Impact not demonstrated yet</span>
                      )}
                    </div>
                    {item.approval_comment && (
                      <p className="achievement-review-comment">
                        <strong>Manager feedback:</strong> {item.approval_comment}
                      </p>
                    )}
                    {(item.approval_status === "rejected" ||
                      item.approval_status === "needs_information") &&
                      item.approval_id && (
                        <>
                          <button
                            className="goal-edit-button"
                            type="button"
                            onClick={() => {
                              resubmitEvidenceMutation.reset();
                              if (resubmissionApprovalId === item.approval_id) {
                                setResubmissionApprovalId(null);
                                return;
                              }
                              setResubmissionApprovalId(item.approval_id!);
                              setResubmissionTitle(item.title);
                              setResubmissionDescription(item.description ?? "");
                              setResubmissionUrl(item.source_url ?? "");
                              setResubmissionNotes("");
                            }}
                          >
                            {resubmissionApprovalId === item.approval_id
                              ? "Cancel update"
                              : "Update and resubmit"}
                          </button>
                          {resubmissionApprovalId === item.approval_id && (
                            <form
                              className="goal-evidence-form evidence-resubmission-form"
                              onSubmit={(event) => {
                                event.preventDefault();
                                resubmitEvidenceMutation.mutate({
                                  approvalId: item.approval_id!,
                                  title: resubmissionTitle,
                                  description: resubmissionDescription,
                                  sourceUrl: resubmissionUrl,
                                  notes: resubmissionNotes,
                                });
                              }}
                            >
                              <h3>Update evidence for manager review</h3>
                              <label>
                                Evidence title
                                <input
                                  value={resubmissionTitle}
                                  maxLength={500}
                                  onChange={(event) => setResubmissionTitle(event.target.value)}
                                  required
                                />
                              </label>
                              <label>
                                Description
                                <textarea
                                  value={resubmissionDescription}
                                  maxLength={5000}
                                  onChange={(event) =>
                                    setResubmissionDescription(event.target.value)
                                  }
                                />
                              </label>
                              <label>
                                Source link
                                <input
                                  type="url"
                                  value={resubmissionUrl}
                                  maxLength={2000}
                                  onChange={(event) => setResubmissionUrl(event.target.value)}
                                />
                              </label>
                              <label>
                                Reply to your manager
                                <textarea
                                  value={resubmissionNotes}
                                  maxLength={4000}
                                  onChange={(event) => setResubmissionNotes(event.target.value)}
                                  required
                                />
                              </label>
                              {resubmitEvidenceMutation.isError && (
                                <p className="form-error" role="alert">
                                  Could not resubmit evidence: {resubmitEvidenceMutation.error.message}
                                </p>
                              )}
                              <button
                                className="goal-edit-button"
                                type="submit"
                                disabled={
                                  resubmitEvidenceMutation.isPending ||
                                  !resubmissionTitle.trim() ||
                                  !resubmissionNotes.trim()
                                }
                              >
                                {resubmitEvidenceMutation.isPending
                                  ? "Resubmitting…"
                                  : "Send updated evidence"}
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    <button
                      className="goal-edit-button"
                      type="button"
                      disabled={archiveEvidenceMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Archive “${item.title}”? You can permanently delete it from Archives later.`)) {
                          archiveEvidenceMutation.mutate(item.evidence_id);
                        }
                      }}
                    >
                      Archive evidence
                    </button>
                  </div>

                  {itemImpact && (
                    <div className="achievement-impact has-impact">
                      <div className="card-eyebrow">DEMONSTRATED IMPACT</div>
                      <p>{itemImpact.impact_summary}</p>
                      <span>{Math.round(itemImpact.confidence * 100)}% confidence</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {archiveEvidenceMutation.isError && (
          <p className="form-error" role="alert">{archiveEvidenceMutation.error.message}</p>
        )}
      </section>

      {insight.data && (
        <section className="goal-detail-card career-insight-card">
          <div className="career-insight-content">
            <div className="card-eyebrow">WHAT THIS SAYS ABOUT YOU</div>
            <h2>{insight.data.headline}</h2>
            <p>{insight.data.summary}</p>
            <div className="tag-list insight-tags">
              {insight.data.impact_types.map((type) => (
                <span className="tag" key={type}>{formatImpactType(type)}</span>
              ))}
            </div>
          </div>
          <div className="insight-confidence">
            <strong>{Math.round(insight.data.confidence * 100)}%</strong>
            <span>AI confidence</span>
          </div>
        </section>
      )}

    </div>
  );
}
