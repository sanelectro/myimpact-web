import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import GoalsPage from "./pages/Goals/GoalsPage";
import GoalDetailPage from "./pages/Goals/GoalDetailPage";
import KnowledgePage from "./pages/Knowledge/KnowledgePage";
import EvidencePage from "./pages/Evidence/EvidencePage";
import ImpactPage from "./pages/Impact/ImpactPage";
import ImpactDetailPage from "./pages/Impact/ImpactDetailPage";
import CareerJourneyPage from "./pages/CareerJourney/CareerJourneyPage";
import PlaceholderPage from "./pages/PlaceholderPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/:goalId" element={<GoalDetailPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/impact" element={<ImpactPage />} />
        <Route path="/impact/:assessmentId" element={<ImpactDetailPage />} />
        <Route path="/career" element={<CareerJourneyPage />} />
        <Route path="/reports" element={<PlaceholderPage title="1:1 & Reports" />} />
        <Route path="/chat" element={<PlaceholderPage title="AI Assistant" />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Routes>
    </AppShell>
  );
}
