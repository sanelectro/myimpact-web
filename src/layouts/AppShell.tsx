import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { getProfile } from "../api/myImpact";
import type { AuthSession } from "../auth/auth";
import { canManageCompanyRoles } from "../auth/rolePermissions";
import "./AppShell.css";

interface AppShellProps {
  children: ReactNode;
  session: AuthSession;
  onLogout: () => void;
}

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/goals", label: "Goals" },
  { to: "/archives", label: "Archives" },
  { to: "/notifications", label: "Notifications" },
  { to: "/impact", label: "Impact" },
  { to: "/career", label: "Career Journey" },
  { to: "/profile", label: "My Profile" },
  { to: "/reports", label: "1:1 & Reports" },
  { to: "/chat", label: "AI Assistant" },
];

export default function AppShell({ children, session, onLogout }: AppShellProps) {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });
  const isManager =
    ["Engineering Manager", "Senior Engineering Manager", "Engineering Director"].includes(
      session.role,
    ) || Boolean(profileQuery.data?.direct_reports.length);
  const managerNavigation = isManager
    ? [{ to: "/pending-requests", label: "Pending requests" }]
    : [];
  if (canManageCompanyRoles(session.role)) {
    managerNavigation.push({
      to: "/company-roles",
      label: "Company roles",
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MyImpact</div>
            <div className="brand-tagline">Measure impact, not activity.</div>
          </div>
        </div>

        <nav className="navigation" aria-label="Main navigation">
          {[...navigation.slice(0, 3), ...managerNavigation, ...navigation.slice(3)].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">M6 · Product Experience</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">MYIMPACT</div>
            <div className="page-context">Career impact workspace</div>
          </div>
          <div className="topbar-account">
            <div className="account-identity">
              <span className="account-name">{session.displayName}</span>
              <span className="account-role">{session.role}</span>
            </div>
            <button className="sign-out-button" type="button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
