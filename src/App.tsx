import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import { clearMockSession, getMockSession, type MockSession } from "./auth/mockAuth";
import DashboardPage from "./pages/Dashboard/DashboardPage";
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

export default function App() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<MockSession | null>(getMockSession);

  function handleLogin(nextSession: MockSession) {
    queryClient.clear();
    setSession(nextSession);
  }

  function handleLogout() {
    clearMockSession();
    queryClient.clear();
    setSession(null);
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />}
      />
      <Route
        path="*"
        element={
          session ? (
            <AppShell session={session} onLogout={handleLogout}>
              <ProductRoutes />
            </AppShell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function ProductRoutes() {
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
        <Route path="/impact" element={<PlaceholderPage title="Impact" />} />
        <Route path="/reports" element={<PlaceholderPage title="1:1 & Reports" />} />
        <Route path="/chat" element={<PlaceholderPage title="AI Assistant" />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Routes>
  );
}
