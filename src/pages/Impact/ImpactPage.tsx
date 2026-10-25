import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalAssessment, getGoalImpact, getGoals } from "../../api/myImpact";
import type { GoalAssessment } from "../../types/api";

type Guidance = {
  optional?: boolean;
  title: string;
  intro: string;
  steps: [string, string][];
};

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getGuidance(assessment: GoalAssessment): Guidance | null {
  if (assessment.criteria_count === 0) return null;

  if (assessment.assessed_criteria_count === 0) {
    return {
      title: "Start with evidence for your criteria",
      intro: "No approved criteria have current assessments yet. Review the criteria and attach relevant evidence to begin.",
      steps: [
        ["Review the criteria", "Confirm the approved criterion definitions reflect the goal."],
        ["Attach relevant evidence", "Use source-linked evidence that can support or challenge a criterion assessment."],
      ],
    };
  }

  if (assessment.criteria.some(
    (criterion) =>
      criterion.result === "NEEDS_REVIEW"
      || criterion.lifecycle_state === "STALE"
      || criterion.lifecycle_state === "OBSOLETE",
  )) {
    return {
      title: "Review the current evidence assessment",
      intro: "One or more criterion assessments need review or may be out of date.",
      steps: [
        ["Inspect the cited evidence", "Check source validity and whether the evidence supports or contradicts the conclusion."],
        ["Reanalyze when inputs change", "Refresh the assessment after relevant evidence or criterion updates."],
      ],
    };
  }

  if (assessment.criteria_met_count === assessment.criteria_count) {
    return {
      optional: true,
      title: "All assessed criteria are met",
      intro: "Review the supporting evidence and rationale. An AI assessment is not manager approval.",
      steps: [
        ["Confirm or challenge the assessment", "Record your feedback without changing the original AI assessment."],
        ["Keep evidence current", "Reanalyze when criterion inputs or evidence change."],
        ["Review source status", "Verify the evidence source and review state before relying on the conclusion."],
      ],
    };
  }

  if (assessment.goal_progress_percentage !== null) {
    return {
      title: "Continue making progress",
      intro: `${assessment.criteria_met_count} of ${assessment.criteria_count} criteria are met. The calculated goal progress is ${assessment.goal_progress_percentage}%.`,
      steps: [
        ["Review partial criteria", "Check which evidence supports progress and what completion conditions remain."],
        ["Add relevant evidence", "Attach evidence that demonstrates outcomes tied to the criterion."],
      ],
    };
  }

  return null;
}

export default function ImpactPage() {
  const goals = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const activeGoals = (goals.data ?? []).filter((g) => g.status === "active");
  const impactQueries = useQueries({
    queries: activeGoals.map((goal) => ({
      queryKey: ["goal-impact", goal.id],
      queryFn: () => getGoalImpact(goal.id),
    })),
  });
  const assessmentQueries = useQueries({
    queries: activeGoals.map((goal) => ({
      queryKey: ["goal-assessment", goal.id],
      queryFn: () => getGoalAssessment(goal.id),
    })),
  });
  const items = impactQueries.flatMap((query, index) =>
    (query.data ?? []).map((item) => ({ ...item, goalTitle: activeGoals[index].title })),
  );
  const guidanceItems = assessmentQueries.flatMap((query, index) => {
    if (!query.data) return [];
    const guidance = getGuidance(query.data);
    return guidance ? [{ ...guidance, goalId: activeGoals[index].id, goalTitle: activeGoals[index].title }] : [];
  });
  const assessmentError = assessmentQueries.find((query) => query.isError)?.error;

  if (goals.isLoading) return <p>Loading your impact…</p>;

  return (
    <div>
      <div className="page-heading">
        <div className="eyebrow">YOUR IMPACT</div>
        <h1>Where your work is making a difference</h1>
        <p>Explore the outcomes and impact areas connected to your achievements.</p>
      </div>

      {assessmentError && (
        <div className="surface-card error-card" role="alert">
          <p>Could not load impact guidance: {assessmentError instanceof Error ? assessmentError.message : "Unknown error"}</p>
        </div>
      )}

      {guidanceItems.length > 0 && (
        <section aria-label="Impact next steps">
          <div className="eyebrow">NEXT STEPS</div>
          <div className="page-heading">
            <h2>Build a stronger impact story</h2>
          </div>
          <div className="section-grid">
            {guidanceItems.map((guidance) => (
              <article className="surface-card" key={guidance.goalId}>
                <div className="card-eyebrow">{guidance.optional ? "OPTIONAL NEXT STEPS" : "NEXT STEPS"}</div>
                <h2>{guidance.title}</h2>
                <p>{guidance.intro}</p>
                <p><Link className="text-link" to={`/goals/${guidance.goalId}`}>{guidance.goalTitle}</Link></p>
                {guidance.optional ? (
                  <details>
                    <summary>Show optional suggestions</summary>
                    <ol>
                      {guidance.steps.map(([title, description]) => (
                        <li key={title}><strong>{title}</strong><p>{description}</p></li>
                      ))}
                    </ol>
                  </details>
                ) : (
                  <ol>
                    {guidance.steps.map(([title, description]) => (
                      <li key={title}><strong>{title}</strong><p>{description}</p></li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="detail-list">
        {items.map((item) => (
          <Link className="detail-card" to={`/goals/${item.goal_id}`} key={item.id}>
            <div>
              <span className="status-pill">{label(item.impact_type)}</span>
              <h2>{item.impact_summary}</h2>
              <p>{item.goalTitle}</p>
            </div>
            <div className="impact-detail-score">{Math.round(item.impact_score * 100)}%</div>
          </Link>
        ))}
      </div>
      {!items.length && <div className="surface-card"><p>No impact results have been generated yet.</p></div>}
    </div>
  );
}
