import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  getAllCompanyUsers,
  getGoalEvidence,
  getGoalImpact,
  getUserGoals,
  inviteCompanyUser,
  setCompanyUserActive,
} from "../../api/myImpact";
import type { AdminUser, Goal } from "../../types/api";
import "./AdminUsersPage.css";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const query = useQuery({
    queryKey: ["admin", "all-company-users"],
    queryFn: getAllCompanyUsers,
  });

  const inviteMutation = useMutation({
    mutationFn: inviteCompanyUser,
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "all-company-users"] });
      const url = new URL("/login", window.location.origin);
      url.hash = new URLSearchParams({ invite: invitation.invite_token }).toString();
      setInviteLink(url.toString());
      setName("");
      setEmail("");
      setCompany("");
      setRole("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => setCompanyUserActive(userId, isActive),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "all-company-users"] }),
  });

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    inviteMutation.reset();
    setInviteLink(null);
    inviteMutation.mutate({
      name,
      email,
      company,
      role: role.trim() || null,
    });
  }

  if (query.isLoading) return <p role="status">Loading users across companies…</p>;
  if (query.isError) {
    return (
      <p role="alert">
        Could not load the user directory: {errorMessage(query.error)}
      </p>
    );
  }

  const users = query.data ?? [];

  return (
    <div>
      <div className="page-heading">
        <div className="eyebrow">MYIMPACT PLATFORM ADMINISTRATION</div>
        <h1>Customer users</h1>
        <p>Review users and career-impact data across all customer companies.</p>
      </div>

      <section className="surface-card admin-invite-card">
        <div className="card-eyebrow">INVITE A CUSTOMER USER</div>
        <h2>Create an invitation</h2>
        <form className="admin-invite-form" onSubmit={handleInvite}>
          <label>
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label>
            Work email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Company
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label>
            Job title <span>(optional)</span>
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              maxLength={200}
            />
          </label>
          <button
            className="login-submit admin-invite-submit"
            type="submit"
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending ? "Creating invitation…" : "Create invitation"}
          </button>
        </form>
        {inviteMutation.isError && (
          <p role="alert">Could not create invitation: {errorMessage(inviteMutation.error)}</p>
        )}
        {inviteLink && (
          <p className="admin-invite-link" role="status">
            Copy and share this invitation link (valid for 72 hours):{" "}
            <code>{inviteLink}</code>
          </p>
        )}
      </section>

      <section className="admin-users-section">
        <h2>Users across companies ({users.length})</h2>
        {statusMutation.isError && (
          <p role="alert">
            Could not update account status: {errorMessage(statusMutation.error)}
          </p>
        )}
        {users.length ? (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Company</th>
                  <th scope="col">Job title</th>
                  <th scope="col">Account</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.company ?? "Not assigned"}</td>
                    <td>{user.role ?? "Not assigned"}</td>
                    <td>
                      {user.is_active
                        ? "Active"
                        : user.invitation_pending
                          ? "Invitation pending"
                          : "Disabled"}
                    </td>
                    <td>
                      <div className="admin-user-actions">
                        <button
                          type="button"
                          className="admin-secondary-button"
                          onClick={() => setSelectedUser(user)}
                        >
                          Review data
                        </button>
                        <button
                          type="button"
                          className="admin-secondary-button"
                          disabled={
                            statusMutation.isPending ||
                            (!user.is_active && user.invitation_pending)
                          }
                          onClick={() =>
                            statusMutation.mutate({
                              userId: user.id,
                              isActive: !user.is_active,
                            })
                          }
                        >
                          {user.is_active
                            ? "Disable"
                            : !user.invitation_pending
                              ? "Reactivate"
                              : "Invitation pending"}
                        </button>
                        {!user.is_active && user.invitation_pending && (
                          <button
                            type="button"
                            className="admin-secondary-button"
                            disabled={inviteMutation.isPending}
                            onClick={() =>
                              inviteMutation.mutate({
                                name: user.name,
                                email: user.email,
                                company: user.company ?? "",
                                role: user.role,
                              })
                            }
                          >
                            Resend invitation
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <section className="surface-card">
            <p>No users are registered yet.</p>
          </section>
        )}
      </section>

      {selectedUser && (
        <AdminEmployeeData
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

function AdminEmployeeData({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const goalsQuery = useQuery({
    queryKey: ["admin", "user-goals", user.id],
    queryFn: () => getUserGoals(user.id),
  });

  return (
    <section className="admin-employee-data" aria-labelledby="admin-employee-title">
      <div className="admin-employee-heading">
        <div>
          <div className="eyebrow">CROSS-COMPANY EMPLOYEE REVIEW</div>
          <h2 id="admin-employee-title">{user.name}</h2>
          <p>{user.company ?? "Company not assigned"} · {user.email}</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={onClose}>
          Close review
        </button>
      </div>

      {goalsQuery.isLoading && <p role="status">Loading employee goals…</p>}
      {goalsQuery.isError && (
        <p role="alert">Could not load employee goals: {errorMessage(goalsQuery.error)}</p>
      )}
      {goalsQuery.data?.map((goal) => (
        <AdminGoalReview key={goal.id} goal={goal} userId={user.id} />
      ))}
      {goalsQuery.data?.length === 0 && (
        <p className="admin-empty-goals">This employee has no goals yet.</p>
      )}
    </section>
  );
}

function AdminGoalReview({ goal, userId }: { goal: Goal; userId: string }) {
  const evidenceQuery = useQuery({
    queryKey: ["admin", "goal-evidence", userId, goal.id],
    queryFn: () => getGoalEvidence(goal.id, userId),
  });
  const impactQuery = useQuery({
    queryKey: ["admin", "goal-impact", userId, goal.id],
    queryFn: () => getGoalImpact(goal.id, userId),
  });

  return (
    <article className="admin-goal-review">
      <div className="admin-goal-title">
        <div>
          <span className="goal-status">{goal.status.replaceAll("_", " ")}</span>
          <h3>{goal.title}</h3>
        </div>
        <span>{goal.scope}</span>
      </div>
      {goal.description && <p>{goal.description}</p>}
      {(evidenceQuery.isError || impactQuery.isError) && (
        <p role="alert">
          Could not load all goal details:{" "}
          {errorMessage(evidenceQuery.error ?? impactQuery.error)}
        </p>
      )}
      <div className="admin-goal-data-grid">
        <section>
          <h4>Impact</h4>
          {impactQuery.isLoading && <p>Loading impact…</p>}
          {impactQuery.data?.length ? (
            <ul>
              {impactQuery.data.map((assessment) => (
                <li key={assessment.id}>
                  <strong>{assessment.impact_type.replaceAll("_", " ")}</strong>
                  <span>{assessment.impact_summary}</span>
                </li>
              ))}
            </ul>
          ) : (
            !impactQuery.isLoading && <p>No impact assessments yet.</p>
          )}
        </section>
        <section>
          <h4>Evidence</h4>
          {evidenceQuery.isLoading && <p>Loading evidence…</p>}
          {evidenceQuery.data?.length ? (
            <ul>
              {evidenceQuery.data.map((evidence) => (
                <li key={evidence.evidence_id}>
                  <strong>{evidence.title}</strong>
                  {evidence.description && <span>{evidence.description}</span>}
                </li>
              ))}
            </ul>
          ) : (
            !evidenceQuery.isLoading && <p>No evidence attached yet.</p>
          )}
        </section>
      </div>
    </article>
  );
}
