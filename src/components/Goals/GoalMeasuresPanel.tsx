import { useQuery } from "@tanstack/react-query";
import { getGoalAssessment, getGoalMeasures } from "../../api/myImpact";

function percentage(value: number | null) {
  return value === null ? "Not assessed" : `${value}%`;
}

export default function GoalMeasuresPanel({ goalId }: { goalId: string }) {
  const query = useQuery({ queryKey: ["goal-measures", goalId], queryFn: () => getGoalMeasures(goalId) });
  const assessment = useQuery({ queryKey: ["goal-assessment", goalId], queryFn: () => getGoalAssessment(goalId) });
  return <section className="goal-detail-card goal-hierarchy-panel">
    <div className="card-eyebrow">SEPARATE MEASURES</div>
    <h2>Execution, outcome and impact</h2>
    {query.isLoading ? <p role="status">Loading measures…</p> : query.isError ? (
      <p className="form-error" role="alert">Could not load measures: {query.error.message}</p>
    ) : query.data && <>
      <h3>Direct child execution</h3>
      <p>{query.data.child_execution.total} direct children. Counts reflect lifecycle status, not a weighted progress score.</p>
      {Object.keys(query.data.child_execution.by_status).length > 0 && <ul>
        {Object.entries(query.data.child_execution.by_status).map(([status, count]) => <li key={status}>{status}: {count}</li>)}
      </ul>}
      <h3>Own criterion assessment</h3>
      {assessment.isLoading ? <p role="status">Loading criterion assessment…</p> : assessment.isError ? (
        <p className="form-error" role="alert">Could not load criterion assessment: {assessment.error.message}</p>
      ) : assessment.data && <p>{assessment.data.assessed_criteria_count} of {assessment.data.criteria_count} criteria assessed.
        Evidence coverage: {percentage(assessment.data.evidence_coverage_percentage)}.</p>}
      <h3>Outcome achievement</h3>
      <p>Not determined. Existing criteria are not classified as outcomes.</p>
      <h3>Demonstrated impact</h3>
      <p>Not determined by child completion. Per-evidence advisory impact assessments are shown separately below.</p>
    </>}
  </section>;
}
