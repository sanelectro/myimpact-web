import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { AuthSession } from "../auth/auth";
import "./AppShell.css";
import "./AdminShell.css";

interface AdminShellProps {
  children: ReactNode;
  session: AuthSession;
  onLogout: () => void;
}

const navigation = [
  { to: "/dashboard", label: "Platform overview" },
  { to: "/admin/users", label: "Customer accounts" },
  { to: "/admin/companies", label: "Company information" },
];

export default function AdminShell({
  children,
  session,
  onLogout,
}: AdminShellProps) {
  return (
    <div className="app-shell platform-admin-shell">
      <aside className="sidebar platform-admin-sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MyImpact</div>
            <div className="brand-tagline">Platform operations</div>
          </div>
        </div>

        <div className="platform-admin-nav-label">ADMINISTRATION</div>
        <nav className="navigation" aria-label="Platform administration">
          {navigation.map((item) => (
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

        <div className="sidebar-footer platform-admin-sidebar-footer">
          Internal platform console
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar platform-admin-topbar">
          <div>
            <div className="eyebrow">MYIMPACT PLATFORM</div>
            <div className="page-context">Customer operations</div>
          </div>
          <div className="topbar-account">
            <div className="account-identity">
              <span className="account-name">{session.displayName}</span>
              <span className="account-role">Platform administrator</span>
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
