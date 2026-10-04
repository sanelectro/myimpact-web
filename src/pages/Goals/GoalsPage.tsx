import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalEvidence, getGoals } from "../../api/myImpact";
import type { Goal } from "../../types/api";
import "./Goals.css";

const EXPECTED_ACHIEVEMENTS = 3;

function formatStatus(status: Goal["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatScope(scope: Goal["scope"]) {
  if (scope === "organization") return "Organization";
  if (scope === "team") return "Team";
  return "Personal";
}

function getProgressStatus(progress: number) {
  if (progress === 0) return "Not started";
  if (progress > 100) return "Above expectations";
  if (progress === 100) return "Met expectations";
  return "In-progress";
}

export default function GoalsPage() {
  const query = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const goals = query.data ?? [];

  const evidenceQueries = useQueries({
    queries: goals.map((goal) => ({
      queryKey: ["goal-evidence", goal.id],
      queryFn: () => getGoalEvidence(goal.id),
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

  const goalProgress = goals.map((goal, index) => {
    if (goal.status === "completed") return 100;
    const achievementCount = evidenceQueries[index]?.data?.length ?? 0;
    return Math.max(0, Math.round((achievementCount / EXPECTED_ACHIEVEMENTS) * 100));
  });

  const cappedProgress = goalProgress.map((progress) => Math.min(100, progress));
  const overallProgress = cappedProgress.length
    ? Math.round(cappedProgress.reduce((sum, value) => sum + value, 0) / cappedProgress.length)
    : 0;

  const progressStatuses = goalProgress.map(getProgressStatus);
  const aboveCount = progressStatuses.filter((status) => status === "Above expectations").length;
  const metCount = progressStatuses.filter((status) => status === "Met expectations").length;
  const buildingCount = progressStatuses.filter((status) => status === "In-progress").length;
  const notStartedCount = progressStatuses.filter((status) => status === "Not started").length;
  const atOrAboveCount = aboveCount + metCount;

  return (
    <div className="goals-page">
      <div className="page-heading">
        <div className="eyebrow">YOUR GOALS</div>
        <h1>What you’re working toward</h1>
        <p>Review each goal and open it to see the evidence and impact connected to it.</p>
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
            {buildingCount > 0 && <span className="health-segment health-building" style={{ flex: buildingCount }} />}
            {notStartedCount > 0 && <span className="health-segment health-not-started" style={{ flex: notStartedCount }} />}
          </div>
          <div className="goal-health-legend">
            <span><i className="legend-dot health-above" /> Above {aboveCount}</span>
            <span><i className="legend-dot health-met" /> Met {metCount}</span>
            <span><i className="legend-dot health-building" /> Building {buildingCount}</span>
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
          const progress = goalProgress[index] ?? 0;
          const displayProgress = `${progress}%`;
          const progressStatus = getProgressStatus(progress);
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
                  <span className={`goal-progress-status goal-progress-${progressStatus.toLowerCase().replaceAll(" ", "-")}`}>
                    {progressStatus}
                  </span>
                </div>

                {goal.description && <p>{goal.description}</p>}

                <div className="goal-progress-row">
                  <div className="goal-progress-track" aria-label={`${progress}% accomplished`}>
                    <div
                      className={`goal-progress-fill goal-progress-fill-${progressStatus.toLowerCase().replaceAll(" ", "-")}`}
                      style={{ width: `${progressFill}%` }}
                    />
                  </div>
                  <strong className={`goal-progress-value goal-progress-value-${progressStatus.toLowerCase().replaceAll(" ", "-")}`}>
                    {displayProgress}
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
