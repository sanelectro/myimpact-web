import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import {
  getAuthSession,
  restoreSession,
  signOut,
  type AuthSession,
} from "./auth/auth";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ImpactPage from "./pages/Impact/ImpactPage";
import ImpactDetailPage from "./pages/Impact/ImpactDetailPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import GoalsPage from "./pages/Goals/GoalsPage";
import GoalDetailPage from "./pages/Goals/GoalDetailPage";
import GoalFormPage from "./pages/Goals/GoalFormPage";
import GoalImportPage from "./pages/Goals/GoalImportPage";
import CareerJourneyPage from "./pages/CareerJourney/CareerJourneyPage";
import LoginPage from "./pages/Login/LoginPage";
import KnowledgePage from "./pages/Knowledge/KnowledgePage";
import MilestonesPage from "./pages/Milestones/MilestonesPage";
import ArchivesPage from "./pages/Archives/ArchivesPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import PendingRequestsPage from "./pages/Approvals/PendingRequestsPage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import AdminRoutes from "./pages/Admin/AdminRoutes";

export default function App() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(getAuthSession);
  const [isRestoring, setIsRestoring] = useState(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void restoreSession()
      .then((restoredSession) => {
        if (active) setSession(restoredSession);
      })
      .catch((error: unknown) => {
        if (active) {
          setSession(null);
          setAuthNotice(
            error instanceof Error
              ? `Could not restore your session: ${error.message}`
              : "Could not restore your session. Refresh to try again.",
          );
        }
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleLogin(nextSession: AuthSession) {
    queryClient.clear();
    setAuthNotice(null);
    setSession(nextSession);
  }

  async function handleLogout() {
    try {
      await signOut();
      setAuthNotice(null);
    } catch (error) {
      setAuthNotice(
        error instanceof Error
          ? `Signed out locally, but the server could not revoke the refresh session: ${error.message}`
          : "Signed out locally, but the server could not revoke the refresh session.",
      );
    } finally {
      setSession(null);
      queryClient.clear();
    }

  }

  function handleProfileUpdated(role: string) {
    setSession((currentSession) =>
      currentSession ? { ...currentSession, role } : currentSession,
    );
  }

  if (isRestoring) return <main role="status">Restoring your MyImpact session…</main>;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLogin={handleLogin} notice={authNotice} />
          )
        }
      />
      <Route
        path="*"
        element={
          session ? (
            session.isPlatformAdmin ? (
              <AdminRoutes session={session} onLogout={handleLogout} />
            ) : (
              <AppShell session={session} onLogout={handleLogout}>
                <ProductRoutes onProfileUpdated={handleProfileUpdated} />
              </AppShell>
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function ProductRoutes({
  onProfileUpdated,
}: {
  onProfileUpdated: (role: string) => void;
}) {
  return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/new" element={<GoalFormPage />} />
        <Route path="/goals/import" element={<GoalImportPage />} />
        <Route path="/goals/:goalId/edit" element={<GoalFormPage />} />
        <Route path="/goals/:goalId" element={<GoalDetailPage />} />
        <Route path="/career" element={<CareerJourneyPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/milestones" element={<MilestonesPage />} />
        <Route path="/archives" element={<ArchivesPage />} />
        <Route path="/pending-requests" element={<PendingRequestsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage onProfileUpdated={onProfileUpdated} />} />
        <Route path="/admin/users" element={<Navigate to="/dashboard" replace />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/impact/:assessmentId" element={<ImpactDetailPage />} />
        <Route path="/reports" element={<PlaceholderPage title="1:1 & Reports" />} />
        <Route path="/chat" element={<PlaceholderPage title="AI Assistant" />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Routes>
  );
}
