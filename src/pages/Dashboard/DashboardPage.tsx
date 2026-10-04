function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-description">{description}</div>
    </article>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <div className="hero">
        <div>
          <div className="eyebrow">DASHBOARD</div>
          <h1>See the impact you are building.</h1>
          <p>
            MyImpact connects your goals, knowledge, evidence and outcomes so
            your next 1:1 starts with impact rather than activity.
          </p>
        </div>
        <div className="hero-badge">M6 foundation</div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Goals"
          value="—"
          description="Your active career goals"
        />
        <MetricCard
          label="Evidence"
          value="—"
          description="Evidence connected to your goals"
        />
        <MetricCard
          label="Impact"
          value="—"
          description="Impact assessments generated"
        />
        <MetricCard
          label="Insights"
          value="—"
          description="Career insights ready for review"
        />
      </div>

      <div className="section-grid">
        <article className="surface-card">
          <div className="card-eyebrow">YOUR WORKSPACE</div>
          <h2>Start with your goals</h2>
          <p>
            The dashboard will become the entry point for reviewing goals,
            evidence, impact and preparation for your next 1:1.
          </p>
        </article>

        <article className="surface-card">
          <div className="card-eyebrow">AI ASSISTANT</div>
          <h2>Ask MyImpact</h2>
          <p>
            The AI Assistant will use the product APIs to help you understand
            your impact and prepare for career conversations.
          </p>
        </article>
      </div>
    </div>
  );
}
