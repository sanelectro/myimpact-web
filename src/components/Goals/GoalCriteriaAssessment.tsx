import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  approveGoalCriterionVersion,
  createGoalCriterion,
  generateGoalCriteria,
  getGoalAssessment,
  getGoalCriteria,
  reanalyzeGoal,
  retireGoalCriterion,
  submitGoalAssessmentFeedback,
  updateGoalCriterion,
} from "../../api/myImpact";
import type {
  GoalAssessmentFeedbackType,
  GoalCriterion,
  GoalCriterionDefinition,
  GoalCriterionResult,
  GoalCriterionType,
} from "../../types/api";
import "./GoalCriteriaAssessment.css";

type EditorTarget = { criterionId: string | null; definition: GoalCriterionDefinition | null };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request failed.";
}

function currentDefinition(criterion: GoalCriterion): GoalCriterionDefinition | null {
  const latest = criterion.versions.at(-1);
  if (latest?.approval_status === "PROPOSED") return latest.definition;
  return (
    criterion.versions.find((item) => item.version === criterion.current_version)?.definition
    ?? latest?.definition
    ?? null
  );
}

function criterionLabel(result: GoalCriterionResult) {
  return result.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function newId() {
  return globalThis.crypto.randomUUID();
}

export default function GoalCriteriaAssessment({ goalId }: { goalId: string }) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [type, setType] = useState<GoalCriterionType>("BINARY");
  const [description, setDescription] = useState("");
  const [completionConditions, setCompletionConditions] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [milestones, setMilestones] = useState("");
  const [correctionByAssessment, setCorrectionByAssessment] = useState<Record<string, GoalCriterionResult>>({});

  const criteriaQuery = useQuery({
    queryKey: ["goal-criteria", goalId],
    queryFn: () => getGoalCriteria(goalId),
    retry: false,
  });
  const assessmentQuery = useQuery({
    queryKey: ["goal-assessment", goalId],
    queryFn: () => getGoalAssessment(goalId),
    retry: false,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["goal-criteria", goalId] }),
      queryClient.invalidateQueries({ queryKey: ["goal-assessment", goalId] }),
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
    ]);
  };

  const generateMutation = useMutation({
    mutationFn: () => generateGoalCriteria(goalId),
    onSuccess: refresh,
  });
  const createMutation = useMutation({
    mutationFn: (definition: GoalCriterionDefinition) =>
      createGoalCriterion(goalId, { definition }),
    onSuccess: async () => {
      setEditor(null);
      await refresh();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ criterionId, definition }: { criterionId: string; definition: GoalCriterionDefinition }) =>
      updateGoalCriterion(goalId, criterionId, { definition }),
    onSuccess: async () => {
      setEditor(null);
      await refresh();
    },
  });
  const approveMutation = useMutation({
    mutationFn: ({ criterionId, versionId }: { criterionId: string; versionId: string }) =>
      approveGoalCriterionVersion(goalId, criterionId, versionId),
    onSuccess: refresh,
  });
  const retireMutation = useMutation({
    mutationFn: (criterionId: string) => retireGoalCriterion(goalId, criterionId),
    onSuccess: refresh,
  });
  const assessMutation = useMutation({
    mutationFn: () => reanalyzeGoal(goalId),
    onSuccess: refresh,
  });
  const feedbackMutation = useMutation({
    mutationFn: ({
      criterionId,
      assessmentId,
      feedbackType,
      correctedResult,
    }: {
      criterionId: string;
      assessmentId: string;
      feedbackType: GoalAssessmentFeedbackType;
      correctedResult?: GoalCriterionResult;
    }) =>
      submitGoalAssessmentFeedback(goalId, criterionId, assessmentId, {
        feedback_type: feedbackType,
        corrected_result: correctedResult,
      }),
    onSuccess: refresh,
  });

  function startEditor(target: EditorTarget) {
    setEditor(target);
    const definition = target.definition;
    setType(definition?.criterion_type ?? "BINARY");
    setDescription(definition?.description ?? "");
    setCompletionConditions(definition?.completion_conditions ?? "");
    setTargetValue(definition?.target_value?.toString() ?? "");
    setUnit(definition?.unit ?? "");
    setMilestones(
      definition?.milestones
        .map((item) => `${item.title} | ${item.completion_conditions}`)
        .join("\n") ?? "",
    );
  }

  function buildDefinition(): GoalCriterionDefinition {
    const milestoneLines = milestones
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const parsedMilestones =
      type === "MILESTONE_BASED"
        ? milestoneLines.map((line, index) => {
              const [titlePart, ...conditionParts] = line.split("|");
              const title = titlePart.trim();
              const completion = conditionParts.join("|").trim();
              const old = editor?.definition?.milestones.find((item) => item.title === title);
              return {
                id: old?.id ?? newId(),
                title: title || `Milestone ${index + 1}`,
                completion_conditions: completion,
              };
            })
        : [];
    return {
      criterion_type: type,
      description: description.trim(),
      completion_conditions:
        type === "MILESTONE_BASED" ? null : completionConditions.trim() || null,
      milestones: parsedMilestones,
      target_value: type === "MEASURABLE_TARGET" ? Number(targetValue) : null,
      unit: type === "MEASURABLE_TARGET" ? unit.trim() : null,
      evidence_suggestions: editor?.definition?.evidence_suggestions ?? [],
      assumptions_and_clarifications:
        editor?.definition?.assumptions_and_clarifications ?? [],
    };
  }

  function saveEditor() {
    if (!isEditorValid) return;
    const definition = buildDefinition();
    if (editor?.criterionId) {
      updateMutation.mutate({ criterionId: editor.criterionId, definition });
    } else {
      createMutation.mutate(definition);
    }
  }

  if (criteriaQuery.isError || assessmentQuery.isError) {
    return (
      <section className="goal-detail-card m66-card">
        <h2>Goal criteria and assessment</h2>
        <p className="m66-error" role="alert">
          {errorMessage(criteriaQuery.error ?? assessmentQuery.error)}
        </p>
        <button type="button" onClick={() => void refresh()}>Retry</button>
      </section>
    );
  }
  if (criteriaQuery.isLoading || assessmentQuery.isLoading) {
    return <section className="goal-detail-card m66-card"><p>Loading goal criteria and assessment…</p></section>;
  }

  const criteria = (criteriaQuery.data ?? []).filter((criterion) => !criterion.is_retired);
  const assessment = assessmentQuery.data;
  const parsedTarget = Number(targetValue);
  const validMilestones = milestones
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .every((line) => {
      const [title, ...completion] = line.split("|");
      return Boolean(title.trim() && completion.join("|").trim());
    });
  const isEditorValid =
    Boolean(description.trim())
    && (
      type === "BINARY"
        ? Boolean(completionConditions.trim())
        : type === "MILESTONE_BASED"
          ? milestones.split("\n").some((line) => line.trim()) && validMilestones
          : Number.isFinite(parsedTarget) && parsedTarget > 0 && Boolean(unit.trim()) && Boolean(completionConditions.trim())
    );
  const pending =
    generateMutation.isPending
    || createMutation.isPending
    || updateMutation.isPending
    || approveMutation.isPending
    || retireMutation.isPending
    || assessMutation.isPending
    || feedbackMutation.isPending;
  const mutationError =
    generateMutation.error
    ?? createMutation.error
    ?? updateMutation.error
    ?? approveMutation.error
    ?? retireMutation.error
    ?? assessMutation.error
    ?? feedbackMutation.error;

  return (
    <section className="goal-detail-card m66-card" aria-labelledby="m66-heading">
      <div className="m66-heading">
        <div>
          <div className="card-eyebrow">GOAL CRITERIA</div>
          <h2 id="m66-heading">Criteria and evidence assessment</h2>
        </div>
        <div className="m66-actions">
          <button type="button" disabled={pending} onClick={() => startEditor({ criterionId: null, definition: null })}>
            Add criterion
          </button>
          <button type="button" disabled={pending} onClick={() => generateMutation.mutate()}>
            {generateMutation.isPending ? "Generating…" : "Suggest criteria"}
          </button>
          <button
            type="button"
            disabled={pending || criteria.every((item) => item.current_version === null)}
            onClick={() => assessMutation.mutate()}
          >
            {assessMutation.isPending ? "Refreshing sources and assessing…" : "Reanalyze evidence"}
          </button>
        </div>
      </div>

      {mutationError && <p className="m66-error" role="alert">{errorMessage(mutationError)}</p>}
      {assessment?.run_status && (
        <p className="m66-run-status" role="status">
          Latest run: {assessment.run_status.toLowerCase().replaceAll("_", " ")}
        </p>
      )}
      {assessment?.run_error_message && (
        <p className="m66-error" role="status">{assessment.run_error_message}</p>
      )}

      {assessment && (
        <section className="m66-source-history" aria-labelledby="m66-source-history-heading">
          <div>
            <h3 id="m66-source-history-heading">Source retrieval history</h3>
            <p>Shows when each connected source was checked for this goal.</p>
          </div>
          {assessment.source_retrieval_history.length ? (
            <ol className="m66-source-history-list">
              {assessment.source_retrieval_history.map((item) => (
                <li
                  className={`m66-source-retrieval ${item.status === "SUCCESS" ? "success" : "failure"}`}
                  key={item.id}
                >
                  <div className="m66-source-retrieval-heading">
                    <strong>
                      {item.provider === "github" ? "GitHub" : "Jira"} ·{" "}
                      {item.status === "SUCCESS" ? "Success" : "Failure"}
                    </strong>
                    <time dateTime={item.checked_at}>
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.checked_at))}
                    </time>
                  </div>
                  {item.failure_reason && <p>{item.failure_reason}</p>}
                  {item.used_snapshot && item.snapshot_captured_at && (
                    <p className="m66-source-snapshot-note">
                      Source couldn’t be checked; this assessment uses the snapshot captured on{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                      }).format(new Date(item.snapshot_captured_at))}.
                    </p>
                  )}
                  {item.status === "FAILURE" && (
                    <Link to={`/goals/${encodeURIComponent(goalId)}?evidence=manual`}>
                      Add evidence manually
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="m66-source-history-empty">
              No source retrieval checks have been recorded yet. Reanalyze evidence to start tracking.
            </p>
          )}
        </section>
      )}

      {assessment && assessment.criteria_count > 0 && (
        <div className="m66-metrics" aria-label="Goal assessment metrics">
          <div><strong>{assessment.criteria_met_count}/{assessment.criteria_count}</strong><span>criteria met</span></div>
          <div>
            <strong>{assessment.goal_progress_percentage === null ? "—" : `${assessment.goal_progress_percentage}%`}</strong>
            <span>goal progress</span>
          </div>
          <div>
            <strong>{assessment.evidence_coverage_percentage === null ? "—" : `${assessment.evidence_coverage_percentage}%`}</strong>
            <span>evidence coverage</span>
          </div>
          <div>
            <strong>{assessment.average_confidence === null ? "—" : `${Math.round(assessment.average_confidence * 100)}%`}</strong>
            <span>AI confidence</span>
          </div>
        </div>
      )}

      {editor && (
        <div className="m66-editor">
          <h3>{editor.criterionId ? "Create a new criterion version" : "Add a criterion"}</h3>
          <label>
            Criterion type
            <select value={type} onChange={(event) => setType(event.target.value as GoalCriterionType)}>
              <option value="BINARY">Binary outcome</option>
              <option value="MILESTONE_BASED">Milestone-based</option>
              <option value="MEASURABLE_TARGET">Measurable target</option>
            </select>
          </label>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={2000} />
          </label>
          {type !== "MILESTONE_BASED" && (
            <label>
              Completion conditions
              <textarea
                value={completionConditions}
                onChange={(event) => setCompletionConditions(event.target.value)}
                rows={3}
                maxLength={4000}
              />
            </label>
          )}
          {type === "MILESTONE_BASED" && (
            <label>
              Milestones (one per line: title | completion conditions)
              <textarea value={milestones} onChange={(event) => setMilestones(event.target.value)} rows={4} />
            </label>
          )}
          {type === "MEASURABLE_TARGET" && (
            <div className="m66-target-fields">
              <label>
                Increasing target value
                <input type="number" min="0.01" step="any" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} />
              </label>
              <label>
                Unit
                <input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={100} />
              </label>
            </div>
          )}
          <div className="m66-actions">
            <button
              type="button"
              disabled={pending || !isEditorValid}
              onClick={saveEditor}
            >
              Save proposal
            </button>
            <button type="button" disabled={pending} onClick={() => setEditor(null)}>Cancel</button>
          </div>
          {!isEditorValid && <p className="m66-error">Complete the required criterion fields before saving.</p>}
        </div>
      )}

      {criteria.length === 0 && !editor ? (
        <p className="m66-empty">No criteria yet. Add a criterion or ask AI to propose some for review.</p>
      ) : (
        <div className="m66-criteria-list">
          {criteria.map((criterion) => {
            const current = currentDefinition(criterion);
            const latestVersion = criterion.versions.at(-1);
            const summary = assessment?.criteria.find((item) => item.criterion_id === criterion.id);
            const result = summary?.assessment;
            const proposed = latestVersion?.approval_status === "PROPOSED";
            return (
              <article className="m66-criterion" key={criterion.id}>
                <div className="m66-criterion-header">
                  <div>
                    <span className="m66-type">{current?.criterion_type.replaceAll("_", " ") ?? "Criterion"}</span>
                    <h3>{current?.description ?? "Criterion proposal"}</h3>
                    <p>{current?.completion_conditions}</p>
                    {current?.milestones.map((milestone) => (
                      <p className="m66-milestone" key={milestone.id}>
                        <strong>{milestone.title}:</strong> {milestone.completion_conditions}
                      </p>
                    ))}
                    {current?.criterion_type === "MEASURABLE_TARGET" && (
                      <p>Target: {current.target_value} {current.unit}</p>
                    )}
                    {!!current?.assumptions_and_clarifications.length && (
                      <p className="m66-warning">
                        Clarifications: {current.assumptions_and_clarifications.join("; ")}
                      </p>
                    )}
                  </div>
                  <div className="m66-criterion-actions">
                    <span className={`m66-badge ${proposed ? "proposed" : "approved"}`}>
                      {proposed ? "Needs approval" : "Approved"}
                    </span>
                    <button type="button" disabled={pending || !current} onClick={() => startEditor({ criterionId: criterion.id, definition: current })}>
                      Edit
                    </button>
                    {proposed && latestVersion && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => approveMutation.mutate({ criterionId: criterion.id, versionId: latestVersion.id })}
                      >
                        Approve
                      </button>
                    )}
                    <button type="button" disabled={pending} onClick={() => retireMutation.mutate(criterion.id)}>
                      Retire
                    </button>
                  </div>
                </div>
                {criterion.versions.length > 0 && (
                  <details className="m66-version-history">
                    <summary>Version history ({criterion.versions.length})</summary>
                    <ol>
                      {criterion.versions.map((version) => (
                        <li key={version.id}>
                          <strong>
                            Version {version.version} · {version.approval_status.toLowerCase()}
                          </strong>
                          <p>{version.definition.description}</p>
                          <small>
                            Created {new Date(version.created_at).toLocaleString()}
                            {version.model_version ? ` · Model ${version.model_version}` : ""}
                            {version.prompt_version ? ` · Prompt ${version.prompt_version}` : ""}
                          </small>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                {result ? (
                  <div className="m66-assessment">
                    <div className="m66-assessment-heading">
                      <strong>{criterionLabel(result.result)}</strong>
                      <span>{result.lifecycle_state.toLowerCase()}</span>
                      <span>Progress: {result.progress_percentage === null ? "unavailable" : `${result.progress_percentage}%`}</span>
                      <span>AI confidence: {Math.round(result.confidence * 100)}%</span>
                    </div>
                    <p>{result.rationale}</p>
                    {result.evidence.map((item) => (
                      <div className="m66-evidence" key={item.id}>
                        <strong>{item.relationship_type.toLowerCase()}</strong>
                        {" — "}
                        {item.source_url ? (
                          <a href={item.source_url} target="_blank" rel="noreferrer">{item.title}</a>
                        ) : item.title}
                        <span>
                          {" · "}Review: {item.review_state ?? "not reviewed"} · Source: {item.source_validity.toLowerCase()}
                        </span>
                        {item.citation_excerpt && <blockquote>{item.citation_excerpt}</blockquote>}
                      </div>
                    ))}
                    <div className="m66-actions">
                      <button
                        type="button"
                        disabled={pending || result.lifecycle_state !== "CURRENT"}
                        onClick={() => feedbackMutation.mutate({
                          criterionId: criterion.id,
                          assessmentId: result.id,
                          feedbackType: "CONFIRMED",
                        })}
                      >
                        Confirm
                      </button>
                      <select
                        aria-label={`Correct assessment for ${current?.description ?? "criterion"}`}
                        value={correctionByAssessment[result.id] ?? ""}
                        onChange={(event) => setCorrectionByAssessment((previous) => ({
                          ...previous,
                          [result.id]: event.target.value as GoalCriterionResult,
                        }))}
                      >
                        <option value="">Choose correction</option>
                        <option value="NOT_STARTED">Not started</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="MET">Met</option>
                        <option value="NEEDS_REVIEW">Needs review</option>
                      </select>
                      <button
                        type="button"
                        disabled={pending || !correctionByAssessment[result.id]}
                        onClick={() => feedbackMutation.mutate({
                          criterionId: criterion.id,
                          assessmentId: result.id,
                          feedbackType: "CORRECTED",
                          correctedResult: correctionByAssessment[result.id],
                        })}
                      >
                        Submit correction
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => feedbackMutation.mutate({
                          criterionId: criterion.id,
                          assessmentId: result.id,
                          feedbackType: "CHALLENGED",
                        })}
                      >
                        Challenge
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="m66-unassessed">
                    {summary?.lifecycle_state === "STALE"
                      ? "Inputs changed; reassessment is required."
                      : summary?.result === "NOT_ASSESSED"
                        ? "Not assessed yet."
                        : "No current assessment is available."}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
