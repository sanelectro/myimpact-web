import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { analyzeGoals, getGoalAssessment, getGoals } from "../../api/myImpact";
import type {
  Goal,
  GoalAssessment,
  GoalAssessmentBatch,
  GoalCategory,
  GoalCriterionResult,
} from "../../types/api";
import { getAvailableGoalYears, getCurrentGoalYear, isGoalInYear } from "./financialYear";
import "./Goals.css";

const goalCategories: GoalCategory[] = ["personal", "team", "organization"];

function formatStatus(status: Goal["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatGoalCategory(category: GoalCategory) {
  if (category === "organization") return "Organization";
  if (category === "team") return "Team";
  return "Personal";
}

type GoalProgressStatus = GoalCriterionResult | "UNAVAILABLE";

function getGoalProgressStatus(
  assessment: GoalAssessment | undefined,
  unavailable = false,
): GoalProgressStatus {
  if (unavailable) return "UNAVAILABLE";
  if (!assessment || assessment.criteria_count === 0 || assessment.assessed_criteria_count === 0) {
    return "NOT_ASSESSED";
  }
  if (
    assessment.criteria.some(
      (criterion) =>
        criterion.result === "NEEDS_REVIEW"
        || criterion.lifecycle_state === "STALE"
        || criterion.lifecycle_state === "OBSOLETE",
    )
    || assessment.assessed_criteria_count < assessment.criteria_count
  ) {
    return "NEEDS_REVIEW";
  }
  if (assessment.criteria_met_count === assessment.criteria_count) return "MET";
  if ((assessment.goal_progress_percentage ?? 0) > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}

function formatExpectationStatus(status: GoalProgressStatus) {
  switch (status) {
    case "MET":
      return "Criteria met";
    case "IN_PROGRESS":
      return "In-progress";
    case "NOT_STARTED":
      return "Not started";
    case "NEEDS_REVIEW":
      return "Needs review";
    case "UNAVAILABLE":
      return "Assessment unavailable";
    default:
      return "Not assessed";
  }
}

export default function GoalsPage() {
  const query = useQuery({ queryKey: ["goals"], queryFn: getGoals });
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<number | "undated">(getCurrentGoalYear);
  const [analysisRun, setAnalysisRun] = useState<GoalAssessmentBatch | null>(null);
  const allGoals = (query.data ?? []).filter((goal) => goal.status !== "archived");
  const currentYear = getCurrentGoalYear();
  const years = getAvailableGoalYears(allGoals, currentYear);
  const hasUndatedGoals = allGoals.some((goal) => isGoalInYear(goal, "undated"));
  const goals = allGoals.filter((goal) => isGoalInYear(goal, selectedYear));
  const goalsByCategory = goalCategories
    .map((category) => ({
      category,
      goals: goals.filter((goal) => goal.scope === category),
    }))
    .filter((group) => group.goals.length > 0);

  const assessmentQueries = useQueries({
    queries: goals.map((goal) => ({
      queryKey: ["goal-assessment", goal.id],
      queryFn: () => getGoalAssessment(goal.id),
      staleTime: 30_000,
    })),
  });
  const eligibleGoalIds = goals
    .filter(
      (goal, index) =>
        goal.status === "active"
        && (assessmentQueries[index]?.data?.criteria_count ?? 0) > 0,
    )
    .map((goal) => goal.id);
  const analysisMutation = useMutation({
    mutationFn: () => analyzeGoals(eligibleGoalIds),
    onSuccess: async (result) => {
      setAnalysisRun(result);
      await queryClient.invalidateQueries({ queryKey: ["goal-assessment"] });
    },
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

  const progressValues = assessmentQueries
    .map((item) => item.data?.goal_progress_percentage)
    .filter((value): value is number => value !== null && value !== undefined);
  const overallProgress = progressValues.length
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : 0;

  const assessmentQueriesByGoalId = new Map(
    goals.map((goal, index) => [goal.id, assessmentQueries[index]] as const),
  );
  const statuses = goals.map((goal) => {
    const assessmentQuery = assessmentQueriesByGoalId.get(goal.id);
    return getGoalProgressStatus(assessmentQuery?.data, assessmentQuery?.isError);
  });
  const metCount = statuses.filter((status) => status === "MET").length;
  const inProgressCount = statuses.filter((status) => status === "IN_PROGRESS").length;
  const notStartedCount = statuses.filter((status) => status === "NOT_STARTED").length;
  const needsReviewCount = statuses.filter((status) => status === "NEEDS_REVIEW").length;
  const notAssessedCount = statuses.filter((status) => status === "NOT_ASSESSED").length;
  const unavailableCount = statuses.filter((status) => status === "UNAVAILABLE").length;

  return (
    <div className="goals-page">
      <div className="page-heading">
        <div className="goals-heading-row">
          <div>
            <div className="eyebrow">YOUR GOALS</div>
            <h1>What you’re working toward</h1>
            <p>Review each goal and open it to see the evidence and impact connected to it.</p>
          </div>
          <Link className="goals-add-button" to="/goals/import">
            + Add / Import Goal(s)
          </Link>
          <button
            className="goals-add-button"
            type="button"
            disabled={
              analysisMutation.isPending
              || assessmentQueries.some((item) => item.isLoading)
              || eligibleGoalIds.length === 0
              || eligibleGoalIds.length > 20
            }
            onClick={() => analysisMutation.mutate()}
          >
            {analysisMutation.isPending ? "Analyzing…" : "Analyze eligible goals"}
          </button>
        </div>
      </div>

      {eligibleGoalIds.length > 20 && (
        <p className="goals-assessment-error" role="status">
          Analyze up to 20 goals at a time. Narrow the selected goal year to continue.
        </p>
      )}
      {analysisMutation.error && (
        <p className="goals-assessment-error" role="alert">
          Could not analyze goals: {analysisMutation.error instanceof Error ? analysisMutation.error.message : "Unknown error"}
        </p>
      )}
      {analysisRun && (
        <section className="goals-analysis-run surface-card" aria-label="Latest Analyze Goals run">
          <h2>Latest analysis run</h2>
          <ul>
            {analysisRun.runs.map((run) => {
              const goal = goals.find((item) => item.id === run.goal_id);
              return (
                <li key={run.id}>
                  <Link to={`/goals/${run.goal_id}`}>{goal?.title ?? run.goal_id}</Link>
                  {" — "}{run.status.toLowerCase().replaceAll("_", " ")}
                  {run.error_message ? `: ${run.error_message}` : ""}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {unavailableCount > 0 && (
        <p className="goals-assessment-error" role="alert">
          Assessment summaries could not be loaded for {unavailableCount} goal{unavailableCount === 1 ? "" : "s"}.
          Open those goals to retry; unavailable results are not treated as unassessed.
        </p>
      )}

      <section className="goals-overview" aria-label="Goal progress overview">
        <div className="goals-overview-primary">
          <div>
            <div className="eyebrow">OVERALL PROGRESS</div>
            <div className="goals-overview-value">{progressValues.length ? `${overallProgress}%` : "—"}</div>
            <p>
              Average calculated goal progress across {progressValues.length} assessed goals.
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
            <span>{metCount}/{totalGoals} goals have all criteria met</span>
          </div>
          <div className="goal-health-bar" aria-hidden="true">
            {metCount > 0 && <span className="health-segment health-met" style={{ flex: metCount }} />}
            {inProgressCount > 0 && <span className="health-segment health-in-progress" style={{ flex: inProgressCount }} />}
            {notStartedCount > 0 && <span className="health-segment health-not-started" style={{ flex: notStartedCount }} />}
            {needsReviewCount > 0 && <span className="health-segment health-needs-review" style={{ flex: needsReviewCount }} />}
            {notAssessedCount > 0 && <span className="health-segment health-not-assessed" style={{ flex: notAssessedCount }} />}
            {unavailableCount > 0 && <span className="health-segment health-unavailable" style={{ flex: unavailableCount }} />}
          </div>
          <div className="goal-health-legend">
            <span><i className="legend-dot health-met" /> Met {metCount}</span>
            <span><i className="legend-dot health-in-progress" /> In-progress {inProgressCount}</span>
            <span><i className="legend-dot health-not-started" /> Not started {notStartedCount}</span>
            <span><i className="legend-dot health-needs-review" /> Needs review {needsReviewCount}</span>
            <span><i className="legend-dot health-not-assessed" /> Not assessed {notAssessedCount}</span>
            <span><i className="legend-dot health-unavailable" /> Unavailable {unavailableCount}</span>
          </div>
        </div>
      </section>

      <div className="goals-section-heading">
        <div>
          <div className="eyebrow">YOUR GOALS</div>
          <h2>Goals for {selectedYear === "undated" ? "No financial year" : `FY ${selectedYear}`}</h2>
        </div>
        <div className="goals-year-filter">
          <label htmlFor="goals-year">Financial year (Jan–Dec)</label>
          <select
            id="goals-year"
            value={selectedYear}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedYear(value === "undated" ? "undated" : Number(value));
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}{year === currentYear ? " (Current)" : year < currentYear ? " (Previous)" : ""}
              </option>
            ))}
            {hasUndatedGoals && <option value="undated">No financial year</option>}
          </select>
          <span>{totalGoals} goals</span>
        </div>
      </div>

      {goals.length === 0 ? (
        <p className="goals-empty-state">
          {selectedYear === "undated"
            ? "No goals without financial-year dates."
            : `No goals are assigned to ${selectedYear}.`}
        </p>
      ) : (
        <div className="goal-category-sections">
          {goalsByCategory.map(({ category, goals: categoryGoals }) => (
            <section
              className="goal-category-section"
              aria-labelledby={`goal-category-${category}`}
              key={category}
            >
              <div className="goal-category-heading">
                <h3 id={`goal-category-${category}`}>{formatGoalCategory(category)} goals</h3>
                <span>{categoryGoals.length} {categoryGoals.length === 1 ? "goal" : "goals"}</span>
              </div>
              <div className="goal-list">
                {categoryGoals.map((goal) => {
                  const assessmentQuery = assessmentQueriesByGoalId.get(goal.id);
                  const assessment = assessmentQuery?.data;
                  const progress = assessment?.goal_progress_percentage;
                  const progressStatus = getGoalProgressStatus(assessment, assessmentQuery?.isError);
                  const progressStatusClass = progressStatus.toLowerCase();
                  const progressFill = progress == null ? 0 : Math.min(100, progress);

                  return (
                    <Link className="goal-list-card" to={`/goals/${goal.id}`} key={goal.id}>
                      <div className="goal-list-card-main">
                        <div className="goal-list-card-meta">
                          <span className={`goal-status-pill goal-status-${goal.status}`}>{formatStatus(goal.status)}</span>
                          <span className="goal-scope-pill">{formatGoalCategory(goal.scope)}</span>
                          {goal.scope === "organization" && goal.organization_name && (
                            <span className="goal-scope-pill">{goal.organization_name}</span>
                          )}
                        </div>

                        <div className="goal-list-card-title-row">
                          <h3>{goal.title}</h3>
                          <span className={`goal-progress-status goal-progress-${progressStatusClass}`}>
                            {formatExpectationStatus(progressStatus)}
                          </span>
                        </div>

                        {goal.description && <p>{goal.description}</p>}

                        <div className="goal-progress-row">
                          <div
                            className="goal-progress-track"
                            role="progressbar"
                            aria-label={progress === null || progress === undefined ? "Goal progress unavailable" : `${progress}% goal progress`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            {...(progress === null || progress === undefined ? {} : { "aria-valuenow": progressFill })}
                          >
                            <div
                              className={`goal-list-progress-fill goal-list-progress-fill-${progressStatusClass}`}
                              style={{ width: `${progressFill}%` }}
                            />
                          </div>
                          <strong className={`goal-progress-value goal-progress-value-${progressStatusClass}`}>
                            {progress === null || progress === undefined ? "—" : `${progress}%`}
                          </strong>
                        </div>
                        <div className="goal-progress-caption">
                          <span>
                            {assessmentQuery?.isError
                              ? "Assessment unavailable"
                              : `${assessment?.criteria_met_count ?? 0}/${assessment?.criteria_count ?? 0} criteria met`}
                            {!assessmentQuery?.isError
                              && assessment?.evidence_coverage_percentage !== null
                              && assessment?.evidence_coverage_percentage !== undefined
                              ? ` · ${assessment.evidence_coverage_percentage}% evidence coverage`
                              : ""}
                          </span>
                        </div>
                      </div>
                      <span className="goal-list-card-arrow" aria-hidden="true">→</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
