import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoals } from "../../api/myImpact";

export default function GoalsPage() {
  const query = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  if (query.isLoading) return <p>Loading your goals…</p>;
  if (query.isError) return <p>Could not load your goals: {query.error instanceof Error ? query.error.message : "Unknown error"}</p>;
  const goals = query.data ?? [];
  return <div><div className="page-heading"><div className="eyebrow">YOUR GOALS</div><h1>What you’re working toward</h1><p>Review each goal and open it to see the evidence and impact connected to it.</p></div><div className="detail-list">{goals.map((goal) => <Link className="detail-card" to={`/goals/${goal.id}`} key={goal.id}><div><span className="status-pill">{goal.status}</span><h2>{goal.title}</h2><p>{goal.description}</p></div><span className="detail-arrow">→</span></Link>)}</div></div>;
}
