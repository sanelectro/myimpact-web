import type { ReactNode } from "react";
import type { GoalEvidenceEligibility } from "../../types/api";

interface EvidenceEligibilityGateProps {
  eligibility?: GoalEvidenceEligibility;
  isLoading: boolean;
  isError: boolean;
  children: ReactNode;
}

export default function EvidenceEligibilityGate({
  eligibility,
  isLoading,
  isError,
  children,
}: EvidenceEligibilityGateProps) {
  if (isLoading) {
    return <p className="goal-evidence-inactive-notice" role="status">Checking evidence eligibility…</p>;
  }

  if (isError || !eligibility) {
    return (
      <p className="goal-evidence-inactive-notice" role="status">
        Evidence eligibility could not be confirmed. Evidence submission is unavailable until the server can verify this goal.
      </p>
    );
  }

  if (!eligibility.eligible) {
    return (
      <p className="goal-evidence-inactive-notice" role="status">
        {eligibility.reason}{" "}
        <a href="#goal-validation-findings">Review validation findings</a>
      </p>
    );
  }

  return (
    <>
      {eligibility.legacy_compatibility && (
        <p className="goal-evidence-inactive-notice" role="status">
          Legacy compatibility applies. {eligibility.reason}
        </p>
      )}
      {children}
    </>
  );
}
