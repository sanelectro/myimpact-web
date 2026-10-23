import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getGoalMilestones, getGoals } from "../../api/myImpact";
import type { GoalMilestoneStatus } from "../../types/api";

const statusLabels: Record<GoalMilestoneStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
};

export default function MilestonesPage() {
  const goalsQuery = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const goals = (goalsQuery.data ?? []).filter((goal) => goal.status !== "archived");
  const milestoneQueries = useQueries({
    queries: goals.map((goal) => ({
      queryKey: ["goal-milestones", goal.id],
      queryFn: () => getGoalMilestones(goal.id),
    })),
  });
  const milestonesByGoal = goals.map((goal, index) => ({
    goal,
    milestones: milestoneQueries[index]?.data ?? [],
  }));
  const error = goalsQuery.error ?? milestoneQueries.find((query) => query.error)?.error;

  return (
    <div className="milestones-page">
      <div className="page-heading">
        <div className="eyebrow">YOUR PROGRESS</div>
        <h1>Milestones</h1>
        <p>Meaningful steps that move your goals forward. Open a goal to add, edit, or update its milestones.</p>
      </div>

      {goalsQuery.isLoading || milestoneQueries.some((query) => query.isLoading) ? (
        <article className="surface-card"><p>Loading your milestones…</p></article>
      ) : error ? (
        <article className="surface-card error-card" role="alert">
          <h2>We could not load your milestones</h2>
          <p>{error instanceof Error ? error.message : "The milestone data could not be loaded."}</p>
        </article>
      ) : goals.length === 0 ? (
        <article className="surface-card">
          <h2>Start with a goal</h2>
          <p>Create a goal first, then add milestones to make the steps toward it visible.</p>
          <Link className="primary-link" to="/goals/new">Create a goal →</Link>
        </article>
      ) : (
        <div className="milestone-goal-list">
          {milestonesByGoal.map(({ goal, milestones }) => {
            const completed = milestones.filter((milestone) => milestone.status === "completed").length;
            return (
              <article className="surface-card milestone-goal-card" key={goal.id}>
                <div className="milestone-goal-heading">
                  <div>
                    <div className="card-eyebrow">{goal.status.replaceAll("_", " ")}</div>
                    <h2><Link to={`/goals/${goal.id}`}>{goal.title}</Link></h2>
                    <p>{milestones.length
                      ? `${completed} of ${milestones.length} milestones completed`
                      : "No milestones yet"}</p>
                  </div>
                  <Link className="goal-edit-button" to={`/goals/${goal.id}`}>Open goal</Link>
                </div>
                {milestones.length > 0 ? (
                  <ul className="milestone-overview-list">
                    {milestones.map((milestone) => (
                      <li key={milestone.id}>
                        <span className={`milestone-status milestone-status-${milestone.status}`}>
                          {statusLabels[milestone.status]}
                        </span>
                        <span>{milestone.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Link className="text-link" to={`/goals/${goal.id}`}>Add the first milestone →</Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
