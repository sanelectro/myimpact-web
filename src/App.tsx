import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/goals" element={<PlaceholderPage title="Goals" />} />
        <Route path="/knowledge" element={<PlaceholderPage title="Knowledge" />} />
        <Route path="/impact" element={<PlaceholderPage title="Impact" />} />
        <Route path="/reports" element={<PlaceholderPage title="1:1 & Reports" />} />
        <Route path="/chat" element={<PlaceholderPage title="AI Assistant" />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Routes>
    </AppShell>
  );
}
