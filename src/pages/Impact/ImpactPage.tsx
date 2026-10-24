import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalAssessment, getGoalImpact, getGoals } from "../../api/myImpact";

type Guidance = {
  optional?: boolean;
  title: string;
  intro: string;
  steps: [string, string][];
};

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getGuidance(status: string, qualifyingCount: number, expectedCount: number): Guidance | null {
  if (status === "not_started") {
    return {
      title: "How to get started",
      intro: `Your expectation is ${expectedCount} meaningful achievements with supporting evidence and demonstrated impact. Start with one concrete contribution you can own.`,
      steps: [
        ["Understand the goal", "Identify the problem, outcome or capability this goal is asking you to improve."],
        ["Choose your first achievement", "Define one concrete contribution that moves the goal forward and can be clearly described."],
        ["Capture evidence", "Keep the PR, design, dashboard, incident, document, metric or stakeholder feedback that proves the work happened."],
        ["Demonstrate impact", "Capture the measurable difference your work created — for example time saved, incidents reduced, coverage increased or quality improved."],
      ],
    };
  }

  if (status === "in_progress") {
    const remaining = Math.max(0, expectedCount - qualifyingCount);
    return {
      title: "Keep building toward the expected bar",
      intro: `You have ${qualifyingCount} meaningful achievement${qualifyingCount === 1 ? "" : "s"} demonstrated. ${remaining} more ${remaining === 1 ? "achievement" : "achievements"} with evidence and impact will meet expectations.`,
      steps: [
        ["Complete the next meaningful contribution", "Prioritise work that materially advances the outcome rather than simply increasing activity."],
        ["Keep the evidence connected", "Make sure each contribution has clear supporting evidence and a strong relationship to the goal."],
        ["Make the impact measurable", "Prefer before-and-after outcomes such as time saved, incidents reduced, coverage increased or adoption improved."],
      ],
    };
  }

  if (status === "met") {
    return {
      optional: true,
      title: "Optional: strengthen your story",
      intro: "You have met the expected bar. Use these suggestions only if you want to make the impact easier to communicate in a 1:1 or review.",
      steps: [
        ["Keep evidence current", "Capture new contributions while the details and measurable outcomes are fresh."],
        ["Deepen measurable impact", "Prefer outcomes that show scale, quality, reliability, efficiency, leadership or business value."],
        ["Connect the story", "Use the strongest achievements to explain how your contribution advanced the goal."],
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
    const guidance = getGuidance(
      query.data.status,
      query.data.qualifying_achievement_count,
      query.data.expected_achievement_count,
    );
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
