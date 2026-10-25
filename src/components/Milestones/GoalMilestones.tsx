import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveMilestone,
  createGoalMilestone,
  getGoalMilestoneSuggestions,
  getGoalMilestones,
  updateGoalMilestone,
} from "../../api/myImpact";
import type {
  GoalMilestone,
  GoalMilestoneCreateRequest,
  GoalMilestoneStatus,
  GoalMilestoneSuggestion,
} from "../../types/api";
import "./Milestones.css";

const statusLabels: Record<GoalMilestoneStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function GoalMilestones({ goalId }: { goalId: string }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [completionCriteria, setCompletionCriteria] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<GoalMilestoneStatus>("not_started");

  const milestones = useQuery({
    queryKey: ["goal-milestones", goalId],
    queryFn: () => getGoalMilestones(goalId),
  });
  const suggestions = useQuery({
    queryKey: ["goal-milestone-suggestions", goalId],
    queryFn: () => getGoalMilestoneSuggestions(goalId),
    enabled: milestones.isSuccess && milestones.data.length === 0,
    staleTime: 30 * 60 * 1000,
  });

  async function refreshMilestones() {
    await queryClient.invalidateQueries({ queryKey: ["goal-milestones", goalId] });
  }

  const createMutation = useMutation({
    mutationFn: createGoalMilestone,
    onSuccess: async () => {
      setShowForm(false);
      resetForm();
      await refreshMilestones();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ milestoneId, values }: {
      milestoneId: string;
      values: Parameters<typeof updateGoalMilestone>[2];
    }) => updateGoalMilestone(goalId, milestoneId, values),
    onSuccess: async () => {
      setEditingId(null);
      resetForm();
      await refreshMilestones();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (milestoneId: string) => archiveMilestone(goalId, milestoneId),
    onSuccess: async () => {
      await Promise.all([
        refreshMilestones(),
        queryClient.invalidateQueries({ queryKey: ["archives"] }),
      ]);
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setCompletionCriteria("");
    setDueDate("");
    setStatus("not_started");
  }

  function startEditing(milestone: GoalMilestone) {
    setEditingId(milestone.id);
    setShowForm(false);
    setTitle(milestone.title);
    setDescription(milestone.description ?? "");
    setCompletionCriteria(milestone.completion_criteria ?? "");
    setDueDate(milestone.due_date ?? "");
    setStatus(milestone.status);
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: Omit<GoalMilestoneCreateRequest, "goalId"> = {
      title: title.trim(),
      description: description.trim() || null,
      completion_criteria: completionCriteria.trim() || null,
      due_date: dueDate || null,
      status,
      source: "manual",
    };
    if (editingId) {
      updateMutation.mutate({ milestoneId: editingId, values });
    } else {
      createMutation.mutate({ goalId, ...values });
    }
  }

  function changeStatus(milestoneId: string, nextStatus: GoalMilestoneStatus) {
    updateMutation.mutate({ milestoneId, values: { status: nextStatus } });
  }

  function addSuggestion(suggestion: GoalMilestoneSuggestion) {
    createMutation.mutate({
      goalId,
      ...suggestion,
      status: "not_started",
      due_date: null,
      source: "ai",
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error ?? archiveMutation.error;

  return (
    <section className="goal-detail-card milestone-section">
      <div className="card-eyebrow">MILESTONES FOR THIS GOAL</div>
      <div className="section-title-row">
        <div>
          <h2>Steps toward this goal</h2>
          <p>Track meaningful checkpoints separately from the goal’s assessment.</p>
        </div>
        <button
          className="goal-edit-button"
          type="button"
          onClick={() => {
            setShowForm((visible) => !visible);
            setEditingId(null);
            resetForm();
            createMutation.reset();
            updateMutation.reset();
          }}
        >
          {showForm ? "Cancel" : "Add milestone"}
        </button>
      </div>

      {milestones.isLoading && <p className="milestone-message">Loading milestones…</p>}
      {milestones.isError && (
        <p className="milestone-error" role="alert">
          Could not load milestones: {milestones.error.message}
        </p>
      )}

      {milestones.data?.length === 0 && suggestions.isLoading && (
        <p className="milestone-message" role="status">Preparing AI milestone suggestions…</p>
      )}
      {suggestions.isError && milestones.data?.length === 0 && (
        <div className="milestone-suggestions-error" role="alert">
          <p>Could not generate milestone suggestions: {suggestions.error.message}</p>
          <button
            className="goal-edit-button"
            type="button"
            onClick={() => void suggestions.refetch()}
          >
            Try suggestions again
          </button>
        </div>
      )}
      {!!suggestions.data?.length && (
        <div className="milestone-suggestions">
          <div>
            <h3>AI milestone suggestions</h3>
            <p>Review these suggested steps and add the ones that fit your goal.</p>
          </div>
          {suggestions.data.map((suggestion) => (
            <article className="milestone-suggestion-card" key={suggestion.title}>
              <div>
                <strong>{suggestion.title}</strong>
                <p>{suggestion.description}</p>
                <p><strong>Completion criteria:</strong> {suggestion.completion_criteria}</p>
              </div>
              <button
                className="goal-edit-button"
                type="button"
                disabled={isSaving}
                onClick={() => addSuggestion(suggestion)}
              >
                Add milestone
              </button>
            </article>
          ))}
        </div>
      )}

      {mutationError && !showForm && !editingId && (
        <p className="milestone-error" role="alert">{mutationError.message}</p>
      )}

      {(showForm || editingId) && (
        <form className="milestone-form" onSubmit={submitForm}>
          <h3>{editingId ? "Edit milestone" : "Add a milestone"}</h3>
          <label htmlFor={`milestone-title-${goalId}`}>Title</label>
          <input
            id={`milestone-title-${goalId}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={300}
            required
            disabled={isSaving}
          />
          <label htmlFor={`milestone-description-${goalId}`}>Description (optional)</label>
          <textarea
            id={`milestone-description-${goalId}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            rows={3}
            disabled={isSaving}
          />
          <label htmlFor={`milestone-criteria-${goalId}`}>Completion criteria (optional)</label>
          <textarea
            id={`milestone-criteria-${goalId}`}
            value={completionCriteria}
            onChange={(event) => setCompletionCriteria(event.target.value)}
            maxLength={5000}
            rows={2}
            disabled={isSaving}
          />
          <div className="milestone-form-fields">
            <div>
              <label htmlFor={`milestone-status-${goalId}`}>Status</label>
              <select
                id={`milestone-status-${goalId}`}
                value={status}
                onChange={(event) => setStatus(event.target.value as GoalMilestoneStatus)}
                disabled={isSaving}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`milestone-due-date-${goalId}`}>Due date (optional)</label>
              <input
                id={`milestone-due-date-${goalId}`}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>
          {mutationError && <p className="milestone-error" role="alert">{mutationError.message}</p>}
          <div className="goal-deactivation-actions">
            <button
              className="goal-edit-button"
              type="button"
              disabled={isSaving}
              onClick={() => {
                setEditingId(null);
                setShowForm(false);
                resetForm();
                createMutation.reset();
                updateMutation.reset();
              }}
            >
              Cancel
            </button>
            <button className="goal-edit-button" type="submit" disabled={isSaving || !title.trim()}>
              {isSaving ? "Saving…" : editingId ? "Save changes" : "Create milestone"}
            </button>
          </div>
        </form>
      )}

      {milestones.data?.length === 0 && !showForm && (
        <div className="empty-goal-state">
          <strong>No milestones yet</strong>
          <span>Add a meaningful step or checkpoint toward this goal.</span>
        </div>
      )}

      {!!milestones.data?.length && (
        <>
          <p className="milestone-progress-summary">
            {milestones.data.filter((item) => item.status === "completed").length} of {milestones.data.length} milestones completed
          </p>
          <div className="milestone-list">
            {milestones.data.map((milestone) => {
              const due = formatDate(milestone.due_date);
              return (
                <article className="milestone-card" key={milestone.id}>
                  <div className="milestone-card-main">
                    <div className="milestone-card-heading">
                      <h3>{milestone.title}</h3>
                      <span className={`milestone-status milestone-status-${milestone.status}`}>
                        {statusLabels[milestone.status]}
                      </span>
                      <span className="milestone-source">
                        {milestone.source === "ai" ? "AI suggested" : "Manually added"}
                      </span>
                    </div>
                    {milestone.description && <p>{milestone.description}</p>}
                    {milestone.completion_criteria && (
                      <p className="milestone-criteria"><strong>Completion criteria:</strong> {milestone.completion_criteria}</p>
                    )}
                    {due && <small>Due {due}</small>}
                  </div>
                  <div className="milestone-card-actions">
                    <label className="milestone-status-control">
                      <span className="visually-hidden">Update status for {milestone.title}</span>
                      <select
                        value={milestone.status}
                        disabled={isSaving || editingId === milestone.id}
                        onChange={(event) => changeStatus(milestone.id, event.target.value as GoalMilestoneStatus)}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="goal-edit-button"
                      type="button"
                      disabled={isSaving}
                      onClick={() => startEditing(milestone)}
                    >
                      Edit
                    </button>
                    <button
                      className="goal-edit-button"
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (window.confirm(`Archive “${milestone.title}”? You can permanently delete it from Archives later.`)) {
                          archiveMutation.mutate(milestone.id);
                        }
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {updateMutation.isError && !editingId && (
            <p className="milestone-error" role="alert">{updateMutation.error.message}</p>
          )}
        </>
      )}
    </section>
  );
}
