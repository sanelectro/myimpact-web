import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  getGoal,
  getGoalStatusHistory,
  getGoalAssessment,
  getGoalEvidence,
  getDocumentExpectations,
  getGoalImpact,
  getGoalInsight,
  createGoalEvidence,
  getEvidenceFileUrl,
  uploadEvidenceFile,
  approveGoal,
  activateGoal,
  completeGoal,
  reopenGoal,
  deactivateGoal,
  archiveEvidence,
} from "../../api/myImpact";
import type {
  DocumentExpectation,
  GoalEvidence,
  ImpactAssessment,
  KnowledgeDocument,
} from "../../types/api";
import GoalMilestones from "../../components/Milestones/GoalMilestones";
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

function formatSubStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

type Guidance = {
  optional?: boolean;
  title: string;
  intro: string;
  steps: [string, string][];
};

type GoalTransition =
  | { action: "approve" | "activate" | "complete" }
  | { action: "reopen"; reason: string };

function getGuidance(status: string, qualifyingCount: number, expectedCount: number): Guidance | null {
  if (status === "not_started") {
    return {
      title: "How to get started",
      intro: `Your expectation is ${expectedCount} meaningful achievements with supporting evidence and demonstrated impact. Start with one concrete contribution you can own.`,
      steps: [
        ["Understand the goal", "Identify the problem, outcome or capability this goal is asking you to improve."],
        ["Choose your first achievement", "Define one concrete contribution that moves the goal forward and can be clearly described."],
        ["Capture evidence", "Keep the PR, design, dashboard, incident, document, metric or stakeholder feedback that proves the work happened."],
        ["Demonstrate impact", "Capture the measurable difference your work created — for example time saved, incidents reduced, coverage increased or quality improved."],
      ],
    };
  }

  if (status === "in_progress") {
    const remaining = Math.max(0, expectedCount - qualifyingCount);
    return {
      title: "Keep building toward the expected bar",
      intro: `You have ${qualifyingCount} meaningful achievement${qualifyingCount === 1 ? "" : "s"} demonstrated. ${remaining} more ${remaining === 1 ? "achievement" : "achievements"} with evidence and impact will meet expectations.`,
      steps: [
        ["Complete the next meaningful contribution", "Prioritise work that materially advances the outcome rather than simply increasing activity."],
        ["Keep the evidence connected", "Make sure each contribution has clear supporting evidence and a strong relationship to the goal."],
        ["Make the impact measurable", "Prefer before-and-after outcomes such as time saved, incidents reduced, coverage increased or adoption improved."],
      ],
    };
  }

  if (status === "met") {
    return {
      optional: true,
      title: "Optional: strengthen your story",
      intro: "You have met the expected bar. Use these suggestions only if you want to make the impact easier to communicate in a 1:1 or review.",
      steps: [
        ["Keep evidence current", "Capture new contributions while the details and measurable outcomes are fresh."],
        ["Deepen measurable impact", "Prefer outcomes that show scale, quality, reliability, efficiency, leadership or business value."],
        ["Connect the story", "Use the strongest achievements to explain how your contribution advanced the goal."],
      ],
    };
  }

  return null;
}

