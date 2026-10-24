import { Navigate, Route, Routes } from "react-router-dom";
import type { AuthSession } from "../../auth/auth";
import AdminShell from "../../layouts/AdminShell";
import AdminCompaniesPage from "./AdminCompaniesPage";
import AdminUsersPage from "./AdminUsersPage";
import PlatformAdminDashboardPage from "./PlatformAdminDashboardPage";

interface AdminRoutesProps {
  session: AuthSession;
  onLogout: () => void;
}

export default function AdminRoutes({ session, onLogout }: AdminRoutesProps) {
  return (
    <AdminShell session={session} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PlatformAdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/companies" element={<AdminCompaniesPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AdminShell>
  );
}
