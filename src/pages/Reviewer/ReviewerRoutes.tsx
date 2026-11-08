import { Navigate, Route, Routes } from "react-router-dom";
import type { AuthSession } from "../../auth/auth";
import ReviewerShell from "../../layouts/ReviewerShell";
import HumanReviewPage from "../HumanReview/HumanReviewPage";
import ReviewerDashboardPage from "./ReviewerDashboardPage";
import ReviewerReviewDetailsPage from "./ReviewerReviewDetailsPage";
import ReviewerFinalReviewPage from "./ReviewerFinalReviewPage";
import { ReviewBatchProvider } from "./ReviewBatchSelection";

interface ReviewerRoutesProps {
  session: AuthSession;
  onLogout: () => void;
}

export default function ReviewerRoutes({ session, onLogout }: ReviewerRoutesProps) {
  return (
    <ReviewerShell session={session} onLogout={onLogout}>
      <ReviewBatchProvider key={session.userId}>
      <Routes>
        <Route path="/" element={<Navigate to="/evaluate" replace />} />
        <Route path="/evaluate" element={<ReviewerDashboardPage />} />
        <Route path="/evaluate/final-review" element={<ReviewerFinalReviewPage />} />
        <Route path="/evaluate/reviews/:category" element={<ReviewerReviewDetailsPage />} />
        <Route path="/evaluate/categories" element={<Navigate to="/evaluate" replace />} />
        <Route path="/evaluate/categories/:category" element={<Navigate to="/evaluate" replace />} />
        <Route path="/evaluate/cases/:caseId" element={<HumanReviewPage />} />
        <Route path="/human-review" element={<Navigate to="/evaluate" replace />} />
        <Route path="*" element={<Navigate to="/evaluate" replace />} />
      </Routes>
      </ReviewBatchProvider>
    </ReviewerShell>
  );
}
