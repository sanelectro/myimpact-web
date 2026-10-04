import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalImpact, getGoals } from "../../api/myImpact";

function label(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

export default function ImpactPage() {
  const goals = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const activeGoals = (goals.data ?? []).filter((g) => g.status === "active");
  const queries = useQueries({ queries: activeGoals.map((goal) => ({ queryKey: ["goal-impact", goal.id], queryFn: () => getGoalImpact(goal.id) })) });
  const items = queries.flatMap((q, index) => (q.data ?? []).map((a) => ({ ...a, goalTitle: activeGoals[index].title })));
  if (goals.isLoading) return <p>Loading your impact…</p>;
  return <div><div className="page-heading"><div className="eyebrow">YOUR IMPACT</div><h1>Where your work is making a difference</h1><p>Explore the outcomes and impact areas connected to your achievements.</p></div><div className="detail-list">{items.map((item) => <Link className="detail-card" to={`/goals/${item.goal_id}`} key={item.id}><div><span className="status-pill">{label(item.impact_type)}</span><h2>{item.impact_summary}</h2><p>{item.goalTitle}</p></div><div className="impact-detail-score">{Math.round(item.impact_score * 100)}%</div></Link>)}</div>{!items.length && <div className="surface-card"><p>No impact results have been generated yet.</p></div>}</div>;
}
