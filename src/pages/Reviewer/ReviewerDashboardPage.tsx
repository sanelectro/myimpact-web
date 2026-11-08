import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useReviewBatchSelection } from "./ReviewBatchSelection";
import {
  getHumanReviewBatches,
  getHumanReviewQueue,
} from "../../api/myImpact";
import "../HumanReview/HumanReviewPage.css";
import {
  CATEGORY_FOCUS,
  formatCategory,
  REVIEW_CATEGORY_GROUPS,
} from "../HumanReview/reviewerCategories";

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}

export default function ReviewerDashboardPage() {
  const { selectedBatchId, selectBatch } = useReviewBatchSelection();
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "REVIEWED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
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

  if (batchesQuery.isLoading || queueQuery.isLoading) {
    return <p role="status">Loading review status…</p>;
  }
  if (batchesQuery.isError || queueQuery.isError) {
    return <p role="alert">Could not load your review status.</p>;
  }
  if (!batch) {
    return (
      <section className="surface-card human-review-empty">
        <div className="eyebrow">REVIEW DASHBOARD</div>
        <h1>No active review batch</h1>
        <p>You do not have an active evaluation review batch assigned to you.</p>
      </section>
    );
  }

  const queue = queueQuery.data ?? [];
  const reviewedCases = queue
    .filter((item) => item.submitted_by_current_user || item.has_draft)
    .sort((left, right) =>
      (right.last_reviewed_at ?? "").localeCompare(left.last_reviewed_at ?? ""),
    );
  const categoryCounts = Array.from(
    queue.reduce((counts, item) => {
      const category = item.category ?? "uncategorized";
      const current = counts.get(category) ?? { total: 0, reviewed: 0 };
      counts.set(category, {
        total: current.total + 1,
        reviewed: current.reviewed + (item.submitted_by_current_user || item.has_draft ? 1 : 0),
      });
      return counts;
    }, new Map<string, { total: number; reviewed: number }>()),
  ).sort(([left], [right]) => left.localeCompare(right));
  const newCount = queue.length - reviewedCases.length;
  const completionPercentage = queue.length === 0
    ? 0
    : Math.round((reviewedCases.length / queue.length) * 100);
  const categories = Array.from(
    new Set(queue.map((item) => item.category ?? "uncategorized")),
  ).sort();
  const groupedCategoryIds = new Set<string>(
    REVIEW_CATEGORY_GROUPS.flatMap((group) => group.categories),
  );
  const otherCategories = categoryCounts.filter(
    ([category]) => !groupedCategoryIds.has(category),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredQueue = queue.filter((item) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "REVIEWED" && (item.submitted_by_current_user || item.has_draft)) ||
      (statusFilter === "PENDING" && !item.submitted_by_current_user && !item.has_draft);
    const matchesCategory =
      categoryFilter === "ALL" ||
      (item.category ?? "uncategorized") === categoryFilter;
    const matchesSearch =
      !normalizedSearch || item.case_id.toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesCategory && matchesSearch;
  });
  const nextPendingCase = queue.find((item) => !item.submitted_by_current_user && !item.has_draft);
  const allSaved = queue.length > 0 && reviewedCases.length === queue.length;
  const allFinal = queue.length > 0 && queue.every((item) => item.submitted_by_current_user);

  return (
    <div className="reviewer-dashboard">
      <div className="page-heading">
        <div className="eyebrow">BENCHMARK HUMAN REVIEW</div>
        <h1>Review dashboard</h1>
        <p>Submit each case to save an editable review. After all cases are saved, preview and submit your final review here.</p>
      </div>

      <section className="surface-card reviewer-dashboard-header">
        <div>
          <div className="card-eyebrow">CURRENT REVIEW BATCH</div>
          <h2>{batch.dataset_version}</h2>
          {batchesQuery.data && batchesQuery.data.length > 1 && (
            <label>
              Review batch
              <select value={batch.id} onChange={(event) => {
                selectBatch(event.target.value);
                setStatusFilter("ALL");
                setCategoryFilter("ALL");
                setSearch("");
              }}>
                {batchesQuery.data.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.dataset_id === "goal-validation-v1" && item.dataset_version === "1.0.0"
                      ? "Goal Validation proposals (1.0.0)"
                      : item.dataset_id === "goal-validation"
                        ? `${item.dataset_version} (blind)`
                        : item.dataset_version}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>Started {formatDate(batch.started_at)} · {batch.status}</p>
        </div>
      </section>

      {allSaved && (
        <section className="surface-card reviewer-dashboard-section" aria-label="Final review submission">
          {allFinal ? (
            <>
              <p role="status">Your final review has been submitted. Your primary case reviews are now locked.</p>
              <Link className="reviewer-secondary-button" to="/evaluate/final-review">View submitted reviews</Link>
            </>
          ) : (
            <>
              <h2>All {queue.length} case reviews are saved</h2>
              <p>You can still edit any case. Preview all your entries before confirming final submission.</p>
              <Link className="reviewer-action-button" to="/evaluate/final-review">Submit final review</Link>
            </>
          )}
        </section>
      )}

      <section className="reviewer-stat-grid" aria-label="Review status">
        <article className="surface-card"><strong>{newCount}</strong><span>Cases to review</span></article>
        <article className="surface-card"><strong>{reviewedCases.length}</strong><span>Reviewed by you</span></article>
        <article className="surface-card"><strong>{queue.length}</strong><span>Total assigned</span></article>
        <article className="surface-card"><strong>{completionPercentage}%</strong><span>Completion</span></article>
      </section>

      <section className="surface-card reviewer-progress-card" aria-label="Overall review progress">
        <div className="reviewer-progress-heading">
          <div>
            <div className="card-eyebrow">OVERALL PROGRESS</div>
            <strong>{reviewedCases.length} of {queue.length} reviewed</strong>
          </div>
          {nextPendingCase && (
            <Link className="reviewer-action-button" to={`/evaluate/cases/${encodeURIComponent(nextPendingCase.case_id)}`}>
              Review next pending case
            </Link>
          )}
        </div>
        <div className="reviewer-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercentage} aria-label={`${completionPercentage}% of assigned cases reviewed`}>
          <span style={{ width: `${completionPercentage}%` }} />
        </div>
      </section>

      <div className="reviewer-dashboard-grid">
        <section className="surface-card reviewer-dashboard-section">
          <div className="card-eyebrow">REVIEW CATEGORIES</div>
          <h2>Coverage by category</h2>
          <div className="reviewer-category-groups">
            {REVIEW_CATEGORY_GROUPS.map((group) => {
              const groupCounts = group.categories
                .flatMap((category) => {
                  const counts = categoryCounts.find(([item]) => item === category)?.[1];
                  return counts ? [[category, counts] as const] : [];
                });
              if (groupCounts.length === 0) return null;
              const groupTotal = groupCounts.reduce(
                (total, [, counts]) => total + counts.total,
                0,
              );
              const groupReviewed = groupCounts.reduce(
                (total, [, counts]) => total + counts.reviewed,
                0,
              );
              return (
                <details className="reviewer-category-group" key={group.id} open>
                  <summary><h3>{group.label}</h3></summary>
                  <div className="reviewer-category-group-header">
                    <p>{group.description}</p>
                    <strong>
                      Total cases: {groupTotal} · Reviewed: {groupReviewed}/{groupTotal}
                    </strong>
                  </div>
                  <div className="reviewer-category-list">
                    {groupCounts.map(([category, counts]) => (
                      <Link className="reviewer-category-card" key={category} to={`/evaluate/reviews/${encodeURIComponent(category)}`}>
                        <span>
                          <strong>{formatCategory(category)}</strong>
                          <small>
                            {CATEGORY_FOCUS[category]} · {counts.total} {counts.total === 1 ? "case" : "cases"}
                          </small>
                        </span>
                        <b>{counts.reviewed}/{counts.total} reviewed</b>
                      </Link>
                    ))}
                  </div>
                  </details>
              );
            })}
              {otherCategories.length > 0 && (
                <details className="reviewer-category-group" open>
                  <summary><h3>Other review areas</h3></summary>
                  <div className="reviewer-category-group-header">
                    <p>Additional categories present in this batch.</p>
                    <strong>
                      Total cases: {otherCategories.reduce((total, [, counts]) => total + counts.total, 0)}
                    </strong>
                  </div>
                  <div className="reviewer-category-list">
                    {otherCategories.map(([category, counts]) => (
                      <Link className="reviewer-category-card" key={category} to={`/evaluate/reviews/${encodeURIComponent(category)}`}>
                        <span>
                          <strong>{formatCategory(category)}</strong>
                          <small>{counts.total} {counts.total === 1 ? "case" : "cases"} in this batch</small>
                        </span>
                        <b>{counts.reviewed}/{counts.total} reviewed</b>
                      </Link>
                    ))}
                  </div>
                </details>
              )}
          </div>
        </section>

        {reviewedCases.length > 0 && (
          <section className="surface-card reviewer-dashboard-section">
            <div className="card-eyebrow">REVIEW HISTORY</div>
            <h2>Recently saved</h2>
            <div className="reviewer-history-list">
              {reviewedCases.slice(0, 10).map((item) => (
                <Link className="reviewer-history-row" key={item.case_id} to={`/evaluate/cases/${encodeURIComponent(item.case_id)}`}>
                  <span><strong>{item.case_id}</strong><small>{formatCategory(item.category ?? "uncategorized")}</small></span>
                  <time dateTime={item.last_reviewed_at ?? undefined}>{formatDate(item.last_reviewed_at)}</time>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="surface-card reviewer-dashboard-section" aria-labelledby="review-queue-heading">
        <div className="card-eyebrow">REVIEW QUEUE</div>
        <h2 id="review-queue-heading">Find a case</h2>
        <div className="reviewer-queue-filters">
          <label>
            Search case ID
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. v2-valid-goal" />
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="ALL">All cases</option>
              <option value="PENDING">Pending review</option>
              <option value="REVIEWED">Reviewed</option>
            </select>
          </label>
          <label>
            Category
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="ALL">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{formatCategory(category)}</option>)}
            </select>
          </label>
        </div>
        {filteredQueue.length === 0 ? (
          <p className="reviewer-muted">No cases match the selected filters.</p>
        ) : (
          <div className="reviewer-queue-list">
            {filteredQueue.map((item) => (
              <Link className="reviewer-history-row" key={item.case_id} to={`/evaluate/cases/${encodeURIComponent(item.case_id)}`}>
                <span><strong>{item.case_id}</strong><small>{formatCategory(item.category ?? "uncategorized")}</small></span>
                <span>{item.submitted_by_current_user ? "Finalized" : item.has_draft ? "Saved · Edit review" : "Pending review"} →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
