import type { ReactNode } from "react";
import type { AuthSession } from "../auth/auth";
import { NavLink } from "react-router-dom";
import "./AppShell.css";

interface ReviewerShellProps {
  children: ReactNode;
  session: AuthSession;
  onLogout: () => void;
}

export default function ReviewerShell({ children, session, onLogout }: ReviewerShellProps) {
  return (
    <div className="app-shell reviewer-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MyImpact</div>
            <div className="brand-tagline">Evaluate intelligence.</div>
          </div>
        </div>
        <nav className="navigation" aria-label="Reviewer navigation">
          <NavLink className="nav-item" to="/evaluate" end>Review dashboard</NavLink>
        </nav>
        <div className="sidebar-footer">Reviewer workspace</div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">MYIMPACT REVIEW</div>
            <div className="page-context">Independent evaluation</div>
          </div>
          <div className="topbar-account">
            <div className="account-identity">
              <span className="account-name">{session.displayName}</span>
              <span className="account-role">Evaluation reviewer</span>
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
