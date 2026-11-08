import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createGoal,
  getGoal,
  getProfile,
  updateGoal,
} from "../../api/myImpact";
import type {
  GoalCriterionDefinition,
  GoalDeferredRequirement,
  GoalLevel,
  GoalScope,
  GoalStructuredFields,
} from "../../types/api";
import DeferredRequirementsEditor, { validateDeferrals } from "../../components/Goals/DeferredRequirementsEditor";
import "./GoalForm.css";

const scopeOptions: { value: GoalScope; label: string; description: string }[] = [
  { value: "personal", label: "Personal", description: "Your individual contribution and development." },
  { value: "team", label: "Team", description: "An outcome you share with or influence within a team." },
  { value: "organization", label: "Organization", description: "A broader business or organizational outcome." },
];

function toInputDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function listToText(values: string[] | undefined) {
  return (values ?? []).join("\n");
}

function textToList(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export default function GoalFormPage() {
  const { goalId } = useParams();
  const isEdit = Boolean(goalId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const goalQuery = useQuery({
    queryKey: ["goal", goalId],
    queryFn: () => getGoal(goalId!),
    enabled: isEdit,
  });
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<GoalScope>("personal");
  const [goalLevel, setGoalLevel] = useState<GoalLevel | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("");
  const [goalType, setGoalType] = useState("");
  const [accountability, setAccountability] = useState("");
  const [successCriteriaText, setSuccessCriteriaText] = useState("");
  const [existingSuccessCriteria, setExistingSuccessCriteria] = useState<GoalCriterionDefinition[]>([]);
  const [deliverablesText, setDeliverablesText] = useState("");
  const [outcome, setOutcome] = useState("");
  const [impact, setImpact] = useState("");
  const [measurement, setMeasurement] = useState("");
  const [baseline, setBaseline] = useState("");
  const [target, setTarget] = useState("");
  const [dependenciesText, setDependenciesText] = useState("");
  const [roleAlignment, setRoleAlignment] = useState("");
  const [deferrals, setDeferrals] = useState<GoalDeferredRequirement[]>([]);
  const [originalDeferrals, setOriginalDeferrals] = useState<GoalDeferredRequirement[]>([]);
  const [deferralsEdited, setDeferralsEdited] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!goalQuery.data) return;
    setTitle(goalQuery.data.title);
    setDescription(goalQuery.data.description ?? "");
    setScope(goalQuery.data.scope);
    setGoalLevel(goalQuery.data.goal_level ?? "");
    setStartDate(toInputDate(goalQuery.data.start_date));
    setEndDate(toInputDate(goalQuery.data.end_date));
    setSource(goalQuery.data.source ?? "");
    const fields = goalQuery.data.structured_fields;
    setGoalType(fields?.goal_type ?? "");
    setAccountability(fields?.accountability ?? "");
    setExistingSuccessCriteria(fields?.success_criteria ?? []);
    setSuccessCriteriaText(
      (fields?.success_criteria ?? []).map((criterion) => criterion.description).join("\n"),
    );
    setDeliverablesText(listToText(fields?.deliverables));
    setOutcome(fields?.outcome ?? "");
    setImpact(fields?.impact ?? "");
    setMeasurement(fields?.measurement ?? "");
    setBaseline(fields?.baseline ?? "");
    setTarget(fields?.target ?? "");
    setDependenciesText(listToText(fields?.dependencies));
    setRoleAlignment(fields?.role_alignment ?? "");
    setDeferrals(fields?.deferred_requirements ?? []);
    setOriginalDeferrals(fields?.deferred_requirements ?? []);
    setDeferralsEdited(false);
  }, [goalQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Goal title is required.");
      if (startDate && endDate && endDate < startDate) {
        throw new Error("Target date cannot be before start date.");
      }
      if (scope === "organization" && !profileQuery.data?.organization_id) {
        throw new Error("Add your company in My Profile before creating an organization-specific goal.");
      }
      if (deferralsEdited) {
        const error = validateDeferrals(deferrals, baseline, target);
        if (error) throw new Error(error);
      }

      const successCriteria = textToList(successCriteriaText).map((description) => {
        const existing = existingSuccessCriteria.find(
          (criterion) => criterion.description.trim() === description,
        );
        return existing ?? {
          criterion_type: "BINARY" as const,
          description,
          completion_conditions: null,
          milestones: [],
          target_value: null,
          unit: null,
          evidence_suggestions: [],
          assumptions_and_clarifications: [],
        };
      });
      const structured_fields: GoalStructuredFields = {
        goal_type: goalType.trim() || null,
        accountability: accountability.trim() || null,
        success_criteria: successCriteria,
        deliverables: textToList(deliverablesText),
        outcome: outcome.trim() || null,
        impact: impact.trim() || null,
        measurement: measurement.trim() || null,
        baseline: baseline.trim() || null,
        target: target.trim() || null,
        dependencies: textToList(dependenciesText),
        role_alignment: roleAlignment.trim() || null,
        ...(deferralsEdited ? {
          deferred_requirements: deferrals.map((item) => ({
            ...item,
            reason: item.reason.trim(),
            resolution_stage: item.resolution_stage?.trim() || null,
            resolution_reason: item.resolution_reason?.trim() || null,
          })),
        } : {}),
      };
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        scope,
        goal_level: goalLevel || null,
        start_date: startDate || null,
        end_date: endDate || null,
        source: source.trim() || null,
        structured_fields,
      };

      return isEdit
        ? updateGoal(goalId!, {
          ...payload,
          ...(deferralsEdited ? { expected_deferred_requirements: originalDeferrals } : {}),
        })
        : createGoal(payload);
    },
    onSuccess: async (goal) => {
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
      await queryClient.invalidateQueries({ queryKey: ["goal", goal.id] });
      await queryClient.invalidateQueries({ queryKey: ["goal-evidence-eligibility", goal.id] });
      await queryClient.invalidateQueries({ queryKey: ["goal-requirements", goal.id] });
      navigate(`/goals/${goal.id}`);
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Could not save the goal.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    mutation.mutate();
  }

  if (isEdit && goalQuery.isLoading) return <p>Loading goal…</p>;
  if (isEdit && goalQuery.isError) {
    return (
      <div className="goal-form-page">
        <p>Could not load the goal.</p>
        <Link to="/goals">← Back to goals</Link>
      </div>
    );
  }

  return (
    <div className="goal-form-page">
      <Link className="back-link" to={isEdit ? `/goals/${goalId}` : "/goals"}>
        ← {isEdit ? "Back to goal" : "All goals"}
      </Link>

      <header className="goal-form-header">
        <div className="eyebrow">{isEdit ? "EDIT GOAL" : "NEW GOAL"}</div>
        <h1>{isEdit ? "Refine what you’re working toward" : "Create a new goal"}</h1>
        <p>
          {isEdit
            ? "Update the goal definition without changing the evidence or impact already connected to it."
            : "Define the outcome you want to work toward. New goals start as Draft so you can review them before activation."}
        </p>
      </header>

      <form className="goal-form-card" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-section-heading">
            <div>
              <div className="eyebrow">GOAL DEFINITION</div>
              <h2>What are you working toward?</h2>
            </div>
          </div>

          <label className="form-field">
            <span>Goal title <b>*</b></span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Improve production reliability"
              maxLength={300}
              autoFocus
            />
          </label>

          <label className="form-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the outcome you want to achieve and why it matters."
              rows={5}
              maxLength={5000}
            />
          </label>
        </div>

        <div className="form-section form-grid">
          <div className="form-field form-field-full">
            <div className="eyebrow">STRUCTURED GOAL DETAILS</div>
            <p className="field-help">
              These details help validate the goal. Validation offers guidance only; it never rewrites your goal.
            </p>
          </div>
          <label className="form-field">
            <span>Goal level <small>(optional)</small></span>
            <select value={goalLevel} onChange={(event) => setGoalLevel(event.target.value as GoalLevel | "")}>
              <option value="">Not specified</option>
              <option value="ANNUAL">Annual</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="SPRINT">Sprint</option>
            </select>
            <small className="field-help">Level describes the planning horizon, not the goal scope or parent relationship.</small>
          </label>
          <label className="form-field">
            <span>Goal type</span>
            <input value={goalType} onChange={(event) => setGoalType(event.target.value)} maxLength={100} placeholder="e.g. delivery, development, operational" />
          </label>
          <label className="form-field">
            <span>Accountability</span>
            <input value={accountability} onChange={(event) => setAccountability(event.target.value)} maxLength={1000} placeholder="What are you personally accountable for?" />
          </label>
          <label className="form-field form-field-full">
            <span>Success criteria <small>(one per line)</small></span>
            <textarea value={successCriteriaText} onChange={(event) => setSuccessCriteriaText(event.target.value)} rows={3} placeholder="How will you know the goal is complete?" />
          </label>
          <label className="form-field">
            <span>Deliverables <small>(one per line)</small></span>
            <textarea value={deliverablesText} onChange={(event) => setDeliverablesText(event.target.value)} rows={3} placeholder="Concrete outputs or milestones" />
          </label>
          <label className="form-field">
            <span>Expected outcome</span>
            <textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={3} maxLength={4000} placeholder="What should change as a result?" />
          </label>
          <label className="form-field">
            <span>Expected impact</span>
            <textarea value={impact} onChange={(event) => setImpact(event.target.value)} rows={3} maxLength={4000} placeholder="Who or what benefits, and how?" />
          </label>
          <label className="form-field">
            <span>Measurement</span>
            <input value={measurement} onChange={(event) => setMeasurement(event.target.value)} maxLength={1000} placeholder="How will progress or success be measured?" />
          </label>
          <label className="form-field">
            <span>Baseline</span>
            <input value={baseline} onChange={(event) => setBaseline(event.target.value)} maxLength={1000} placeholder="Current measure or starting point" />
          </label>
          <label className="form-field">
            <span>Target</span>
            <input value={target} onChange={(event) => setTarget(event.target.value)} maxLength={1000} placeholder="Desired measure or end state" />
          </label>
          <label className="form-field">
            <span>Dependencies <small>(one per line)</small></span>
            <textarea value={dependenciesText} onChange={(event) => setDependenciesText(event.target.value)} rows={3} placeholder="People, decisions, or resources this depends on" />
          </label>
          <label className="form-field form-field-full">
            <span>Role alignment</span>
            <textarea value={roleAlignment} onChange={(event) => setRoleAlignment(event.target.value)} rows={3} maxLength={2000} placeholder="How this goal aligns with your role or responsibilities" />
          </label>
        </div>

        <DeferredRequirementsEditor
          items={deferrals}
          original={originalDeferrals}
          onChange={(items) => { setDeferrals(items); setDeferralsEdited(true); }}
        />

        <div className="form-section">
          <div className="eyebrow">GOAL SCOPE</div>
          <div className="scope-options">
            {scopeOptions.map((option) => (
              <label className={`scope-option ${scope === option.value ? "selected" : ""}`} key={option.value}>
                <input
                  type="radio"
                  name="scope"
                  value={option.value}
                  checked={scope === option.value}
                  disabled={
                    option.value === "organization"
                    && !profileQuery.data?.organization_id
                    && !(isEdit && goalQuery.data?.scope === "organization")
                  }
                  onChange={() => setScope(option.value)}
                />
                <span className="scope-option-copy">
                  <strong>{option.label}</strong>
                  <small>
                    {option.value === "organization" && (goalQuery.data?.organization_name || profileQuery.data?.company)
                      ? `This goal is associated with ${goalQuery.data?.organization_name ?? profileQuery.data?.company} and remains private to you.`
                      : option.description}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {!profileQuery.data?.organization_id && (
            <p className="field-help">
              Add your company in <Link to="/profile">My Profile</Link> to create organization-specific goals.
            </p>
          )}
        </div>

        <div className="form-section form-grid">
          <label className="form-field">
            <span>Start date</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Target date</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <label className="form-field form-field-full">
            <span>Source</span>
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="e.g. Workday, Manager, Personal"
              maxLength={100}
            />
            <small className="field-help">Where this goal came from. This is separate from the goal scope.</small>
          </label>
        </div>

        {formError && <div className="form-error" role="alert">{formError}</div>}

        <div className="goal-form-actions">
          <Link className="button button-secondary" to={isEdit ? `/goals/${goalId}` : "/goals"}>
            Cancel
          </Link>
          <button className="button button-primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
          </button>
        </div>
      </form>
    </div>
  );
}
