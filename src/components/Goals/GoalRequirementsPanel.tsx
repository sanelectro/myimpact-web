import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalRequirements } from "../../api/myImpact";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function GoalRequirementsPanel({ goalId }: { goalId: string }) {
  const query = useQuery({ queryKey: ["goal-requirements", goalId], queryFn: () => getGoalRequirements(goalId) });
  return <section className="goal-detail-card goal-hierarchy-panel">
    <div className="card-eyebrow">PROGRESSIVE REQUIREMENTS</div>
    <h2>Requirement status</h2>
    <p>Current requirement status is separate from historical validation results. Revalidate to update validation findings.</p>
    {query.isLoading ? <p role="status">Loading requirements…</p> : query.isError ? (
      <p className="form-error" role="alert">Could not load requirements: {query.error.message}</p>
    ) : query.data && <>
      <p>Goal version {query.data.goal_version} · evaluated on {query.data.evaluated_on}</p>
      <ul>{query.data.requirements.map((item) => <li key={item.requirement}>
        <strong>{label(item.requirement)}</strong>: {label(item.state)} · {label(item.classification)}
      </li>)}</ul>
      {query.data.deferred_requirements.length > 0 && <>
        <h3>Deferral details</h3>
        <ul>{query.data.deferred_requirements.map((item) => <li key={item.requirement}>
          <strong>{label(item.requirement)} · {label(item.state)}</strong>: {item.reason}
          {item.due_date && ` · due ${item.due_date}`}
          {item.resolution_stage && ` · resolution stage: ${item.resolution_stage}`}
          {item.resolution_reason && ` · resolution: ${item.resolution_reason}`}
          {item.related_child_goal_id && <> · <Link to={`/goals/${encodeURIComponent(item.related_child_goal_id)}`}>Related child goal</Link></>}
        </li>)}</ul>
      </>}
      <Link to={`/goals/${encodeURIComponent(goalId)}/edit`}>Edit goal and deferrals</Link>
    </>}
  </section>;
}
