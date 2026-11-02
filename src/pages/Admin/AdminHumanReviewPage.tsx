import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  getHumanReviewAdjudications,
  getHumanReviewBatches,
  getHumanReviewProgress,
  submitHumanReviewAdjudication,
} from "../../api/myImpact";
import "../HumanReview/HumanReviewPage.css";
import ReviewCaseContext from "../HumanReview/ReviewCaseContext";

const LABELS = ["NOT_ASSESSED", "NOT_STARTED", "IN_PROGRESS", "MET", "NEEDS_REVIEW"];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function AdminHumanReviewPage() {
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [finalLabel, setFinalLabel] = useState("");
  const [rationale, setRationale] = useState("");
  const batchesQuery = useQuery({
    queryKey: ["human-review", "batches"],
    queryFn: getHumanReviewBatches,
  });
  const batch = batchesQuery.data?.[0] ?? null;
  const progressQuery = useQuery({
    queryKey: ["human-review", "progress", batch?.id],
    queryFn: () => getHumanReviewProgress(batch!.id),
    enabled: Boolean(batch),
  });
  const queueQuery = useQuery({
    queryKey: ["human-review", "adjudications", batch?.id],
    queryFn: () => getHumanReviewAdjudications(batch!.id),
    enabled: Boolean(batch),
  });
  const selected = queueQuery.data?.find(
    (item) => item.case?.case_id === selectedCaseId,
  );
  const submitMutation = useMutation({
    mutationFn: () =>
      submitHumanReviewAdjudication(batch!.id, selectedCaseId!, {
        final_label: finalLabel,
        rationale,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-review"] });
      setSelectedCaseId(null);
      setFinalLabel("");
      setRationale("");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMutation.reset();
    submitMutation.mutate();
  }

  if (batchesQuery.isLoading) return <p role="status">Loading review batches…</p>;
  if (batchesQuery.isError) {
    return <p role="alert">Could not load review batches: {errorMessage(batchesQuery.error)}</p>;
  }
  if (!batch) return <p role="status">No review batch is available.</p>;

  return (
    <div className="human-review-page">
      <div className="page-heading">
        <div className="eyebrow">M6.6 ADJUDICATION</div>
        <h1>Review governance</h1>
        <p>Resolve only explicit disagreements after both independent reviews are submitted.</p>
      </div>
      {progressQuery.data && (
        <section className="surface-card human-review-queue">
          <div className="card-eyebrow">PROGRESS</div>
          <p>
            {progressQuery.data.agreed} agreed · {progressQuery.data.disagreement} awaiting adjudication ·{" "}
            {progressQuery.data.adjudicated} adjudicated of {progressQuery.data.total_cases} cases
          </p>
        </section>
      )}
      <div className="human-review-layout">
        <section className="surface-card human-review-queue">
          <div className="card-eyebrow">DISAGREEMENTS</div>
          {queueQuery.isLoading && <p role="status">Loading disagreements…</p>}
          {queueQuery.isError && (
            <p role="alert">Could not load disagreements: {errorMessage(queueQuery.error)}</p>
          )}
          {!queueQuery.data?.length && <p>No disagreements require adjudication.</p>}
          <div className="human-review-case-list">
            {(queueQuery.data ?? []).map((item) => {
              const caseId = typeof item.case?.case_id === "string" ? item.case.case_id : "";
              return (
                <button
                  className={caseId === selectedCaseId ? "human-review-case selected" : "human-review-case"}
                  key={caseId}
                  type="button"
                  onClick={() => {
                    setSelectedCaseId(caseId);
                    setFinalLabel("");
                    setRationale("");
                  }}
                >
                  <span>{caseId}</span>
                  <small>{item.status}</small>
                </button>
              );
            })}
          </div>
        </section>
        <section className="surface-card human-review-detail">
          {!selected ? (
            <p>Select a disagreement to inspect both independent rationales.</p>
          ) : (
            <>
              <ReviewCaseContext
                caseContext={selected.case ?? {}}
                heading={selectedCaseId ?? ""}
                eyebrow="ADJUDICATION CONTEXT"
              />
              <div className="human-review-context">
                {selected.reviews.map((review) => (
                  <div key={review.id}>
                    <dt>Reviewer {review.reviewer_user_id}</dt>
                    <dd><strong>{review.label}</strong>: {review.rationale}</dd>
                  </div>
                ))}
              </div>
              <form className="human-review-form" onSubmit={submit}>
                <label>
                  Final label
                  <select value={finalLabel} onChange={(event) => setFinalLabel(event.target.value)} required>
                    <option value="">Select a label</option>
                    {LABELS.map((label) => <option key={label} value={label}>{label}</option>)}
                  </select>
                </label>
                <label>
                  Adjudication rationale
                  <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={7} required />
                </label>
                {submitMutation.isError && (
                  <p role="alert">Could not submit adjudication: {errorMessage(submitMutation.error)}</p>
                )}
                <button className="login-submit" type="submit" disabled={!finalLabel || !rationale.trim() || submitMutation.isPending}>
                  {submitMutation.isPending ? "Submitting…" : "Submit adjudication"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
