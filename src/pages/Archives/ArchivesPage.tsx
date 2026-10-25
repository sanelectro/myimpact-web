import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  deleteArchivedEvidence,
  deleteArchivedGoal,
  deleteArchivedMilestone,
  getArchives,
} from "../../api/myImpact";
import "./Archives.css";

type DeleteRequest =
  | { kind: "goal"; id: string }
  | { kind: "evidence"; id: string }
  | { kind: "milestone"; id: string; goalId: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ArchivesPage() {
  const queryClient = useQueryClient();
  const archives = useQuery({ queryKey: ["archives"], queryFn: getArchives });
  const deleteMutation = useMutation({
    mutationFn: (item: DeleteRequest) => {
      if (item.kind === "goal") return deleteArchivedGoal(item.id);
      if (item.kind === "evidence") return deleteArchivedEvidence(item.id);
      return deleteArchivedMilestone(item.goalId, item.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["archives"] }),
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
        queryClient.invalidateQueries({ queryKey: ["goal"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-evidence"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-milestones"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-assessment"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-impact"] }),
        queryClient.invalidateQueries({ queryKey: ["goal-insight"] }),
      ]);
    },
  });

  if (archives.isLoading) return <p>Loading your archives…</p>;
  if (archives.isError) {
    return (
      <article className="surface-card error-card" role="alert">
        <h2>We could not load your archives</h2>
        <p>{archives.error instanceof Error ? archives.error.message : "The archive data could not be loaded."}</p>
      </article>
    );
  }
  if (!archives.data) return <p>Archive data is unavailable.</p>;

  const { goals, evidence, milestones } = archives.data;
  const hasItems = goals.length + evidence.length + milestones.length > 0;

  function confirmDelete(item: DeleteRequest, title: string) {
    const relatedDataWarning = item.kind === "goal"
      ? " Its milestones and goal-linked impact records will also be deleted."
      : "";
    if (window.confirm(`Permanently delete “${title}”?${relatedDataWarning} This cannot be undone.`)) {
      deleteMutation.mutate(item);
    }
  }

  return (
    <div className="archives-page">
      <div className="page-heading">
        <div className="eyebrow">YOUR HISTORY</div>
        <h1>Archives</h1>
        <p>Archived goals, evidence, and milestones stay here until you permanently delete them.</p>
      </div>

      {deleteMutation.isError && (
        <div className="archives-error" role="alert">
          Could not delete this item: {deleteMutation.error instanceof Error ? deleteMutation.error.message : "Unknown error"}
        </div>
      )}

      {!hasItems ? (
        <article className="surface-card archives-empty">
          <h2>Your archive is clear</h2>
          <p>When you archive a goal, piece of evidence, or milestone, it will appear here.</p>
          <Link className="text-link" to="/goals">Go to your goals →</Link>
        </article>
      ) : (
        <>
          <ArchiveSection title="Goals" count={goals.length}>
            {goals.map((goal) => (
              <article className="archive-card surface-card" key={goal.id}>
                <div className="archive-card-content">
                  <span className="archive-kind">Goal · Archived {formatDate(goal.updated_at)}</span>
                  <h2><Link to={`/goals/${goal.id}`}>{goal.title}</Link></h2>
                  <p>{goal.deactivation_reason || goal.description || "No archive reason recorded."}</p>
                </div>
                <button
                  className="archive-delete-button"
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => confirmDelete({ kind: "goal", id: goal.id }, goal.title)}
                >
                  Delete permanently
                </button>
              </article>
            ))}
          </ArchiveSection>

          <ArchiveSection title="Evidence" count={evidence.length}>
            {evidence.map((item) => (
              <article className="archive-card surface-card" key={item.id}>
                <div className="archive-card-content">
                  <span className="archive-kind">Evidence · Archived {formatDate(item.archived_at)}</span>
                  <h2>{item.title}</h2>
                  <p>{item.description || `Captured ${formatDate(item.captured_at)} · ${item.source_type}`}</p>
                  {item.goal_titles.length > 0 && <small>Connected goals: {item.goal_titles.join(", ")}</small>}
                </div>
                <button
                  className="archive-delete-button"
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => confirmDelete({ kind: "evidence", id: item.id }, item.title)}
                >
                  Delete permanently
                </button>
              </article>
            ))}
          </ArchiveSection>

          <ArchiveSection title="Milestones" count={milestones.length}>
            {milestones.map((item) => (
              <article className="archive-card surface-card" key={item.id}>
                <div className="archive-card-content">
                  <span className="archive-kind">
                    Milestone · {item.source === "ai" ? "AI suggested" : "Manually added"} · Archived {formatDate(item.archived_at)}
                  </span>
                  <h2>{item.title}</h2>
                  <p>{item.description || item.completion_criteria || "No additional details."}</p>
                  <small>Goal: <Link to={`/goals/${item.goal_id}`}>{item.goal_title}</Link></small>
                </div>
                <button
                  className="archive-delete-button"
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => confirmDelete(
                    { kind: "milestone", id: item.id, goalId: item.goal_id },
                    item.title,
                  )}
                >
                  Delete permanently
                </button>
              </article>
            ))}
          </ArchiveSection>
        </>
      )}
    </div>
  );
}

function ArchiveSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="archive-section">
      <div className="archive-section-heading">
        <h2>{title}</h2>
        <span>{count}</span>
      </div>
      {count > 0 ? <div className="archive-list">{children}</div> : (
        <p className="archive-section-empty">No {title.toLowerCase()} have been archived.</p>
      )}
    </section>
  );
}
