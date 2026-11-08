import type { GoalValidationRun } from "../../types/api";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface GoalValidationPanelProps {
  history: GoalValidationRun[];
  isLoading: boolean;
  error?: string | null;
  isValidating: boolean;
  validationError?: string | null;
  currentGoalVersion?: number | null;
  onValidate: () => void;
}

export default function GoalValidationPanel({
  history,
  isLoading,
  error,
  isValidating,
  validationError,
  currentGoalVersion,
  onValidate,
}: GoalValidationPanelProps) {
  const latest = history[0];
  const latestRunIsForCurrentVersion =
    latest && currentGoalVersion != null && latest.goal_version === currentGoalVersion;

  return (
    <section className="goal-detail-card goal-validation-card" id="goal-validation">
      <div className="section-title-row">
        <div>
          <div className="card-eyebrow">GOAL VALIDATION</div>
          <h2>Definition quality</h2>
          <p>Validation is guidance about the goal definition. Approval and lifecycle status are separate.</p>
        </div>
        <button
          className="goal-edit-button"
          type="button"
          onClick={onValidate}
          disabled={isValidating}
        >
          {isValidating ? "Validating…" : latest ? "Revalidate goal" : "Validate goal"}
        </button>
      </div>

      {isLoading ? (
        <p className="goal-inline-status" role="status">Loading validation history…</p>
      ) : error ? (
        <p className="form-error" role="alert">Could not load validation history: {error}</p>
      ) : latest ? (
        <>
          <div className="goal-validation-summary" aria-live="polite">
            <span className={`goal-validation-status goal-validation-${latest.status.toLowerCase()}`}>
              {label(latest.status)}
            </span>
            <span>Version {latest.goal_version}</span>
            <time dateTime={latest.created_at}>{formatDate(latest.created_at)}</time>
          </div>
          {currentGoalVersion != null && !latestRunIsForCurrentVersion && (
            <p className="goal-validation-stale" role="status">
              This result is for an earlier goal version. Validate the current version to refresh these findings.
            </p>
          )}
          <div id="goal-validation-findings" className="goal-validation-findings">
            <h3>Latest findings</h3>
            {latest.findings.length ? (
              <ul className="goal-validation-list">
                {latest.findings.map((finding, index) => (
                  <li key={`${finding.finding_code}-${index}`} className={`goal-validation-finding severity-${finding.severity.toLowerCase()}`}>
                    <div className="goal-validation-finding-heading">
                      <strong>{label(finding.dimension)}</strong>
                      <span className={`goal-validation-severity severity-${finding.severity.toLowerCase()}`}>
                        {label(finding.severity)}
                      </span>
                    </div>
                    <p>{finding.explanation}</p>
                    {finding.missing_info.length > 0 && (
                      <div>
                        <strong>Missing information</strong>
                        <ul>{finding.missing_info.map((item) => <li key={item}>{label(item)}</li>)}</ul>
                      </div>
                    )}
                    {finding.clarification_questions.length > 0 && (
                      <div>
                        <strong>Questions to consider</strong>
                        <ul>{finding.clarification_questions.map((question) => <li key={question}>{question}</li>)}</ul>
                      </div>
                    )}
                    {finding.suggested_improvement && (
                      <p><strong>Suggestion:</strong> {finding.suggested_improvement}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="goal-inline-status">No issues were found for this version.</p>
            )}
          </div>
        </>
      ) : (
        <p className="goal-inline-status">This goal has not been validated yet. You can run validation whenever you are ready.</p>
      )}

      {validationError && <p className="form-error" role="alert">Could not validate this goal: {validationError}</p>}

      <details className="goal-validation-history">
        <summary>Validation history{error ? "" : ` (${history.length})`}</summary>
        {isLoading ? (
          <p className="goal-inline-status">Loading validation history…</p>
        ) : error ? (
          <p className="goal-inline-status">Validation history is currently unavailable.</p>
        ) : history.length ? (
          <ol className="goal-history-list">
            {history.map((run) => (
              <li key={run.id}>
                <div>
                  <strong>{label(run.status)} · Version {run.goal_version}</strong>
                  <time dateTime={run.created_at}>{formatDate(run.created_at)}</time>
                </div>
                <p>{run.findings.length} {run.findings.length === 1 ? "finding" : "findings"}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="goal-inline-status">No validation runs yet.</p>
        )}
      </details>
    </section>
  );
}
