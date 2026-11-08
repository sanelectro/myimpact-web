import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getHumanReviewBatches, getHumanReviewQueue } from "../../api/myImpact";
import { useReviewBatchSelection } from "./ReviewBatchSelection";
import "../HumanReview/HumanReviewPage.css";
import {
  CATEGORY_FOCUS,
  formatCategory,
} from "../HumanReview/reviewerCategories";

export default function ReviewerReviewDetailsPage() {
  const { selectedBatchId } = useReviewBatchSelection();
  const { category } = useParams();
  const selectedCategory = category ? decodeURIComponent(category) : null;
  const batchesQuery = useQuery({ queryKey: ["human-review", "batches"], queryFn: getHumanReviewBatches });
  const batch = batchesQuery.data?.find((item) => item.id === selectedBatchId)
    ?? batchesQuery.data?.[0] ?? null;
  const queueQuery = useQuery({
    queryKey: ["human-review", "queue", batch?.id],
    queryFn: () => getHumanReviewQueue(batch!.id),
    enabled: Boolean(batch),
  });

  if (batchesQuery.isLoading || queueQuery.isLoading) return <p role="status">Loading review details…</p>;
  if (batchesQuery.isError || queueQuery.isError) return <p role="alert">Could not load review details.</p>;
  if (!batch) return <p role="alert">No active review batch is assigned to you.</p>;

  const queue = queueQuery.data ?? [];
  const cases = selectedCategory
    ? queue.filter((item) => (item.category ?? "uncategorized") === selectedCategory)
    : [];

  return (
    <div className="reviewer-dashboard">
      <div className="page-heading">
        <div className="eyebrow">BENCHMARK HUMAN REVIEW</div>
        <h1>{selectedCategory ? `${formatCategory(selectedCategory)} review details` : "Review details"}</h1>
        <p>{selectedCategory ? CATEGORY_FOCUS[selectedCategory] : "Review details for the selected category."}</p>
        <Link className="reviewer-back-link" to="/evaluate">← Back to review dashboard</Link>
      </div>
      {selectedCategory ? (
        <section className="surface-card reviewer-dashboard-section">
          <div className="card-eyebrow">CASES IN THIS CATEGORY</div>
          <div className="reviewer-case-table">
            {cases.length === 0 ? (
              <p className="reviewer-muted">No assigned cases are available in this category.</p>
            ) : cases.map((item) => (
              <Link className="reviewer-history-row" key={item.case_id} to={`/evaluate/cases/${encodeURIComponent(item.case_id)}`}>
                <span><strong>{item.case_id}</strong><small>{item.submitted_by_current_user || item.has_draft ? "Reviewed by you" : "New case"}</small></span>
                <span>{item.submitted_by_current_user ? "Finalized" : item.has_draft ? "Edit review →" : "Review case →"}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <p className="reviewer-muted">Select a review category from the dashboard.</p>
      )}
    </div>
  );
}
