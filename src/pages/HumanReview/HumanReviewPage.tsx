import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getHumanReviewBatches,
  getHumanReviewCase,
  getHumanReviewQueue,
  saveHumanReviewDraft,
  submitHumanReview,
} from "../../api/myImpact";
import "./HumanReviewPage.css";
import ReviewCaseContext from "./ReviewCaseContext";
import { formatCategory } from "./reviewerCategories";
import { reviewLabel } from "./goalValidationLabels";
import { useReviewBatchSelection } from "../Reviewer/ReviewBatchSelection";

const REVIEW_LABELS = [
  "NOT_ASSESSED",
  "NOT_STARTED",
  "IN_PROGRESS",
  "MET",
  "NEEDS_REVIEW",
] as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function displayAiLabel(caseContext: Record<string, unknown>, label: string) {
  const mapping = caseContext.ai_label_map;
  if (mapping && typeof mapping === "object" && !Array.isArray(mapping)) {
    const mapped = (mapping as Record<string, unknown>)[label];
    return typeof mapped === "string" ? mapped : label;
  }
  return label;
}

export default function HumanReviewPage() {
  const { selectedBatchId } = useReviewBatchSelection();
  const { caseId: routeCaseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnToPreview = searchParams.get("returnTo") === "final-preview";
  const queryClient = useQueryClient();
  const selectedCaseId = routeCaseId ?? null;
  const [label, setLabel] = useState("");
  const [rationale, setRationale] = useState("");
  const [postAiLabel, setPostAiLabel] = useState("");
  const [postAiRationale, setPostAiRationale] = useState("");
  const [postAiConfidence, setPostAiConfidence] = useState("");
  const [postAiContext, setPostAiContext] = useState("");
  const [isPostAiPreview, setIsPostAiPreview] = useState(false);
  const hydratedCaseRef = useRef<string | null>(null);

  const batchesQuery = useQuery({
    queryKey: ["human-review", "batches"],
    queryFn: getHumanReviewBatches,
  });
  const batch = batchesQuery.data?.find((item) => item.id === selectedBatchId)
    ?? batchesQuery.data?.[0] ?? null;
  const queueQuery = useQuery({
    queryKey: ["human-review", "queue", batch?.id],
    queryFn: () => getHumanReviewQueue(batch!.id),
    enabled: Boolean(batch),
  });
  const selectedSummary = queueQuery.data?.find(
    (item) => item.case_id === selectedCaseId,
  );
  const caseQuery = useQuery({
    queryKey: ["human-review", "case", batch?.id, selectedCaseId],
    queryFn: () => getHumanReviewCase(batch!.id, selectedCaseId!),
    enabled: Boolean(batch && selectedCaseId),
  });
  const referenceProposal = caseQuery.data?.reference_proposal ?? null;
  const isProposalAssisted = Boolean(referenceProposal) &&
    (!caseQuery.data?.own_review?.is_final ||
      caseQuery.data.own_review.review_stage === "PROPOSAL_ASSISTED");
  const submitMutation = useMutation({
    mutationFn: () =>
      submitHumanReview(batch!.id, selectedCaseId!, {
        label,
        rationale,
        review_stage: isProposalAssisted ? "PROPOSAL_ASSISTED" : "BLIND",
        reference_proposal_id: isProposalAssisted ? referenceProposal?.id : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-review"] });
      const nextPending = (queueQuery.data ?? []).find(
        (item) =>
          item.case_id !== selectedCaseId &&
          !item.submitted_by_current_user &&
          !item.has_draft,
      );
      navigate(
        returnToPreview
          ? "/evaluate/final-review"
          : nextPending
            ? `/evaluate/cases/${encodeURIComponent(nextPending.case_id)}`
            : "/evaluate",
      );
    },
  });
  const postAiMutation = useMutation({
    mutationFn: () =>
      submitHumanReview(batch!.id, selectedCaseId!, {
        label: postAiLabel,
        rationale: postAiRationale,
        review_stage: "POST_AI",
        ai_attempt_id: caseQuery.data!.ai_assessment!.attempt_id,
        confidence: postAiConfidence ? Number(postAiConfidence) : undefined,
        context_notes: postAiContext || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-review"] });
      setPostAiLabel("");
      setPostAiRationale("");
      setPostAiConfidence("");
      setPostAiContext("");
      setIsPostAiPreview(false);
    },
  });
  const savePostAiDraftMutation = useMutation({
    mutationFn: () =>
      saveHumanReviewDraft(batch!.id, selectedCaseId!, {
        label: postAiLabel,
        rationale: postAiRationale,
        review_stage: "POST_AI",
        ai_attempt_id: caseQuery.data!.ai_assessment!.attempt_id,
        confidence: postAiConfidence ? Number(postAiConfidence) : undefined,
        context_notes: postAiContext || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["human-review", "case", batch?.id, selectedCaseId],
      });
    },
  });

  useEffect(() => {
    setLabel("");
    setRationale("");
    submitMutation.reset();
    setPostAiLabel("");
    setPostAiRationale("");
    setPostAiConfidence("");
    setPostAiContext("");
    setIsPostAiPreview(false);
    postAiMutation.reset();
    savePostAiDraftMutation.reset();
    hydratedCaseRef.current = null;
  }, [selectedCaseId]);

  useEffect(() => {
    if (
      !selectedCaseId ||
      caseQuery.data?.case.case_id !== selectedCaseId ||
      hydratedCaseRef.current === selectedCaseId
    ) {
      return;
    }
    const primaryDraft = caseQuery.data.own_review?.is_final
      ? null
      : caseQuery.data.own_review;
    const postAiDraft = caseQuery.data.post_ai_draft;
    setLabel(primaryDraft?.label ?? "");
    setRationale(primaryDraft?.rationale ?? "");
    setPostAiLabel(postAiDraft?.label ?? "");
    setPostAiRationale(postAiDraft?.rationale ?? "");
    setPostAiConfidence(
      postAiDraft?.confidence === null || postAiDraft?.confidence === undefined
        ? ""
        : String(postAiDraft.confidence),
    );
    setPostAiContext(postAiDraft?.context_notes ?? "");
    hydratedCaseRef.current = selectedCaseId;
  }, [selectedCaseId, caseQuery.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMutation.reset();
    submitMutation.mutate();
  }

  function previewPostAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    postAiMutation.reset();
    savePostAiDraftMutation.reset();
    setIsPostAiPreview(true);
    savePostAiDraftMutation.mutate();
  }

  if (batchesQuery.isLoading) return <p role="status">Loading review assignments…</p>;
  if (batchesQuery.isError) {
    return <p role="alert">Could not load review assignments: {errorMessage(batchesQuery.error)}</p>;
  }
  if (queueQuery.isError) {
    return <p role="alert">Could not load your assigned cases: {errorMessage(queueQuery.error)}</p>;
  }
  if (!batch) {
    return (
      <section className="surface-card human-review-empty">
        <div className="eyebrow">HUMAN REVIEW</div>
        <h1>No review assignments</h1>
        <p>You do not have an active evaluation review batch assigned to you.</p>
      </section>
    );
  }

  const caseContext = caseQuery.data?.case ?? {};
  const reviewLabelOptions = Array.isArray(caseContext.review_label_options)
    ? caseContext.review_label_options.filter((option): option is string => typeof option === "string")
    : REVIEW_LABELS;
  const canSubmit = Boolean(
    selectedSummary &&
      !selectedSummary.submitted_by_current_user &&
      (caseContext.reference_visibility !== "PROPOSAL_ASSISTED" || referenceProposal) &&
      label &&
      rationale.trim(),
  );
  const canSubmitPostAi = Boolean(
    selectedSummary?.submitted_by_current_user &&
      caseQuery.data?.own_review?.is_final &&
      ["BLIND", "PROPOSAL_ASSISTED"].includes(
        caseQuery.data.own_review.review_stage,
      ) &&
      caseQuery.data?.ai_assessment &&
      !caseQuery.data.post_ai_review &&
      postAiLabel &&
      postAiRationale.trim(),
  );
  const assignedCases = queueQuery.data ?? [];
  const currentIndex = assignedCases.findIndex((item) => item.case_id === selectedCaseId);
  const previousCase = currentIndex > 0 ? assignedCases[currentIndex - 1] : null;
  const nextCase = currentIndex >= 0 ? assignedCases[currentIndex + 1] : null;
  const nextPendingCase = assignedCases.find(
    (item) => item.case_id !== selectedCaseId && !item.submitted_by_current_user,
  );
  return (
    <div className="human-review-page">
      <div className="page-heading">
        <div className="eyebrow">M6.6 HUMAN REVIEW</div>
        <h1>{isProposalAssisted ? "Proposal-assisted case review" : "Independent case review"}</h1>
        <Link className="reviewer-back-link" to={returnToPreview ? "/evaluate/final-review" : "/evaluate"}>
          {returnToPreview ? "Back to final review preview" : "← Back to review dashboard"}
        </Link>
        {isProposalAssisted ? (
          <p>
            Review the case context and critically assess the AI-generated
            proposal below. Your final submission will be recorded as proposal-assisted,
            not as a blind review. This case tests{" "}
            <strong>{typeof caseContext.category === "string" ? formatCategory(caseContext.category) : "intelligence evaluation"}</strong>.
          </p>
        ) : (
          <p>
            Review the case context and choose the answer supported by the
            information provided. This case tests{" "}
            <strong>{typeof caseContext.category === "string" ? formatCategory(caseContext.category) : "intelligence evaluation"}</strong>.
          </p>
        )}
      </div>

      <div className="human-review-layout human-review-single-case">
        <section className="surface-card human-review-detail">
          {!selectedCaseId ? (
            <p>Select an assigned case to review.</p>
          ) : caseQuery.isLoading ? (
            <p role="status">Loading case context…</p>
          ) : caseQuery.isError ? (
            <p role="alert">Could not load case context: {errorMessage(caseQuery.error)}</p>
          ) : !selectedSummary ? (
            <p role="alert">This case is not assigned to you or no longer exists in the review batch.</p>
          ) : (
            <>
              <ReviewCaseContext
                caseContext={caseContext}
                heading={selectedCaseId}
                eyebrow="CASE CONTEXT"
              />
              {referenceProposal && (
                <section
                  className="human-review-reference-proposal"
                  aria-labelledby="reference-proposal-heading"
                >
                  <div className="card-eyebrow">AI-GENERATED PROPOSAL</div>
                  <h3 id="reference-proposal-heading">Suggested human label and rationale</h3>
                  <p className="human-review-proposal-notice">
                    {caseQuery.data?.own_review?.is_final && !isProposalAssisted
                      ? "This AI-generated draft is not an approved human decision. It is shown after your independent review was finalized."
                      : "This is an AI-generated draft, not an approved human decision. Review it critically; your label and rationale below will be stored as your proposal-assisted submission."}
                  </p>
                  <p>
                    Suggested label: <strong>{reviewLabel(referenceProposal.proposed_label, caseContext)}</strong>
                  </p>
                  <p className="human-review-proposal-rationale">
                    {referenceProposal.rationale}
                  </p>
                  {referenceProposal.requires_owner_attention && (
                    <p className="human-review-proposal-notice">
                      This case is flagged for benchmark-owner attention.
                    </p>
                  )}
                  {isProposalAssisted && !selectedSummary.submitted_by_current_user && (
                    <button
                      className="reviewer-secondary-button"
                      type="button"
                      onClick={() => setRationale(referenceProposal.rationale)}
                    >
                      Use rationale as a draft
                    </button>
                  )}
                  <p className="human-review-proposal-source">
                    Source: {referenceProposal.source_document}
                  </p>
                </section>
              )}
              {caseContext.reference_visibility === "PROPOSAL_ASSISTED" && !referenceProposal && (
                <p role="alert">The AI proposal for this case is unavailable. Contact the review administrator before submitting.</p>
              )}
              <div className="human-review-case-navigation" aria-label="Case navigation">
                <span>Case {currentIndex + 1} of {assignedCases.length}</span>
                <div>
                  {previousCase && (
                    <Link className="reviewer-secondary-button" to={`/evaluate/cases/${encodeURIComponent(previousCase.case_id)}`}>
                      Previous
                    </Link>
                  )}
                  {nextCase && (
                    <Link className="reviewer-secondary-button" to={`/evaluate/cases/${encodeURIComponent(nextCase.case_id)}`}>
                      Next
                    </Link>
                  )}
                  {!selectedSummary.submitted_by_current_user && nextPendingCase && (
                    <span className="human-review-next-hint">Save to continue to the next pending case.</span>
                  )}
                </div>
              </div>
              {selectedSummary.has_draft &&
                !selectedSummary.submitted_by_current_user && (
                  <p className="human-review-submitted" role="status">
                    Review saved. You can continue editing until you submit all reviews together from the dashboard.
                  </p>
                )}
              {selectedSummary?.submitted_by_current_user ? (
                <>
                  <p className="human-review-submitted" role="status">
                    {caseQuery.data?.own_review?.review_stage === "PROPOSAL_ASSISTED"
                      ? "Your proposal-assisted review has been submitted and cannot be changed."
                      : "Your independent review has been submitted and cannot be changed."}
                  </p>
                  <section className="human-review-ai-assessment" aria-labelledby="ai-assessment-heading">
                    <div className="card-eyebrow">AI ASSESSMENT</div>
                    <h3 id="ai-assessment-heading">What the AI decided</h3>
                    {caseQuery.data?.ai_assessment ? (
                      <>
                        <p>
                          <strong>
                            {reviewLabel(displayAiLabel(
                              caseContext,
                              caseQuery.data.ai_assessment.assessment_label,
                            ), caseContext)}
                          </strong>
                          {" "}with {Math.round((caseQuery.data.ai_assessment.confidence ?? 0) * 100)}% confidence.
                        </p>
                        <p>
                          Human choice: <strong>{reviewLabel(caseQuery.data.own_review?.label ?? "", caseContext)}</strong>
                          {" — "}
                          {reviewLabel(caseQuery.data.own_review?.label ?? "", caseContext) ===
                          reviewLabel(displayAiLabel(
                            caseContext,
                            caseQuery.data.ai_assessment.assessment_label,
                          ), caseContext)
                            ? "Agreement"
                            : "Difference to investigate"}
                        </p>
                        <p>{caseQuery.data.ai_assessment.rationale || "The persisted AI run did not include a rationale."}</p>
                        <p className="human-review-ai-meta">
                          Model: {caseQuery.data.ai_assessment.model_identifier}
                        </p>
                      </>
                    ) : (
                      <p>No persisted AI evaluation is available for this case yet.</p>
                    )}
                  </section>
                  {caseQuery.data?.post_ai_review ? (
                    <section className="human-review-submitted" aria-label="Submitted post-AI review">
                      <p role="status">
                        Post-AI review submitted: <strong>{reviewLabel(caseQuery.data.post_ai_review.label, caseContext)}</strong>.
                      </p>
                      <p>{caseQuery.data.post_ai_review.rationale}</p>
                      {caseQuery.data.post_ai_review.confidence !== null && (
                        <p>Confidence: {Math.round(caseQuery.data.post_ai_review.confidence * 100)}%</p>
                      )}
                      {caseQuery.data.post_ai_review.context_notes && (
                        <p>Context notes: {caseQuery.data.post_ai_review.context_notes}</p>
                      )}
                    </section>
                  ) : caseQuery.data?.ai_assessment &&
                    caseQuery.data.own_review?.is_final &&
                    ["BLIND", "PROPOSAL_ASSISTED"].includes(
                      caseQuery.data.own_review.review_stage,
                    ) ? (
                    isPostAiPreview ? (
                      <section
                        className="human-review-final-preview"
                        aria-labelledby="post-ai-preview-heading"
                      >
                        <div className="card-eyebrow">FINAL POST-AI PREVIEW</div>
                        <h3 id="post-ai-preview-heading">Review before submitting</h3>
                        <p>
                          AI attempt:{" "}
                          <strong>{caseQuery.data.ai_assessment.attempt_id}</strong>
                        </p>
                        <div className="human-review-preview-final">
                          <strong>Final post-AI label</strong>
                          <p>{reviewLabel(postAiLabel, caseContext)}</p>
                          <strong>Confidence</strong>
                          <p>{postAiConfidence || "Not provided"}</p>
                          <strong>Final rationale</strong>
                          <p>{postAiRationale}</p>
                          {postAiContext && (
                            <>
                              <strong>Context or evidence notes</strong>
                              <p>{postAiContext}</p>
                            </>
                          )}
                        </div>
                        {savePostAiDraftMutation.isError && (
                          <p role="alert">
                            Could not save post-AI draft: {errorMessage(savePostAiDraftMutation.error)}
                          </p>
                        )}
                        {postAiMutation.isError && (
                          <p role="alert">
                            Could not submit final post-AI review: {errorMessage(postAiMutation.error)}
                          </p>
                        )}
                        <div className="human-review-preview-actions">
                          <button
                            className="reviewer-secondary-button"
                            type="button"
                            disabled={postAiMutation.isPending || savePostAiDraftMutation.isPending}
                            onClick={() => {
                              postAiMutation.reset();
                              savePostAiDraftMutation.reset();
                              setIsPostAiPreview(false);
                            }}
                          >
                            Back to edit
                          </button>
                          <button
                            className="login-submit"
                            type="button"
                            disabled={
                              !canSubmitPostAi ||
                              !savePostAiDraftMutation.isSuccess ||
                              postAiMutation.isPending ||
                              savePostAiDraftMutation.isPending
                            }
                            onClick={() => postAiMutation.mutate()}
                          >
                            {postAiMutation.isPending
                              ? "Submitting…"
                              : "Submit final post-AI review"}
                          </button>
                        </div>
                      </section>
                    ) : (
                    <form className="human-review-form" onSubmit={previewPostAi}>
                      <div className="card-eyebrow">POST-AI OPINION</div>
                      <h3>Record your response after seeing the AI result</h3>
                      <label>
                        Your post-AI label
                        <select value={postAiLabel} onChange={(event) => setPostAiLabel(event.target.value)} required>
                          <option value="">Select a label</option>
                          {reviewLabelOptions.map((option) => (
                            <option key={option} value={option}>{reviewLabel(option, caseContext)}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Confidence (optional, 0 to 1)
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={postAiConfidence}
                          onChange={(event) => setPostAiConfidence(event.target.value)}
                        />
                      </label>
                      <label>
                        Post-AI rationale
                        <textarea
                          value={postAiRationale}
                          onChange={(event) => setPostAiRationale(event.target.value)}
                          maxLength={10000}
                          required
                          rows={5}
                        />
                      </label>
                      <label>
                        Context or evidence notes (optional)
                        <textarea
                          value={postAiContext}
                          onChange={(event) => setPostAiContext(event.target.value)}
                          maxLength={10000}
                          rows={3}
                        />
                      </label>
                      <button className="login-submit" type="submit" disabled={!canSubmitPostAi}>
                        Preview final post-AI review
                      </button>
                    </form>
                    )
                  ) : null}
                </>
              ) : (
                <form className="human-review-form" onSubmit={submit}>
                  <label>
                    Your label
                    <select value={label} onChange={(event) => setLabel(event.target.value)} required>
                      <option value="">Select a label</option>
                      {reviewLabelOptions.map((option) => (
                        <option key={option} value={option}>{reviewLabel(option, caseContext)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Your rationale
                    <textarea
                      value={rationale}
                      onChange={(event) => setRationale(event.target.value)}
                      minLength={1}
                      maxLength={10000}
                      required
                      rows={7}
                    />
                  </label>
                  <p>Submit each case to save your review. It remains editable until final submission from the dashboard.</p>
                  {submitMutation.isError && (
                    <p role="alert">Could not submit review: {errorMessage(submitMutation.error)}</p>
                  )}
                  <button className="login-submit" type="submit" disabled={!canSubmit || submitMutation.isPending}>
                    {submitMutation.isPending ? "Submitting…" : "Submit review"}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
