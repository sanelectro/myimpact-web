import "./Dashboard.css";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAuthSession, getCareerStages } from "../../auth/auth";
import {
  getGoalEvidence,
  getGoalAssessment,
  getGoalImpact,
  getGoalInsight,
  getGoals,
} from "../../api/myImpact";
import type { GoalAssessment, GoalEvidence, ImpactAssessment } from "../../types/api";

function ProgressCard({
  to,
  icon,
  title,
  status,
  description,
  meta,
}: {
  to: string;
  icon: string;
  title: string;
  status: string;
  description: string;
  meta: string;
}) {
  return (
    <Link to={to} className="progress-card">
      <div className="progress-card-top">
        <span className="progress-icon" aria-hidden="true">{icon}</span>
        <span className="progress-arrow" aria-hidden="true">→</span>
      </div>
      <div className="progress-card-title">{title}</div>
      <div className="progress-card-status">{status}</div>
      <p>{description}</p>
      <div className="progress-card-meta">{meta} · Explore {title} →</div>
    </Link>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <article className="surface-card dashboard-state-card">
      <div className="card-eyebrow">{label}</div>
      <p>Loading your MyImpact data…</p>
    </article>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <article className="surface-card dashboard-state-card error-card">
      <div className="card-eyebrow">DASHBOARD ERROR</div>
      <h2>We could not load your progress</h2>
      <p>{message}</p>
      <p>Check that the MyImpact API is running and your user ID is configured.</p>
    </article>
  );
}

function formatImpactType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function progressStatus(score: number) {
  if (score >= 0.75) return "Strong";
  if (score >= 0.5) return "Good progress";
  if (score > 0) return "Getting started";
  return "Needs attention";
}

