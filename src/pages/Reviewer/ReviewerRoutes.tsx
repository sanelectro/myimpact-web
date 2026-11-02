import { Navigate, Route, Routes } from "react-router-dom";
import type { AuthSession } from "../../auth/auth";
import ReviewerShell from "../../layouts/ReviewerShell";
import HumanReviewPage from "../HumanReview/HumanReviewPage";

interface ReviewerRoutesProps {
  session: AuthSession;
  onLogout: () => void;
}

export default function ReviewerRoutes({ session, onLogout }: ReviewerRoutesProps) {
  return (
    <ReviewerShell session={session} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/evaluate" replace />} />
        <Route path="/evaluate" element={<HumanReviewPage />} />
        <Route path="/human-review" element={<Navigate to="/evaluate" replace />} />
        <Route path="*" element={<Navigate to="/evaluate" replace />} />
      </Routes>
    </ReviewerShell>
  );
}
