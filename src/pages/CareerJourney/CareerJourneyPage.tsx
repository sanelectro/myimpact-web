import { getAuthSession, getCareerStages } from "../../auth/auth";

export default function CareerJourneyPage() {
  const session = getAuthSession();
  const [previousStage, currentStage, nextStage] = getCareerStages(session?.careerLevel ?? 5);

  return (
    <div>
      <div className="page-heading">
        <div className="eyebrow">CAREER JOURNEY</div>
        <h1>Your career journey</h1>
        <p>{session?.role ? `Your current role is ${session.role}. ` : ""}Use your goals, milestones, evidence and impact to build a stronger case for your next career step.</p>
      </div>
      <div className="career-journey-detail">
        {[previousStage, currentStage, nextStage].map((stage, index) => (
          <div className={`career-level${index === 1 ? " current" : ""}`} key={stage.level}>
            <span>{stage.label}{index === 1 ? " · YOU ARE HERE" : ""}</span>
            <strong>{stage.title}</strong>
            <p>{stage.description}</p>
          </div>
        ))}
      </div>
      <section className="surface-card">
        <div className="card-eyebrow">YOUR NEXT STEP</div>
        <h2>Build evidence for your next career step</h2>
        <p>Connect your goals, evidence and impact to show how your work supports your growth.</p>
      </section>
    </div>
  );
}
