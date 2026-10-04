import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getGoalImpact, getGoals } from "../../api/myImpact";

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ImpactDetailPage() {
  const { assessmentId } = useParams();
  const goals = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const activeGoals = (goals.data ?? []).filter((g) => g.status === "active");
  const queries = useQueries({
    queries: activeGoals.map((goal) => ({
      queryKey: ["goal-impact", goal.id],
      queryFn: () => getGoalImpact(goal.id),
    })),
  });
  const result = queries
    .flatMap((query, index) => (query.data ?? []).map((item) => ({ ...item, goal: activeGoals[index] })))
    .find((item) => item.id === assessmentId);

  if (goals.isLoading) return <p>Loading impact…</p>;
  if (!result) return <p>Impact result not found. <Link to="/impact">Back to impact</Link></p>;

  return (
    <div>
      <Link className="back-link" to="/impact">← All impact</Link>
      <div className="page-heading">
        <div className="eyebrow">IMPACT DETAIL</div>
        <h1>{result.impact_summary}</h1>
        <p>Connected to <Link className="text-link" to={`/goals/${result.goal_id}`}>{result.goal.title}</Link>.</p>
      </div>
      <div className="detail-grid">
        <section className="surface-card">
          <div className="card-eyebrow">IMPACT AREA</div>
          <h2>{label(result.impact_type)}</h2>
          <p>This is the type of difference your achievement demonstrates.</p>
        </section>
        <section className="surface-card">
          <div className="card-eyebrow">STRENGTH</div>
          <h2>{Math.round(result.impact_score * 100)}%</h2>
          <p>Assessment confidence: {Math.round(result.confidence * 100)}%.</p>
        </section>
      </div>
    </div>
  );
}
