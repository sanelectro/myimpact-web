import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  getHumanReviewBatches,
  getHumanReviewBatchPreview,
  submitFinalHumanReview,
} from "../../api/myImpact";
import ReviewCaseContext from "../HumanReview/ReviewCaseContext";
import { reviewLabel } from "../HumanReview/goalValidationLabels";
import { formatCategory } from "../HumanReview/reviewerCategories";
import "../HumanReview/HumanReviewPage.css";
import { useReviewBatchSelection } from "./ReviewBatchSelection";

export default function ReviewerFinalReviewPage() {
  const { selectedBatchId } = useReviewBatchSelection();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const batchesQuery = useQuery({
    queryKey: ["human-review", "batches"],
    queryFn: getHumanReviewBatches,
  });
  const batch = batchesQuery.data?.find((item) => item.id === selectedBatchId)
    ?? batchesQuery.data?.[0] ?? null;
  const previewQuery = useQuery({
    queryKey: ["human-review", "final-preview", batch?.id],
    queryFn: () => getHumanReviewBatchPreview(batch!.id),
    enabled: Boolean(batch),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const finalMutation = useMutation({
    mutationFn: () => submitFinalHumanReview(batch!.id, previewQuery.data!.preview_token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-review"] });
      navigate("/evaluate");
    },
  });

  if (batchesQuery.isLoading || previewQuery.isFetching) {
    return <p role="status">Loading final review preview...</p>;
  }
  if (batchesQuery.isError || previewQuery.isError) {
    const error = batchesQuery.error ?? previewQuery.error;
    return <p role="alert">Could not load final review preview: {error instanceof Error ? error.message : "Unknown error"}</p>;
  }
  if (!batch || !previewQuery.data) {
    return <p role="status">No review batch is assigned to you.</p>;
  }
  const preview = previewQuery.data;

  return (
    <div className="reviewer-dashboard">
      <div className="page-heading">
        <div className="eyebrow">BENCHMARK HUMAN REVIEW</div>
        <h1>{preview.is_final ? "Submitted final review" : "Final review preview"}</h1>
        <Link className="reviewer-back-link" to="/evaluate">Back to review dashboard</Link>
        <p>{preview.saved_cases} of {preview.total_cases} case reviews saved for {batch.dataset_version}.</p>
        {!preview.is_final && <p>Check all your labels and rationales below. Edit any case and return here before confirming. Nothing is locked until you confirm final submission.</p>}
      </div>
      {!preview.can_finalize && !preview.is_final && (
        <p role="status">Submit a review for every assigned case before final submission.</p>
      )}
      {preview.reviews.map(({ case: context, review }, index) => (
        <section className="surface-card reviewer-dashboard-section" key={review.id} aria-label={`Review ${review.case_id}`}>
          <div className="card-eyebrow">CASE {index + 1} OF {preview.total_cases}</div>
          <h2>{review.case_id}</h2>
          {typeof context?.category === "string" && <p>{formatCategory(context.category)}</p>}
          <p>Review type: <strong>{review.review_stage === "PROPOSAL_ASSISTED" ? "Proposal-assisted" : "Blind"}</strong></p>
          <div className="human-review-preview-final">
            <strong>Your label</strong>
            <p>{reviewLabel(review.label, context)}</p>
            <strong>Your rationale</strong>
            <p>{review.rationale}</p>
            {review.confidence !== null && <p>Confidence: {Math.round(review.confidence * 100)}%</p>}
            {review.context_notes && <><strong>Context notes</strong><p>{review.context_notes}</p></>}
            {review.evidence_findings && <><strong>Evidence findings</strong><pre>{JSON.stringify(review.evidence_findings, null, 2)}</pre></>}
            {review.reference_proposal_id && <p>Reference proposal: {review.reference_proposal_id}</p>}
          </div>
          {context && <details><summary>View case context and evidence</summary><ReviewCaseContext caseContext={context} heading={review.case_id} eyebrow="CASE CONTEXT" /></details>}
          {!review.is_final && !finalMutation.isPending && (
            <Link className="reviewer-secondary-button" to={`/evaluate/cases/${encodeURIComponent(review.case_id)}?returnTo=final-preview`}>
              Edit review
            </Link>
          )}
        </section>
      ))}
      {preview.can_finalize && (
        <section className="surface-card reviewer-dashboard-section" aria-label="Confirm final submission">
          <h2>Confirm final submission</h2>
          <p>This submits all {preview.total_cases} case reviews together and locks them against further edits.</p>
          {finalMutation.isError && (
            <>
              <p role="alert">Could not submit final review: {finalMutation.error instanceof Error ? finalMutation.error.message : "Unknown error"}</p>
              <button className="reviewer-secondary-button" type="button" onClick={() => {
                finalMutation.reset();
                previewQuery.refetch();
              }}>Reload preview</button>
            </>
          )}
          <button className="login-submit" type="button" disabled={finalMutation.isPending || finalMutation.isError} onClick={() => finalMutation.mutate()}>
            {finalMutation.isPending ? "Submitting..." : "Confirm and submit final review"}
          </button>
        </section>
      )}
    </div>
  );
}
