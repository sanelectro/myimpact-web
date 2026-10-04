import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface AppShellProps {
  children: ReactNode;
}

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/goals", label: "Goals" },
  { to: "/knowledge", label: "Knowledge" },
  { to: "/impact", label: "Impact" },
  { to: "/reports", label: "1:1 & Reports" },
  { to: "/chat", label: "AI Assistant" },
];

export default function AppShell({ children }: AppShellProps) {
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

        <div className="sidebar-footer">M6 · Product Experience</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">MYIMPACT</div>
            <div className="page-context">Career impact workspace</div>
          </div>
          <div className="user-chip">You</div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
