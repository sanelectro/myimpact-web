import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalAssessment, getGoals } from "../../api/myImpact";
import type { Goal, GoalExpectationStatus } from "../../types/api";
import "./Goals.css";

function formatStatus(status: Goal["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatScope(scope: Goal["scope"]) {
  if (scope === "organization") return "Organization";
  if (scope === "team") return "Team";
  return "Personal";
}

function formatExpectationStatus(status: GoalExpectationStatus) {
  switch (status) {
    case "above":
      return "Above expectations";
    case "met":
      return "Met expectations";
    case "in_progress":
      return "In-progress";
    default:
      return "Not started";
  }
}

export default function GoalsPage() {
  const query = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const goals = query.data ?? [];

  const assessmentQueries = useQueries({
    queries: goals.map((goal) => ({
      queryKey: ["goal-assessment", goal.id],
      queryFn: () => getGoalAssessment(goal.id),
      staleTime: 30_000,
    })),
  });

  if (query.isLoading) return <p>Loading your goals…</p>;
  if (query.isError) {
    return (
      <p>
        Could not load your goals: {query.error instanceof Error ? query.error.message : "Unknown error"}
      </p>
    );
  }

  const totalGoals = goals.length;
  const activeGoals = goals.filter((goal) => goal.status === "active").length;
  const completedGoals = goals.filter((goal) => goal.status === "completed").length;

  const progressValues = goals.map((_, index) => assessmentQueries[index]?.data?.progress_percentage ?? 0);
  const cappedProgress = progressValues.map((progress) => Math.min(100, progress));
  const overallProgress = cappedProgress.length
    ? Math.round(cappedProgress.reduce((sum, value) => sum + value, 0) / cappedProgress.length)
    : 0;

  const statuses = goals.map((_, index) => assessmentQueries[index]?.data?.status ?? "not_started");
  const aboveCount = statuses.filter((status) => status === "above").length;
  const metCount = statuses.filter((status) => status === "met").length;
  const inProgressCount = statuses.filter((status) => status === "in_progress").length;
  const notStartedCount = statuses.filter((status) => status === "not_started").length;
  const atOrAboveCount = aboveCount + metCount;

  return (
    <div className="goals-page">
      <div className="page-heading">
        <div className="goals-heading-row">
          <div>
            <div className="eyebrow">YOUR GOALS</div>
            <h1>What you’re working toward</h1>
            <p>Review each goal and open it to see the evidence and impact connected to it.</p>
          </div>
          <Link className="goals-add-button" to="/goals/new">
            + Add goal
          </Link>
        </div>
      </div>

      <section className="goals-overview" aria-label="Goal progress overview">
        <div className="goals-overview-primary">
          <div>
            <div className="eyebrow">OVERALL PROGRESS</div>
            <div className="goals-overview-value">{overallProgress}%</div>
            <p>
              {atOrAboveCount} of {totalGoals} goals are at or above the expected achievement bar.
            </p>
          </div>
        </div>

        <div className="goals-overview-stats">
          <div className="goals-overview-stat">
            <strong>{totalGoals}</strong>
            <span>Total goals</span>
          </div>
          <div className="goals-overview-stat">
            <strong>{activeGoals}</strong>
            <span>Active</span>
          </div>
          <div className="goals-overview-stat">
            <strong>{completedGoals}</strong>
            <span>Completed</span>
          </div>
        </div>

        <div className="goal-health">
          <div className="goal-health-header">
            <span>Goal health</span>
            <span>{atOrAboveCount}/{totalGoals} at or above expectations</span>
          </div>
          <div className="goal-health-bar" aria-hidden="true">
            {aboveCount > 0 && <span className="health-segment health-above" style={{ flex: aboveCount }} />}
            {metCount > 0 && <span className="health-segment health-met" style={{ flex: metCount }} />}
            {inProgressCount > 0 && <span className="health-segment health-in-progress" style={{ flex: inProgressCount }} />}
            {notStartedCount > 0 && <span className="health-segment health-not-started" style={{ flex: notStartedCount }} />}
          </div>
          <div className="goal-health-legend">
            <span><i className="legend-dot health-above" /> Above {aboveCount}</span>
            <span><i className="legend-dot health-met" /> Met {metCount}</span>
            <span><i className="legend-dot health-in-progress" /> In-progress {inProgressCount}</span>
            <span><i className="legend-dot health-not-started" /> Not started {notStartedCount}</span>
          </div>
        </div>
      </section>

      <div className="goals-section-heading">
        <div>
          <div className="eyebrow">YOUR GOALS</div>
          <h2>Where you are on each goal</h2>
        </div>
        <span>{totalGoals} goals</span>
      </div>

      <div className="goal-list">
        {goals.map((goal, index) => {
          const assessment = assessmentQueries[index]?.data;
          const progress = assessment?.progress_percentage ?? 0;
          const progressStatus = assessment?.status ?? "not_started";
          const progressFill = Math.min(100, progress);

          return (
            <Link className="goal-list-card" to={`/goals/${goal.id}`} key={goal.id}>
              <div className="goal-list-card-main">
                <div className="goal-list-card-meta">
                  <span className={`goal-status-pill goal-status-${goal.status}`}>{formatStatus(goal.status)}</span>
                  <span className="goal-scope-pill">{formatScope(goal.scope)}</span>
                </div>

                <div className="goal-list-card-title-row">
                  <h3>{goal.title}</h3>
                  <span className={`goal-progress-status goal-progress-${progressStatus}`}>
                    {formatExpectationStatus(progressStatus)}
                  </span>
                </div>

                {goal.description && <p>{goal.description}</p>}

                <div className="goal-progress-row">
                  <div className="goal-progress-track" aria-label={`${progress}% accomplished`}>
                    <div
                      className={`goal-progress-fill goal-progress-fill-${progressStatus}`}
                      style={{ width: `${progressFill}%` }}
                    />
                  </div>
                  <strong className={`goal-progress-value goal-progress-value-${progressStatus}`}>
                    {progress}%
                  </strong>
                </div>
                <div className="goal-progress-caption">
                  <span>Achievement progress</span>
                </div>
              </div>
              <span className="goal-list-card-arrow" aria-hidden="true">→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
