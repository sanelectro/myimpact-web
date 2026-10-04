import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  getGoalEvidence,
  getGoalImpact,
  getGoalInsight,
  getGoals,
} from "../../api/myImpact";
import type { GoalEvidence, ImpactAssessment } from "../../types/api";
import "./GoalDetail.css";

const EXPECTED_ACHIEVEMENTS = 3;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatImpactType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}


function getAssessment(achievementCount: number) {
  if (achievementCount === 0) {
    return {
      label: "Not Started",
      tone: "not-started",
      description:
        "You have not recorded any achievements for this goal yet.",
    };
  }

  if (achievementCount < EXPECTED_ACHIEVEMENTS) {
    return {
      label: "Not Met Expectations",
      tone: "not-met",
      description: `You have demonstrated ${achievementCount} of ${EXPECTED_ACHIEVEMENTS} expected achievements. Keep building evidence and demonstrated impact.`,
    };
  }

  if (achievementCount === EXPECTED_ACHIEVEMENTS) {
    return {
      label: "Met Expectations",
      tone: "met",
      description:
        "You have reached the expected minimum of three meaningful achievements with demonstrated impact.",
    };
  }

  return {
    label: "Above Expectations",
    tone: "above",
    description: `You have demonstrated ${achievementCount} meaningful achievements, exceeding the expected minimum of ${EXPECTED_ACHIEVEMENTS}.`,
  };
}

function getGuidance(achievementCount: number) {
  if (achievementCount === 0) {
    return {
      optional: false,
      title: "How to get started",
      intro: `Your expectation: demonstrate at least ${EXPECTED_ACHIEVEMENTS} meaningful achievements with supporting evidence and demonstrated impact.`,
      steps: [
        [
          "1. Understand the goal",
          "Identify the reliability problems, systems affected, and measures that would demonstrate improvement.",
        ],
        [
          "2. Pick your first achievement",
          "Choose one concrete contribution you can own, such as improving monitoring, reducing recurring incidents, or introducing health checks.",
        ],
        [
          "3. Capture evidence",
          "Keep the PR, design, incident resolution, dashboard, deployment, ADR, metric, or stakeholder feedback that proves what you did.",
        ],
        [
          "4. Demonstrate impact",
          "Prefer measurable outcomes such as reduced investigation time, fewer incidents, faster detection, or improved operational readiness.",
        ],
      ],
    };
  }

  if (achievementCount < EXPECTED_ACHIEVEMENTS) {
    return {
      optional: false,
      title: "Keep building",
      intro:
        "You have started making progress. The next step is to turn your work into more evidence-backed, demonstrated impact.",
      steps: [
        [
          "1. Complete another meaningful achievement",
          "Choose work that materially advances the goal rather than adding activity for its own sake.",
        ],
        [
          "2. Strengthen the evidence",
          "Capture the source and explain why it is relevant to this goal.",
        ],
        [
          "3. Make the impact measurable",
          "Where possible, show the before-and-after outcome, such as time saved, incidents reduced, or coverage increased.",
        ],
      ],
    };
  }

  if (achievementCount === EXPECTED_ACHIEVEMENTS) {
    return {
      optional: true,
      title: "Optional: strengthen your story",
      intro:
        "You have met the expected bar. Use these suggestions only if you want to make the impact easier to communicate in a 1:1 or review.",
      steps: [
        [
          "1. Keep evidence current",
          "Capture new contributions while the details and measurable outcomes are fresh.",
        ],
        [
          "2. Deepen measurable impact",
          "Prefer outcomes that show scale, quality, reliability, efficiency, leadership, or business value.",
        ],
        [
          "3. Connect the story",
          "Use the strongest achievements to explain how your contribution advanced the goal.",
        ],
      ],
    };
  }

  return null;
}

export default function GoalDetailPage() {
  const { goalId } = useParams();
  const goals = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const goal = goals.data?.find((item) => item.id === goalId);

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

  if (goals.isLoading) return <p>Loading goal…</p>;
  if (!goal) {
    return (
      <p>
        Goal not found. <Link to="/goals">Back to goals</Link>
      </p>
    );
  }

  const evidenceItems = evidence.data ?? [];
  const impactItems = impact.data ?? [];
  const impactByEvidence = new Map<string, ImpactAssessment>();
  impactItems.forEach((item) => impactByEvidence.set(item.evidence_id, item));

  const demonstratedImpactCount = evidenceItems.filter((item) =>
    impactByEvidence.has(item.evidence_id),
  ).length;

  const assessment = getAssessment(evidenceItems.length);
  const guidance = getGuidance(evidenceItems.length);
  const progressPercent = Math.round(
    (evidenceItems.length / EXPECTED_ACHIEVEMENTS) * 100,
  );
  const displayPercent = Math.max(0, progressPercent);
  const visualPercent = Math.min(100, displayPercent);

  const statusLabel =
    goal.status === "completed"
      ? "Completed"
      : goal.status === "active"
        ? "Active"
        : goal.status.charAt(0).toUpperCase() + goal.status.slice(1);

  return (
    <div className="goal-detail-page">
      <Link className="back-link goal-detail-back" to="/goals">
        ← All goals
      </Link>

      <header className="goal-detail-hero">
        <div className="eyebrow">GOAL DETAIL</div>
        <div className="goal-detail-hero-row">
          <div className="goal-detail-title-block">
            <h1>{goal.title}</h1>
            {goal.description && <p>{goal.description}</p>}
          </div>
          <span className="goal-status-pill">{statusLabel}</span>
        </div>
      </header>

      <section className="goal-detail-card goal-assessment-card">
        <div className="goal-assessment-main">
          <div className="card-eyebrow">WHERE YOU ARE</div>
          <div className="goal-assessment-title-row">
            <h2>{assessment.label}</h2>
          </div>
          <p className="goal-assessment-description">
            {assessment.description}
          </p>
        </div>

        <div className="goal-stat-grid">
          <div className="goal-stat">
            <strong>{evidenceItems.length}</strong>
            <span>achievements</span>
          </div>
          <div className="goal-stat">
            <strong>{evidenceItems.length}</strong>
            <span>with evidence</span>
          </div>
          <div className="goal-stat">
            <strong>{demonstratedImpactCount}</strong>
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
          {goal.source && <span>Source: {goal.source}</span>}
          {goal.start_date && <span>Started: {formatDate(goal.start_date)}</span>}
          {goal.end_date && <span>Target: {formatDate(goal.end_date)}</span>}
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
            <span>Use the next steps below to turn this goal into your first concrete achievement.</span>
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

                  <div className={`achievement-impact ${itemImpact ? "has-impact" : ""}`}>
                    <div className="card-eyebrow">DEMONSTRATED IMPACT</div>
                    {itemImpact ? (
                      <>
                        <p>{itemImpact.impact_summary}</p>
                        <span>{Math.round(itemImpact.confidence * 100)}% confidence</span>
                      </>
                    ) : (
                      <p className="no-impact-text">
                        Connect measurable impact to show what difference this achievement made.
                      </p>
                    )}
                  </div>
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
                <span className="tag" key={type}>
                  {formatImpactType(type)}
                </span>
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
                      <strong>{title.replace(/^\d+\.\s*/, "")}</strong>
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
                    <strong>{title.replace(/^\d+\.\s*/, "")}</strong>
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
