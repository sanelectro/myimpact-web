import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getGoalEvidence, getGoalImpact, getGoalInsight, getGoals } from "../../api/myImpact";

export default function GoalDetailPage() {
  const { goalId } = useParams();
  const goals = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const goal = goals.data?.find((item) => item.id === goalId);
  const evidence = useQuery({ queryKey: ["goal-evidence", goalId], queryFn: () => getGoalEvidence(goalId!), enabled: Boolean(goalId) });
  const impact = useQuery({ queryKey: ["goal-impact", goalId], queryFn: () => getGoalImpact(goalId!), enabled: Boolean(goalId) });
  const insight = useQuery({ queryKey: ["goal-insight", goalId], queryFn: () => getGoalInsight(goalId!), enabled: Boolean(goalId && impact.data?.length) });
  if (goals.isLoading) return <p>Loading goal…</p>;
  if (!goal) return <p>Goal not found. <Link to="/goals">Back to goals</Link></p>;
  return <div><Link className="back-link" to="/goals">← All goals</Link><div className="page-heading"><div className="eyebrow">GOAL DETAIL</div><h1>{goal.title}</h1><p>{goal.description}</p></div><div className="detail-grid"><section className="surface-card"><div className="card-eyebrow">YOUR ACHIEVEMENTS</div><h2>{evidence.data?.length ?? 0} pieces of evidence</h2>{evidence.data?.map((item) => <div className="mini-item" key={item.evidence_id}><strong>{item.title}</strong><span>{Math.round(item.confidence * 100)}% confidence</span></div>)}</section><section className="surface-card"><div className="card-eyebrow">YOUR IMPACT</div><h2>{impact.data?.length ?? 0} impact results</h2>{impact.data?.map((item) => <div className="mini-item" key={item.id}><strong>{item.impact_summary}</strong><span>{item.impact_type}</span></div>)}</section></div>{insight.data && <section className="surface-card insight-detail"><div className="card-eyebrow">CAREER INSIGHT</div><h2>{insight.data.headline}</h2><p>{insight.data.summary}</p></section>}</div>;
}
