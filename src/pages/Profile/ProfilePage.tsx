import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import {
  getProfile,
  getReportingManagers,
  getTeams,
  updateDirectReportRole,
  updateProfile,
} from "../../api/myImpact";
import type { ProfileRole } from "../../types/api";
import "./Profile.css";

const profileRoles: ProfileRole[] = [
  "Trainee Software Engineer",
  "Junior Software Engineer",
  "Software Engineer",
  "Senior Software Engineer",
  "Lead Software Engineer",
  "Lead Software Architect",
  "Engineering Manager",
  "Senior Engineering Manager",
  "Engineering Director",
];

interface ProfilePageProps {
  onProfileUpdated: (role: string) => void;
}

export default function ProfilePage({ onProfileUpdated }: ProfilePageProps) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });
  const [company, setCompany] = useState("");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState<ProfileRole | "">("");
  const [managerId, setManagerId] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [reportRoleDrafts, setReportRoleDrafts] = useState<Record<string, ProfileRole>>({});

  useEffect(() => {
    if (!profileQuery.data) return;
    setCompany(profileQuery.data.company ?? "");
    setTeam(profileQuery.data.team ?? "");
    setRole(profileRoles.find((profileRole) => profileRole === profileQuery.data.role) ?? "");
    setManagerId(profileQuery.data.reporting_manager_id ?? "");
    setManagerSearch(
      profileQuery.data.reporting_manager
        ? `${profileQuery.data.reporting_manager.name} · ${profileQuery.data.reporting_manager.role}`
        : "",
    );
  }, [profileQuery.data]);

  const teamOptionsQuery = useQuery({
    queryKey: ["organization-teams", company.trim()],
    queryFn: () => getTeams(company.trim()),
    enabled: Boolean(company.trim()),
  });

  const managerOptionsQuery = useQuery({
    queryKey: ["reporting-managers", company.trim(), role, team.trim()],
    queryFn: () => getReportingManagers(company.trim(), role || undefined, team.trim() || undefined),
    enabled: Boolean(company.trim()),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!company.trim()) throw new Error("Company is required.");
      if (team.trim().length > 200) throw new Error("Team must be 200 characters or fewer.");
      if (managerSearch.trim() && !managerId) {
        throw new Error("Choose a reporting manager from the suggestions or clear the field.");
      }
      return updateProfile({
        company: company.trim(),
        team: team.trim() || null,
        role: role || null,
        reporting_manager_id: managerId || null,
      });
    },
    onSuccess: async (profile) => {
      setFormError("");
      onProfileUpdated(profile.role ?? "MyImpact member");
      if (role) {
        queryClient.setQueryData(
          ["reporting-managers", company.trim(), role, team.trim()],
          profile.reporting_manager_options,
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["organization-teams", company.trim()] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Could not save your profile.");
    },
  });

  const reportRoleMutation = useMutation({
    mutationFn: ({ reportId, role: reportRole }: { reportId: string; role: ProfileRole }) =>
      updateDirectReportRole(reportId, reportRole),
    onSuccess: async (updatedReport) => {
      setReportRoleDrafts((drafts) => {
        const { [updatedReport.id]: _updatedRole, ...remainingDrafts } = drafts;
        return remainingDrafts;
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    mutation.mutate();
  }

  if (profileQuery.isLoading) return <p>Loading your profile…</p>;
  if (profileQuery.isError) {
    return (
      <p role="alert">
        Could not load your profile: {profileQuery.error.message}
      </p>
    );
  }
  if (!profileQuery.data) return <p role="status">Loading your profile…</p>;

  const managers = managerOptionsQuery.data ?? [];
  const isDirector = role === "Engineering Director";
  const companyHasChanged =
    company.trim().toLocaleLowerCase() !==
    (profileQuery.data.company ?? "").trim().toLocaleLowerCase();

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="eyebrow">YOUR WORK PROFILE</div>
        <h1>Profile & reporting structure</h1>
        <p>
          Add your company and reporting manager to connect your organization-specific
          goals. Your reporting manager assigns your role. Add a team to narrow
          manager suggestions, or leave it blank to search the whole company.
        </p>
      </header>

      <div className="profile-layout">
        <form className="profile-card" onSubmit={handleSubmit}>
          <div className="profile-card-heading">
            <div className="eyebrow">PROFILE DETAILS</div>
            <h2>Your organization</h2>
          </div>

          <label className="profile-field">
            <span>Company <b>*</b></span>
            <input
              value={company}
              onChange={(event) => {
                setCompany(event.target.value);
                setTeam("");
                setManagerId("");
                setManagerSearch("");
              }}
              placeholder="e.g. Acme Engineering"
              maxLength={200}
              required
            />
            <small>Entering a new company name creates its organization directory.</small>
          </label>

          <label className="profile-field">
            <span>Team</span>
            <input
              type="text"
              list="organization-team-options"
              value={team}
              onChange={(event) => {
                setTeam(event.target.value);
                setManagerId("");
                setManagerSearch("");
              }}
              placeholder="Search or add a team (optional)"
              autoComplete="off"
              aria-describedby="team-hint"
              disabled={!company.trim()}
              maxLength={200}
            />
            <datalist id="organization-team-options">
              {(teamOptionsQuery.data ?? []).map((teamOption) => (
                <option key={teamOption.id} value={teamOption.name} />
              ))}
            </datalist>
            <small id="team-hint">
              {teamOptionsQuery.isLoading
                ? "Finding teams in this company…"
                : "Choose an existing team or enter a new one. Teams are shared within your company."}
            </small>
          </label>

          <label className="profile-field">
            <span>Role</span>
            <input value={profileQuery.data.role ?? "Not assigned"} disabled />
            <small>
              Your reporting manager assigns and updates your role.
            </small>
          </label>

          {!isDirector ? (
            <label className="profile-field">
              <span>Reporting manager</span>
              <input
                type="text"
                list="reporting-manager-options"
                value={managerSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  const selectedManager = managers.find(
                    (manager) => `${manager.name} · ${manager.role}` === value,
                  );
                  setManagerSearch(value);
                  setManagerId(selectedManager?.id ?? "");
                }}
                placeholder="Search for a manager (optional)"
                autoComplete="off"
                aria-describedby="reporting-manager-hint"
                disabled={!company.trim() || managerOptionsQuery.isLoading}
                required={!profileQuery.data.role}
              />
              <datalist id="reporting-manager-options">
                {managers.map((manager) => (
                  <option key={manager.id} value={`${manager.name} · ${manager.role}`} />
                ))}
              </datalist>
              <small id="reporting-manager-hint">
                {managerOptionsQuery.isLoading
                  ? team.trim()
                    ? "Finding eligible managers in this team…"
                    : "Finding eligible managers in this company…"
                  : managers.length
                    ? !role
                      ? "Choose a reporting manager; they can assign your role."
                      : role.includes("Manager")
                      ? "Engineering managers report to an Engineering Director. Suggestions match your team when selected."
                      : "Engineers can report to an Engineering Manager or Senior Engineering Manager. Suggestions match your team when selected."
                    : companyHasChanged
                      ? "Save your company and team first. Then eligible managers will be available here."
                      : "No eligible managers are set up for this selection yet. Clear the team to search the whole company, or save without a manager."}
              </small>
            </label>
          ) : (
            <div className="profile-hierarchy-note">
              Engineering Directors are at the top of the reporting levels currently supported.
            </div>
          )}

          {managerOptionsQuery.isError && (
            <p className="profile-error" role="alert">
              Could not load reporting managers: {managerOptionsQuery.error.message}
            </p>
          )}
          {formError && <p className="profile-error" role="alert">{formError}</p>}

          <div className="profile-actions">
            <button className="button button-primary" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>

        <section className="profile-card reporting-card" aria-labelledby="reporting-structure-title">
          <div className="profile-card-heading">
            <div className="eyebrow">ORGANIZATION CHART</div>
            <h2 id="reporting-structure-title">Your reporting structure</h2>
            <p>
              {profileQuery.data.company ?? "Add your company to join its organization chart."}
              {profileQuery.data.team ? ` · ${profileQuery.data.team}` : ""}
            </p>
          </div>
          {profileQuery.data.reporting_manager ? (
            <div className="reporting-person">
              <span className="reporting-person-label">REPORTS TO</span>
              <strong>{profileQuery.data.reporting_manager.name}</strong>
              <span>{profileQuery.data.reporting_manager.role}</span>
            </div>
          ) : (
            <p className="reporting-empty">No reporting manager is associated yet.</p>
          )}
          <div className="reporting-team">
            <span className="reporting-person-label">DIRECT REPORTS</span>
            {profileQuery.data.direct_reports.length ? (
              <ul>
                {profileQuery.data.direct_reports.map((report) => (
                  <li key={report.id}>
                    <strong>{report.name}</strong>
                    <span>{report.role ?? "Role not assigned"}</span>
                    {profileQuery.data.direct_report_role_options.length > 0 && (
                      <div className="reporting-role-edit">
                        <select
                          aria-label={`Role for ${report.name}`}
                          value={reportRoleDrafts[report.id] ?? report.role ?? ""}
                          onChange={(event) => {
                            const selectedRole = profileRoles.find(
                              (profileRole) => profileRole === event.target.value,
                            );
                            if (selectedRole) {
                              setReportRoleDrafts((drafts) => ({
                                ...drafts,
                                [report.id]: selectedRole,
                              }));
                            }
                          }}
                        >
                          {!report.role && (
                            <option value="" disabled>Select role</option>
                          )}
                          {report.role &&
                            !profileQuery.data.direct_report_role_options.some(
                              (roleOption) => roleOption === report.role,
                            ) && (
                              <option value={report.role}>{report.role} (current)</option>
                            )}
                          {profileQuery.data.direct_report_role_options.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>{roleOption}</option>
                          ))}
                        </select>
                        <button
                          className="reporting-role-save"
                          type="button"
                          disabled={
                            reportRoleMutation.isPending ||
                            !reportRoleDrafts[report.id] ||
                            reportRoleDrafts[report.id] === report.role
                          }
                          onClick={() => {
                            const selectedRole = reportRoleDrafts[report.id];
                            if (selectedRole) {
                              reportRoleMutation.mutate({
                                reportId: report.id,
                                role: selectedRole,
                              });
                            }
                          }}
                        >
                          {reportRoleMutation.isPending ? "Saving…" : "Update role"}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="reporting-empty">No direct reports are associated.</p>
            )}
            {reportRoleMutation.isError && (
              <p className="profile-error" role="alert">
                Could not update role: {reportRoleMutation.error.message}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
