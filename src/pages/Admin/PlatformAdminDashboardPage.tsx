import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAllCompanyUsers } from "../../api/myImpact";
import "./PlatformAdminDashboardPage.css";

interface CompanySummary {
  name: string;
  users: number;
  active: number;
  pending: number;
  disabled: number;
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <article className="platform-metric-card">
      <div className="card-eyebrow">{label}</div>
      <strong>{value.toLocaleString()}</strong>
      <p>{description}</p>
    </article>
  );
}

export default function PlatformAdminDashboardPage() {
  const query = useQuery({
    queryKey: ["admin", "all-company-users"],
    queryFn: getAllCompanyUsers,
  });

  if (query.isLoading) {
    return <p role="status">Loading MyImpact platform overview…</p>;
  }
  if (query.isError) {
    return (
      <article className="surface-card error-card" role="alert">
        <div className="card-eyebrow">PLATFORM OVERVIEW ERROR</div>
        <h2>Could not load the platform overview</h2>
        <p>{query.error instanceof Error ? query.error.message : "Unknown error"}</p>
      </article>
    );
  }

  const users = query.data ?? [];
  const companies = new Map<string, CompanySummary>();
  for (const user of users) {
    const companyName = user.company ?? "Company not assigned";
    const summary = companies.get(companyName) ?? {
      name: companyName,
      users: 0,
      active: 0,
      pending: 0,
      disabled: 0,
    };
    summary.users += 1;
    if (user.is_active) summary.active += 1;
    else if (user.invitation_pending) summary.pending += 1;
    else summary.disabled += 1;
    companies.set(companyName, summary);
  }

  const companySummaries = [...companies.values()].sort(
    (left, right) => right.users - left.users || left.name.localeCompare(right.name),
  );
  const activeUsers = users.filter((user) => user.is_active).length;
  const pendingInvitations = users.filter((user) => user.invitation_pending).length;
  const disabledUsers = users.filter(
    (user) => !user.is_active && !user.invitation_pending,
  ).length;

  return (
    <div className="platform-admin-dashboard">
      <header className="platform-admin-hero">
        <div>
          <div className="eyebrow">MYIMPACT PLATFORM ADMINISTRATION</div>
          <h1>Platform overview</h1>
          <p>
            Monitor customer adoption and account health across every company
            using MyImpact.
          </p>
        </div>
        <Link className="primary-link" to="/admin/users">
          Manage customer accounts →
        </Link>
      </header>

      <section className="platform-metric-grid" aria-label="Platform account metrics">
        <MetricCard
          label="CUSTOMER ACCOUNTS"
          value={users.length}
          description="Employee accounts across customer companies"
        />
        <MetricCard
          label="COMPANIES"
          value={companySummaries.filter((company) => company.name !== "Company not assigned").length}
          description="Companies represented in MyImpact"
        />
        <MetricCard
          label="ACTIVE ACCOUNTS"
          value={activeUsers}
          description="Accounts that can currently sign in"
        />
        <MetricCard
          label="PENDING INVITATIONS"
          value={pendingInvitations}
          description="Invitations awaiting employee activation"
        />
      </section>

      <div className="platform-admin-content-grid">
        <section className="surface-card platform-company-card">
          <div className="section-heading">
            <div>
              <div className="card-eyebrow">CUSTOMER COMPANIES</div>
              <h2>Account health by company</h2>
            </div>
            <Link className="text-link" to="/admin/users">
              View all accounts →
            </Link>
          </div>
          {companySummaries.length ? (
            <div className="platform-company-table-wrap">
              <table className="platform-company-table">
                <thead>
                  <tr>
                    <th scope="col">Company</th>
                    <th scope="col">Users</th>
                    <th scope="col">Active</th>
                    <th scope="col">Invited</th>
                    <th scope="col">Disabled</th>
                  </tr>
                </thead>
                <tbody>
                  {companySummaries.map((company) => (
                    <tr key={company.name}>
                      <th scope="row">{company.name}</th>
                      <td>{company.users}</td>
                      <td>{company.active}</td>
                      <td>{company.pending}</td>
                      <td>{company.disabled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No customer accounts have been added yet.</p>
          )}
        </section>

        <aside className="surface-card platform-admin-actions">
          <div className="card-eyebrow">PLATFORM ACTIONS</div>
          <h2>Keep customer access moving</h2>
          <p>
            Invite employees, resend pending invitations, or restore accounts
            that have been disabled.
          </p>
          <Link className="primary-link" to="/admin/users">
            Open customer account management →
          </Link>
          <Link className="text-link" to="/admin/companies">
            Manage company information →
          </Link>
          <div className="platform-admin-disabled-count">
            <span>Disabled accounts</span>
            <strong>{disabledUsers}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
