import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  getHumanReviewBatches,
  getHumanReviewCase,
  getHumanReviewQueue,
  submitHumanReview,
} from "../../api/myImpact";
import "./HumanReviewPage.css";
import ReviewCaseContext from "./ReviewCaseContext";

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

function formatDate(value: string | null | undefined) {
  if (!value) return "Not yet";
  return new Date(value).toLocaleString();
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
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [rationale, setRationale] = useState("");

  const batchesQuery = useQuery({
    queryKey: ["human-review", "batches"],
    queryFn: getHumanReviewBatches,
  });
  const batch = batchesQuery.data?.[0] ?? null;
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
  const submitMutation = useMutation({
    mutationFn: () =>
      submitHumanReview(batch!.id, selectedCaseId!, { label, rationale }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["human-review"] });
      setLabel("");
      setRationale("");
    },
  });

  function selectCase(caseId: string) {
    setSelectedCaseId(caseId);
    setLabel("");
    setRationale("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMutation.reset();
    submitMutation.mutate();
  }

  if (batchesQuery.isLoading) return <p role="status">Loading review assignments…</p>;
  if (batchesQuery.isError) {
    return <p role="alert">Could not load review assignments: {errorMessage(batchesQuery.error)}</p>;
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
      label &&
      rationale.trim(),
  );

  return (
    <div className="human-review-page">
      <div className="page-heading">
        <div className="eyebrow">M6.6 HUMAN REVIEW</div>
        <h1>Independent case review</h1>
        <p>
          Review the case context and choose the answer supported by the
          information provided. This case tests{" "}
          <strong>{typeof caseContext.category === "string" ? caseContext.category.replaceAll("_", " ") : "intelligence evaluation"}</strong>.
        </p>
      </div>

      <div className="human-review-layout">
        <section className="surface-card human-review-queue">
          <div className="card-eyebrow">ASSIGNED CASES</div>
          <p className="human-review-version">{batch.dataset_version}</p>
          <p className="human-review-version">
            Review batch started {formatDate(batch.started_at)} · {batch.status}
          </p>
          {queueQuery.isLoading && <p role="status">Loading cases…</p>}
          {queueQuery.isError && (
            <p role="alert">Could not load cases: {errorMessage(queueQuery.error)}</p>
          )}
          <div className="human-review-case-list">
            {(queueQuery.data ?? []).map((item) => (
              <button
                className={item.case_id === selectedCaseId ? "human-review-case selected" : "human-review-case"}
                key={item.case_id}
                type="button"
                onClick={() => selectCase(item.case_id)}
              >
                <span>{item.case_id}</span>
                <small>
                  {item.category ? item.category.replaceAll("_", " ") : item.status}
                  {item.submitted_by_current_user ? " · Submitted" : ""}
                </small>
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card human-review-detail">
          {!selectedCaseId ? (
            <p>Select an assigned case to review.</p>
          ) : caseQuery.isLoading ? (
            <p role="status">Loading case context…</p>
          ) : caseQuery.isError ? (
            <p role="alert">Could not load case context: {errorMessage(caseQuery.error)}</p>
          ) : (
            <>
              <ReviewCaseContext
                caseContext={caseContext}
                heading={selectedCaseId}
                eyebrow="CASE CONTEXT"
              />
              {selectedSummary?.submitted_by_current_user ? (
                <>
                  <p className="human-review-submitted" role="status">
                    Your independent review has been submitted and cannot be changed.
                  </p>
                  <section className="human-review-ai-assessment" aria-labelledby="ai-assessment-heading">
                    <div className="card-eyebrow">AI ASSESSMENT</div>
                    <h3 id="ai-assessment-heading">What the AI decided</h3>
                    {caseQuery.data?.ai_assessment ? (
                      <>
                        <p>
                          <strong>
                            {displayAiLabel(
                              caseContext,
                              caseQuery.data.ai_assessment.assessment_label,
                            )}
                          </strong>
                          {" "}with {Math.round((caseQuery.data.ai_assessment.confidence ?? 0) * 100)}% confidence.
                        </p>
                        <p>
                          Human choice: <strong>{caseQuery.data.own_review?.label}</strong>
                          {" — "}
                          {caseQuery.data.own_review?.label ===
                          displayAiLabel(
                            caseContext,
                            caseQuery.data.ai_assessment.assessment_label,
                          )
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
                </>
              ) : (
                <form className="human-review-form" onSubmit={submit}>
                  <label>
                    Your label
                    <select value={label} onChange={(event) => setLabel(event.target.value)} required>
                      <option value="">Select a label</option>
                      {reviewLabelOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Rationale
                    <textarea
                      value={rationale}
                      onChange={(event) => setRationale(event.target.value)}
                      minLength={1}
                      maxLength={10000}
                      required
                      rows={7}
                    />
                  </label>
                  {submitMutation.isError && (
                    <p role="alert">Could not submit review: {errorMessage(submitMutation.error)}</p>
                  )}
                  <button className="login-submit" type="submit" disabled={!canSubmit || submitMutation.isPending}>
                    {submitMutation.isPending ? "Submitting…" : "Submit independent review"}
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
