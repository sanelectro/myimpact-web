import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createGoal,
  getGoal,
  updateGoal,
} from "../../api/myImpact";
import type { GoalScope } from "../../types/api";
import "./GoalForm.css";

const scopeOptions: { value: GoalScope; label: string; description: string }[] = [
  { value: "personal", label: "Personal", description: "Your individual contribution and development." },
  { value: "team", label: "Team", description: "An outcome you share with or influence within a team." },
  { value: "organization", label: "Organization", description: "A broader business or organizational outcome." },
];

function toInputDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<GoalScope>("personal");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!goalQuery.data) return;
    setTitle(goalQuery.data.title);
    setDescription(goalQuery.data.description ?? "");
    setScope(goalQuery.data.scope);
    setStartDate(toInputDate(goalQuery.data.start_date));
    setEndDate(toInputDate(goalQuery.data.end_date));
    setSource(goalQuery.data.source ?? "");
  }, [goalQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Goal title is required.");
      if (startDate && endDate && endDate < startDate) {
        throw new Error("Target date cannot be before start date.");
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        scope,
        start_date: startDate || null,
        end_date: endDate || null,
        source: source.trim() || null,
      };

      return isEdit
        ? updateGoal(goalId!, payload)
        : createGoal(payload);
    },
    onSuccess: async (goal) => {
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
      await queryClient.invalidateQueries({ queryKey: ["goal", goal.id] });
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
            ? "Update the goal definition without changing the achievements, evidence or impact already connected to it."
            : "Define the outcome you want to work toward. Your goal starts with no achievements and can build from there."}
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
                  onChange={() => setScope(option.value)}
                />
                <span className="scope-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
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