function RecentAchievements({ assessments }: { assessments: ImpactAssessment[] }) {
  return (
    <article className="surface-card">
      <div className="card-eyebrow">WHAT YOU’RE DOING WELL</div>
      <h2>Recent achievements</h2>
      {!assessments.length ? (
        <p>Once your evidence is assessed, your achievements will appear here.</p>
      ) : (
        <div className="impact-list">
          {assessments.slice(0, 4).map((assessment) => (
            <Link className="impact-item impact-link" to={`/impact/${assessment.id}`} key={assessment.id}>
              <div>
                <div className="impact-type">{formatImpactType(assessment.impact_type)}</div>
                <div className="impact-summary">{assessment.impact_summary}</div>
              </div>
              <span className="impact-score">View →</span>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

export default function DashboardPage() {
  const session = getAuthSession();
  const currentLevel = session?.careerLevel ?? 5;
  const [previousStage, currentStage, nextStage] = getCareerStages(currentLevel);
  const currentPosition = session?.role.startsWith("JL-")
    ? session.role
    : `${currentStage.label} · ${session?.role ?? "Lead Software Engineer"}`;
  const goalsQuery = useQuery({ queryKey: ["goals"], queryFn: getGoals });

  const goals = goalsQuery.data ?? [];
  const activeGoals = goals.filter((goal) => goal.status === "active");

  const evidenceQueries = useQueries({
    queries: activeGoals.map((goal) => ({
      queryKey: ["goal-evidence", goal.id],
      queryFn: () => getGoalEvidence(goal.id),
    })),
  });

  const goalAssessmentQueries = useQueries({
    queries: activeGoals.map((goal) => ({
      queryKey: ["goal-assessment", goal.id],
      queryFn: () => getGoalAssessment(goal.id),
    })),
  });

  const impactQueries = useQueries({
    queries: activeGoals.map((goal) => ({
      queryKey: ["goal-impact", goal.id],
      queryFn: () => getGoalImpact(goal.id),
    })),
  });

  const allEvidence: GoalEvidence[] = evidenceQueries.flatMap((query) => query.data ?? []);
  const allAssessments = impactQueries
    .flatMap((query) => query.data ?? [])
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const goalAssessments: GoalAssessment[] = goalAssessmentQueries.flatMap((query) =>
    query.data ? [query.data] : [],
  );

  const firstInsightGoal = activeGoals.find((_, index) => (impactQueries[index]?.data?.length ?? 0) > 0);
  const insightQuery = useQuery({
    queryKey: ["goal-insight", firstInsightGoal?.id],
    queryFn: () => getGoalInsight(firstInsightGoal!.id),
    enabled: Boolean(firstInsightGoal),
  });

  const avgImpact = allAssessments.length
    ? allAssessments.reduce((sum, item) => sum + item.impact_score, 0) / allAssessments.length
    : 0;
  const goalProgress = activeGoals.length
    ? Math.round(
        goalAssessments.reduce(
          (sum, assessment) => sum + Math.min(100, assessment.progress_percentage),
          0,
        ) / activeGoals.length,
      )
    : 0;
  const goalsMeetingExpectations = goalAssessments.filter(
    (assessment) => assessment.status === "met" || assessment.status === "above",
  ).length;

  const isLoading = goalsQuery.isLoading || evidenceQueries.some((query) => query.isLoading) || goalAssessmentQueries.some((query) => query.isLoading) || impactQueries.some((query) => query.isLoading);
  const queryError = goalsQuery.error ?? evidenceQueries.find((query) => query.error)?.error ?? goalAssessmentQueries.find((query) => query.error)?.error ?? impactQueries.find((query) => query.error)?.error;

  if (queryError) {
    return (
      <div>
        <div className="hero">
          <div><div className="eyebrow">DASHBOARD</div><h1>Your career story, at a glance.</h1><p>See how your goals, milestones, evidence and impact are coming together.</p></div>
          <div className="hero-badge">M6.2</div>
        </div>
        <ErrorCard message={queryError instanceof Error ? queryError.message : "The dashboard data could not be loaded."} />
      </div>
    );
  }

  return (
    <div>
      <div className="hero">
        <div>
          <div className="eyebrow">DASHBOARD</div>
          <h1>Your career story, at a glance.</h1>
          <p>See how your goals, milestones, evidence and impact are coming together — and what to focus on next.</p>
        </div>
        <div className="hero-badge">M6.2 · Live data</div>
      </div>

      {isLoading ? (
        <div className="section-grid dashboard-loading-grid"><LoadingCard label="YOUR PROGRESS" /><LoadingCard label="CAREER JOURNEY" /></div>
      ) : (
        <>
          <section className="journey-card surface-card">
            <div>
              <div className="card-eyebrow">CAREER JOURNEY</div>
              <h2>Where you are today — and where you can go next</h2>
              <p>Your current position is <strong>{currentPosition}</strong>. Use the journey to understand what will strengthen your readiness for the next level.</p>
            </div>
            <Link className="text-link" to="/career">Explore career journey →</Link>
            <div className="journey-track">
              <div className="journey-step"><span>{previousStage.label}</span><small>{previousStage.title}</small></div>
              <div className="journey-line" />
              <div className="journey-step current"><span>{currentStage.label}</span><small>You are here</small></div>
              <div className="journey-line" />
              <div className="journey-step"><span>{nextStage.label}</span><small>{nextStage.title}</small></div>
            </div>
          </section>

          <section className="progress-section">
            <div className="section-heading"><div><div className="card-eyebrow">YOUR OVERALL PROGRESS</div><h2>How are you doing?</h2></div><p>Open any area to see the details behind the status.</p></div>
            <div className="progress-grid">
              <ProgressCard to="/goals" icon="🎯" title="Goals" status={`${goalProgress}%`} description="Average qualifying-achievement progress against each active goal’s expected minimum." meta={`${goalsMeetingExpectations}/${activeGoals.length} active goals met expectations`} />
              <ProgressCard to="/impact" icon="🚀" title="Impact" status={progressStatus(avgImpact)} description="How much difference is my work making?" meta={`${allAssessments.length} impact result${allAssessments.length === 1 ? "" : "s"} · ${new Set(allAssessments.map((a) => a.impact_type)).size} areas`} />
            </div>
          </section>

          <div className="section-grid">
            <RecentAchievements assessments={allAssessments} />
            <article className="surface-card">
              <div className="card-eyebrow">WHAT TO FOCUS ON NEXT</div>
              <h2>Strengthen your story</h2>
              <p>{activeGoals.length === 0 ? "Start by adding an active goal." : allEvidence.length === 0 ? "Add evidence that shows what changed because of your work." : allAssessments.length === 0 ? "Turn your achievements into clear impact statements." : "Add one more strong example that shows measurable business, customer or leadership impact."}</p>
              <Link className="primary-link" to="/career">See what to do next →</Link>
            </article>
          </div>

          {insightQuery.data && (
            <article className="surface-card insight-strip">
              <div><div className="card-eyebrow">WHAT YOUR WORK SAYS ABOUT YOU</div><h2>{insightQuery.data.headline}</h2><p>{insightQuery.data.summary}</p></div>
              <Link className="text-link" to="/career">View career insight →</Link>
            </article>
          )}
        </>
      )}
    </div>
  );
}