export default function GoalDetailPage() {
  const { goalId } = useParams();
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
  const [evidenceRelevance, setEvidenceRelevance] = useState<"low" | "medium" | "high">("medium");
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

  const assessment = useQuery({
    queryKey: ["goal-assessment", goalId],
    queryFn: () => getGoalAssessment(goalId!),
    enabled: Boolean(goalId),
  });

  const evidence = useQuery({
    queryKey: ["goal-evidence", goalId],
    queryFn: () => getGoalEvidence(goalId!),
    enabled: Boolean(goalId),
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
  const assessmentData = assessment.data;
  const evidenceItems = evidence.data ?? [];
  const impactItems = impact.data ?? [];
  const impactByEvidence = new Map<string, ImpactAssessment>();
  impactItems.forEach((item) => impactByEvidence.set(item.evidence_id, item));

  const assessmentStatus = assessmentData?.status ?? "not_started";
  const displayPercent = assessmentData?.progress_percentage ?? 0;
  const visualPercent = Math.min(100, displayPercent);
  const guidance = assessmentData
    ? getGuidance(
        assessmentData.status,
        assessmentData.qualifying_achievement_count,
        assessmentData.expected_achievement_count,
      )
    : null;

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

      <section className={`goal-detail-card goal-assessment-card goal-assessment-${assessmentStatus}`}>
        <div className="goal-assessment-main">
          <div className="card-eyebrow">EVIDENCE ASSESSMENT</div>
          <div className="goal-assessment-title-row">
            <h2>
              {assessmentStatus === "above"
                ? "Above Expectations"
                : assessmentStatus === "met"
                  ? "Met Expectations"
                  : assessmentStatus === "in_progress"
                    ? "In-progress"
                    : "Not Started"}
            </h2>
          </div>
          <p className="goal-assessment-description">
            {goalData.status === "completed"
              ? `The goal lifecycle is Completed. This evidence assessment remains ${formatSubStatus(assessmentStatus).toLowerCase()} and reflects evidence against the expected minimum; completing the goal does not change the assessment score.`
              : assessmentData?.description ?? "Assessing your goal progress…"}
          </p>
        </div>

        <div className="goal-stat-grid">
          <div className="goal-stat">
            <strong>{assessmentData?.achievement_count ?? evidenceItems.length}</strong>
            <span>achievements</span>
          </div>
          <div className="goal-stat">
            <strong>{assessmentData?.evidence_count ?? evidenceItems.length}</strong>
            <span>supported by evidence</span>
          </div>
          <div className="goal-stat">
            <strong>{assessmentData?.demonstrated_impact_count ?? 0}</strong>
            <span>with demonstrated impact</span>
          </div>
          <div className="goal-stat">
            <strong>{displayPercent}%</strong>
            <span>of expected minimum</span>
          </div>
        </div>

        <div className="goal-progress" aria-label={`${displayPercent}% of expected minimum`}>
          <div className="goal-progress-fill" style={{ width: `${visualPercent}%` }} />
        </div>

        <div className="goal-meta">
          {goalData.source && <span>Source: {goalData.source}</span>}
          {goalData.start_date && <span>Started: {formatDate(goalData.start_date)}</span>}
          {goalData.end_date && <span>Target: {formatDate(goalData.end_date)}</span>}
        </div>
      </section>

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
        <div className="card-eyebrow">YOUR ACHIEVEMENTS</div>
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
            <h3>Add evidence for this goal</h3>
            <label htmlFor="goal-evidence-title">Achievement title</label>
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
                }}
              >
                Cancel
              </button>
              <button
                className="goal-edit-button evidence-submit-button"
                type="submit"
                disabled={addEvidenceMutation.isPending || !evidenceTitle.trim()}
              >
                {addEvidenceMutation.isPending ? "Saving…" : "Save evidence"}
              </button>
            </div>
          </form>
        )}

        {evidenceItems.length === 0 ? (
          <div className="empty-goal-state">
            <strong>No achievements recorded yet</strong>
            <span>Use the guidance below to turn this goal into your first concrete achievement.</span>
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
                    <strong className="achievement-title">{item.title}</strong>
                    {item.description && <p>{item.description}</p>}
                    {item.source_url && (
                      <a className="evidence-proof-link" href={item.source_url} target="_blank" rel="noreferrer">
                        {item.source_type === "document" ? "View attached file" : "Open supporting link"} ↗
                      </a>
                    )}
                    {item.reason && <p className="achievement-reason">{item.reason}</p>}
                    <div className="tag-list achievement-tags">
                      <span className="tag">{item.relevance}</span>
                      <span className="tag">{Math.round(item.confidence * 100)}% confidence</span>
                      {itemImpact ? (
                        <span className="tag tag-positive">
                          {formatImpactType(itemImpact.impact_type)} impact
                        </span>
                      ) : (
                        <span className="tag">Impact not demonstrated yet</span>
                      )}
                    </div>
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

      {guidance && (
        <section className={`goal-detail-card next-steps-card ${guidance.optional ? "next-steps-optional" : ""}`}>
          <div className="card-eyebrow">{guidance.optional ? "OPTIONAL NEXT STEPS" : "NEXT STEPS"}</div>
          <div className="section-title-row">
            <div>
              <h2>{guidance.title}</h2>
              <p>{guidance.intro}</p>
            </div>
          </div>
          {guidance.optional ? (
            <details className="guidance-details">
              <summary>Show optional suggestions</summary>
              <div className="guidance-list">
                {guidance.steps.map(([title, description], index) => (
                  <div className="guidance-item" key={title}>
                    <div className="guidance-number">{index + 1}</div>
                    <div>
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : (
            <div className="guidance-list">
              {guidance.steps.map(([title, description], index) => (
                <div className="guidance-item" key={title}>
                  <div className="guidance-number">{index + 1}</div>
                  <div>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
