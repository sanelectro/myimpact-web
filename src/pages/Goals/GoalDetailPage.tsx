import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  getGoal,
  getGoalAssessment,
  getGoalEvidence,
  getGoalImpact,
  getGoalInsight,
} from "../../api/myImpact";
import type { GoalEvidence, ImpactAssessment } from "../../types/api";
import "./GoalDetail.css";

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatImpactType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatScope(scope: string) {
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

function formatGoalStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

type Guidance = {
  optional?: boolean;
  title: string;
  intro: string;
  steps: [string, string][];
};

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

export default function GoalDetailPage() {
  const { goalId } = useParams();
  const goal = useQuery({
    queryKey: ["goal", goalId],
    queryFn: () => getGoal(goalId!),
    enabled: Boolean(goalId),
  });

  const assessment = useQuery({
    queryKey: ["goal-assessment", goalId],
    queryFn: () => getGoalAssessment(goalId!),
    enabled: Boolean(goalId),
  });

  const evidence = useQuery({
    queryKey: ["goal-evidence", goalId],
    queryFn: () => getGoalEvidence(goalId!),
    enabled: Boolean(goalId),
  });

  const impact = useQuery({
    queryKey: ["goal-impact", goalId],
    queryFn: () => getGoalImpact(goalId!),
    enabled: Boolean(goalId),
  });

  const insight = useQuery({
    queryKey: ["goal-insight", goalId],
    queryFn: () => getGoalInsight(goalId!),
    enabled: Boolean(goalId && impact.data?.length),
  });

  if (goal.isLoading) return <p>Loading goal…</p>;
  if (goal.isError || !goal.data) {
    return (
      <p>
        Goal not found. <Link to="/goals">Back to goals</Link>
      </p>
    );
  }

  const goalData = goal.data;
  const assessmentData = assessment.data;
  const evidenceItems = evidence.data ?? [];
  const impactItems = impact.data ?? [];
  const impactByEvidence = new Map<string, ImpactAssessment>();
  impactItems.forEach((item) => impactByEvidence.set(item.evidence_id, item));

  const assessmentStatus = assessmentData?.status ?? "not_started";
  const displayPercent = assessmentData?.progress_percentage ?? 0;
  const visualPercent = Math.min(100, displayPercent);
  const guidance = assessmentData
    ? getGuidance(
        assessmentData.status,
        assessmentData.qualifying_achievement_count,
        assessmentData.expected_achievement_count,
      )
    : null;

  return (
    <div className="goal-detail-page">
      <Link className="back-link goal-detail-back" to="/goals">
        ← All goals
      </Link>

      <header className="goal-detail-hero">
        <div className="goal-detail-meta-label">
          GOAL DETAIL <span>·</span> {formatScope(goalData.scope).toUpperCase()}
        </div>
        <div className="goal-detail-hero-row">
          <div className="goal-detail-title-block">
            <h1>{goalData.title}</h1>
            {goalData.description && <p>{goalData.description}</p>}
          </div>
          <div className="goal-detail-actions">
            <span className={`goal-detail-lifecycle goal-detail-lifecycle-${goalData.status}`}>
              {formatGoalStatus(goalData.status)}
            </span>
            <Link className="goal-edit-button" to={`/goals/${goalData.id}/edit`}>
              Edit goal
            </Link>
          </div>
        </div>
      </header>

      <section className={`goal-detail-card goal-assessment-card goal-assessment-${assessmentStatus}`}>
        <div className="goal-assessment-main">
          <div className="card-eyebrow">WHERE YOU ARE</div>
          <div className="goal-assessment-title-row">
            <h2>
              {assessmentStatus === "above"
                ? "Above Expectations"
                : assessmentStatus === "met"
                  ? "Met Expectations"
                  : assessmentStatus === "in_progress"
                    ? "In-progress"
                    : "Not Started"}
            </h2>
          </div>
          <p className="goal-assessment-description">
            {assessmentData?.description ?? "Assessing your goal progress…"}
          </p>
        </div>

        <div className="goal-stat-grid">
          <div className="goal-stat">
            <strong>{assessmentData?.achievement_count ?? evidenceItems.length}</strong>
            <span>achievements</span>
          </div>
          <div className="goal-stat">
            <strong>{assessmentData?.evidence_count ?? evidenceItems.length}</strong>
            <span>supported by evidence</span>
          </div>
          <div className="goal-stat">
            <strong>{assessmentData?.demonstrated_impact_count ?? 0}</strong>
            <span>with demonstrated impact</span>
          </div>
          <div className="goal-stat">
            <strong>{displayPercent}%</strong>
            <span>of expected minimum</span>
          </div>
        </div>

        <div className="goal-progress" aria-label={`${displayPercent}% of expected minimum`}>
          <div className="goal-progress-fill" style={{ width: `${visualPercent}%` }} />
        </div>

        <div className="goal-meta">
          {goalData.source && <span>Source: {goalData.source}</span>}
          {goalData.start_date && <span>Started: {formatDate(goalData.start_date)}</span>}
          {goalData.end_date && <span>Target: {formatDate(goalData.end_date)}</span>}
        </div>
      </section>

      <section className="goal-detail-card">
        <div className="card-eyebrow">YOUR ACHIEVEMENTS</div>
        <div className="section-title-row">
          <div>
            <h2>{evidenceItems.length} pieces of evidence</h2>
            <p>What you have done and the proof connected to this goal.</p>
          </div>
        </div>

        {evidenceItems.length === 0 ? (
          <div className="empty-goal-state">
            <strong>No achievements recorded yet</strong>
            <span>Use the guidance below to turn this goal into your first concrete achievement.</span>
          </div>
        ) : (
          <div className="achievement-list">
            {evidenceItems.map((item: GoalEvidence) => {
              const itemImpact = impactByEvidence.get(item.evidence_id);
              return (
                <article className="achievement-card" key={item.evidence_id}>
                  <div className="achievement-main">
                    <div className="achievement-meta">
                      {item.source_type} · {formatDate(item.captured_at) ?? "Date not available"}
                    </div>
                    <strong className="achievement-title">{item.title}</strong>
                    {item.description && <p>{item.description}</p>}
                    {item.reason && <p className="achievement-reason">{item.reason}</p>}
                    <div className="tag-list achievement-tags">
                      <span className="tag">{item.relevance}</span>
                      <span className="tag">{Math.round(item.confidence * 100)}% confidence</span>
                      {itemImpact ? (
                        <span className="tag tag-positive">
                          {formatImpactType(itemImpact.impact_type)} impact
                        </span>
                      ) : (
                        <span className="tag">Impact not demonstrated yet</span>
                      )}
                    </div>
                  </div>

                  {itemImpact && (
                    <div className="achievement-impact has-impact">
                      <div className="card-eyebrow">DEMONSTRATED IMPACT</div>
                      <p>{itemImpact.impact_summary}</p>
                      <span>{Math.round(itemImpact.confidence * 100)}% confidence</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {insight.data && (
        <section className="goal-detail-card career-insight-card">
          <div className="career-insight-content">
            <div className="card-eyebrow">WHAT THIS SAYS ABOUT YOU</div>
            <h2>{insight.data.headline}</h2>
            <p>{insight.data.summary}</p>
            <div className="tag-list insight-tags">
              {insight.data.impact_types.map((type) => (
                <span className="tag" key={type}>{formatImpactType(type)}</span>
              ))}
            </div>
          </div>
          <div className="insight-confidence">
            <strong>{Math.round(insight.data.confidence * 100)}%</strong>
            <span>AI confidence</span>
          </div>
        </section>
      )}

      {guidance && (
        <section className={`goal-detail-card next-steps-card ${guidance.optional ? "next-steps-optional" : ""}`}>
          <div className="card-eyebrow">{guidance.optional ? "OPTIONAL NEXT STEPS" : "NEXT STEPS"}</div>
          <div className="section-title-row">
            <div>
              <h2>{guidance.title}</h2>
              <p>{guidance.intro}</p>
            </div>
          </div>
          {guidance.optional ? (
            <details className="guidance-details">
              <summary>Show optional suggestions</summary>
              <div className="guidance-list">
                {guidance.steps.map(([title, description], index) => (
                  <div className="guidance-item" key={title}>
                    <div className="guidance-number">{index + 1}</div>
                    <div>
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : (
            <div className="guidance-list">
              {guidance.steps.map(([title, description], index) => (
                <div className="guidance-item" key={title}>
                  <div className="guidance-number">{index + 1}</div>
                  <div>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
