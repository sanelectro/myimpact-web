import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import {
  createCompanyRole,
  deleteCompanyRole,
  getCompanyRoleHistory,
  getCompanyRoles,
  updateCompanyRole,
} from "../../api/myImpact";
import type {
  CompanyRoleDefinition,
  CompanyRoleWriteRequest,
} from "../../types/api";
import "./CompanyRolesPage.css";

function emptyRole(): CompanyRoleWriteRequest {
  return {
    name: "",
    summary: null,
    responsibilities: [],
    goals: [],
    competencies: [],
  };
}

function toDraft(role: CompanyRoleDefinition): CompanyRoleWriteRequest {
  return {
    name: role.name,
    summary: role.summary,
    responsibilities: role.responsibilities.map(({ statement }) => ({ statement })),
    goals: role.goals.map(({ title, description }) => ({ title, description })),
    competencies: role.competencies.map(
      ({ name, expected_level, description }) => ({
        name,
        expected_level,
        description,
      }),
    ),
  };
}

export default function CompanyRolesPage() {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: ["company-roles"],
    queryFn: getCompanyRoles,
  });
  const historyQuery = useQuery({
    queryKey: ["company-role-history"],
    queryFn: getCompanyRoleHistory,
  });
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<CompanyRoleWriteRequest>(emptyRole);
  const [formError, setFormError] = useState("");
  const roles = rolesQuery.data ?? [];

  useEffect(() => {
    if (isCreating || selectedRoleId || !roles.length) return;
    setSelectedRoleId(roles[0].id);
    setDraft(toDraft(roles[0]));
  }, [isCreating, roles, selectedRoleId]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: CompanyRoleWriteRequest = {
        ...draft,
        name: draft.name.trim(),
        summary: draft.summary?.trim() || null,
        responsibilities: draft.responsibilities
          .map(({ statement }) => ({ statement: statement.trim() }))
          .filter(({ statement }) => statement.length > 0),
        goals: draft.goals
          .map(({ title, description }) => ({
            title: title.trim(),
            description: description?.trim() || null,
          }))
          .filter(({ title }) => title.length > 0),
        competencies: draft.competencies
          .map(({ name, expected_level, description }) => ({
            name: name.trim(),
            expected_level: expected_level?.trim() || null,
            description: description?.trim() || null,
          }))
          .filter(({ name }) => name.length > 0),
      };
      if (!payload.name) throw new Error("Role name is required.");
      return selectedRoleId
        ? updateCompanyRole(selectedRoleId, payload)
        : createCompanyRole(payload);
    },
    onSuccess: async (role) => {
      setFormError("");
      setSelectedRoleId(role.id);
      setIsCreating(false);
      setDraft(toDraft(role));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company-roles"] }),
        queryClient.invalidateQueries({ queryKey: ["company-role-history"] }),
      ]);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : "Could not save the role.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => deleteCompanyRole(roleId),
    onSuccess: async (_result, roleId) => {
      queryClient.setQueryData<CompanyRoleDefinition[]>(
        ["company-roles"],
        (current) => current?.filter((role) => role.id !== roleId),
      );
      setSelectedRoleId(null);
      setIsCreating(false);
      setDraft(emptyRole());
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["company-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["company-role-history"] });
    },
    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : "Could not delete the role.",
      );
    },
  });

  function startNewRole() {
    setSelectedRoleId(null);
    setIsCreating(true);
    setDraft(emptyRole());
    setFormError("");
  }

  function selectRole(role: CompanyRoleDefinition) {
    setSelectedRoleId(role.id);
    setIsCreating(false);
    setDraft(toDraft(role));
    setFormError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    saveMutation.mutate();
  }

  function deleteSelectedRole() {
    if (!selectedRoleId) return;
    if (window.confirm(`Delete "${draft.name}" from this company?`)) {
      deleteMutation.mutate(selectedRoleId);
    }
  }

  const busy = saveMutation.isPending || deleteMutation.isPending;

  return (
    <div className="company-roles-page">
      <header className="company-roles-header">
        <div className="eyebrow">MANAGER WORKSPACE</div>
        <h1>Company roles</h1>
        <p>
          Maintain the roles, responsibilities, goals, and optional skills or
          competencies used across your company. Changes and previous versions
          are visible to company managers and above.
        </p>
      </header>

      {rolesQuery.isError && (
        <div className="role-catalog-error" role="alert">
          Could not load company roles: {rolesQuery.error.message}
        </div>
      )}
      {formError && (
        <div className="role-catalog-error" role="alert">{formError}</div>
      )}

      <div className="company-roles-layout">
        <aside className="role-list-card" aria-label="Company role list">
          <div className="role-list-heading">
            <h2>Roles</h2>
            <button type="button" onClick={startNewRole}>Add role</button>
          </div>
          {rolesQuery.isLoading && <p role="status">Loading roles…</p>}
          {!rolesQuery.isLoading && roles.length === 0 && (
            <p className="role-empty-message">No roles have been added yet.</p>
          )}
          <div className="role-list">
            {roles.map((role) => (
              <button
                className={
                  selectedRoleId === role.id
                    ? "role-list-item selected"
                    : "role-list-item"
                }
                type="button"
                key={role.id}
                aria-pressed={selectedRoleId === role.id}
                onClick={() => selectRole(role)}
              >
                <strong>{role.name}</strong>
                <span>
                  {role.responsibilities.length} responsibilities ·{" "}
                  {role.goals.length} goals
                </span>
              </button>
            ))}
          </div>
        </aside>

        <form className="role-editor-card" onSubmit={submit}>
          <div className="role-editor-heading">
            <div>
              <div className="eyebrow">
                {selectedRoleId ? "EDIT COMPANY ROLE" : "NEW COMPANY ROLE"}
              </div>
              <h2>{selectedRoleId ? draft.name : "Role details"}</h2>
            </div>
            {selectedRoleId && (
              <button
                className="role-delete-button"
                type="button"
                disabled={busy}
                onClick={deleteSelectedRole}
              >
                Delete role
              </button>
            )}
          </div>

          <label className="role-field">
            Role name
            <input
              aria-label="Role name"
              required
              maxLength={200}
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>

          <label className="role-field">
            Summary
            <textarea
              aria-label="Role summary"
              rows={3}
              maxLength={4000}
              value={draft.summary ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  summary: event.target.value || null,
                }))
              }
            />
          </label>

          <label className="role-field">
            Responsibilities
            <span className="role-field-hint">One responsibility per line.</span>
            <textarea
              aria-label="Responsibilities"
              rows={6}
              maxLength={10000}
              value={draft.responsibilities.map(({ statement }) => statement).join("\n")}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  responsibilities: event.target.value
                    .split("\n")
                    .map((statement) => ({ statement })),
                }))
              }
            />
          </label>

          <section className="role-editor-section" aria-labelledby="role-goals-heading">
            <div className="role-section-heading">
              <div>
                <h3 id="role-goals-heading">Role goals</h3>
                <p>Suggested outcomes can be tailored for each employee.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    goals: [...current.goals, { title: "", description: null }],
                  }))
                }
              >
                Add goal
              </button>
            </div>
            {draft.goals.map((goal, index) => (
              <div className="role-item-editor" key={`goal-${index}`}>
                <label className="role-field">
                  Goal title {index + 1}
                  <input
                    aria-label={`Goal title ${index + 1}`}
                    maxLength={300}
                    value={goal.title}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        goals: current.goals.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="role-field">
                  Goal description {index + 1}
                  <textarea
                    aria-label={`Goal description ${index + 1}`}
                    rows={2}
                    maxLength={2000}
                    value={goal.description ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        goals: current.goals.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                description: event.target.value || null,
                              }
                            : item,
                        ),
                      }))
                    }
                  />
                </label>
                <button
                  className="role-remove-button"
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      goals: current.goals.filter(
                        (_item, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                >
                  Remove goal
                </button>
              </div>
            ))}
          </section>

          <section
            className="role-editor-section"
            aria-labelledby="role-competencies-heading"
          >
            <div className="role-section-heading">
              <div>
                <h3 id="role-competencies-heading">Technical skills / competencies</h3>
                <p>Optional. Add a proficiency level or description where useful.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    competencies: [
                      ...current.competencies,
                      { name: "", expected_level: null, description: null },
                    ],
                  }))
                }
              >
                Add competency
              </button>
            </div>
            {draft.competencies.map((competency, index) => (
              <div className="role-item-editor" key={`competency-${index}`}>
                <label className="role-field">
                  Skill or competency {index + 1}
                  <input
                    aria-label={`Skill or competency ${index + 1}`}
                    maxLength={200}
                    value={competency.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        competencies: current.competencies.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="role-field">
                  Expected level {index + 1}
                  <input
                    aria-label={`Expected level ${index + 1}`}
                    maxLength={100}
                    value={competency.expected_level ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        competencies: current.competencies.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                expected_level: event.target.value || null,
                              }
                            : item,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="role-field">
                  Competency description {index + 1}
                  <textarea
                    aria-label={`Competency description ${index + 1}`}
                    rows={2}
                    maxLength={2000}
                    value={competency.description ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        competencies: current.competencies.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, description: event.target.value || null }
                            : item,
                        ),
                      }))
                    }
                  />
                </label>
                <button
                  className="role-remove-button"
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      competencies: current.competencies.filter(
                        (_item, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                >
                  Remove competency
                </button>
              </div>
            ))}
          </section>

          <div className="role-form-actions">
            <button type="submit" disabled={busy || rolesQuery.isLoading}>
              {saveMutation.isPending
                ? "Saving…"
                : selectedRoleId
                  ? "Save changes"
                  : "Create role"}
            </button>
          </div>
        </form>
      </div>

      <section className="role-history-card" aria-labelledby="role-history-heading">
        <div className="role-history-heading">
          <div>
            <div className="eyebrow">COMPANY AUDIT LOG</div>
            <h2 id="role-history-heading">Role change history</h2>
            <p>All company managers and above can review these changes and snapshots.</p>
          </div>
        </div>
        {historyQuery.isLoading && <p role="status">Loading role history…</p>}
        {historyQuery.isError && (
          <p className="role-catalog-error" role="alert">
            Could not load role history: {historyQuery.error.message}
          </p>
        )}
        {historyQuery.data?.length === 0 && (
          <p className="role-empty-message">No role changes have been recorded.</p>
        )}
        <ol className="role-history-list">
          {historyQuery.data?.map((event) => (
            <li key={event.id} className="role-history-event">
              <div className="role-history-event-heading">
                <strong>{event.action.toLowerCase()}</strong>
                <span>{event.role_name}</span>
                <span>
                  {event.actor_name} · {event.actor_role}
                </span>
                <time dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString()}
                </time>
              </div>
              <details>
                <summary>View before and after snapshots</summary>
                <div className="role-snapshot-grid">
                  <section>
                    <h3>Before</h3>
                    <pre>{JSON.stringify(event.before_snapshot, null, 2)}</pre>
                  </section>
                  <section>
                    <h3>After</h3>
                    <pre>{JSON.stringify(event.after_snapshot, null, 2)}</pre>
                  </section>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
