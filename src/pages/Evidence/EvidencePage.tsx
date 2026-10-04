import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalEvidence, getGoals } from "../../api/myImpact";

export default function EvidencePage() {
  const goals = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const activeGoals = (goals.data ?? []).filter((g) => g.status === "active");
  const queries = useQueries({ queries: activeGoals.map((goal) => ({ queryKey: ["goal-evidence", goal.id], queryFn: () => getGoalEvidence(goal.id) })) });
  const items = queries.flatMap((q, index) => (q.data ?? []).map((e) => ({ ...e, goalId: activeGoals[index].id, goalTitle: activeGoals[index].title })));
  if (goals.isLoading) return <p>Loading your evidence…</p>;
  return <div><div className="page-heading"><div className="eyebrow">YOUR ACHIEVEMENTS</div><h1>What you can prove</h1><p>Evidence gives your career story substance. Open an item through its goal to see the full context.</p></div><div className="detail-list">{items.map((item) => <Link className="detail-card" to={`/goals/${item.goalId}`} key={item.evidence_id}><div><span className="status-pill">{item.source_type}</span><h2>{item.title}</h2><p>{item.description || item.reason || "Evidence connected to your goal."}</p><small>{item.goalTitle} · {Math.round(item.confidence * 100)}% confidence</small></div><span className="detail-arrow">→</span></Link>)}</div>{!items.length && <div className="surface-card"><p>No achievements have been captured yet.</p></div>}</div>;
}
