// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import EvidenceEligibilityGate from "../src/components/Goals/EvidenceEligibilityGate";
import GoalValidationPanel from "../src/components/Goals/GoalValidationPanel";
import type { GoalEvidenceEligibility, GoalValidationRun } from "../src/types/api";

const readyEligibility: GoalEvidenceEligibility = {
  eligible: true,
  reason: "Active goal version 2 has a persisted READY validation and approval; evidence can be submitted.",
  goal_status: "active",
  latest_version: 2,
  latest_version_origin: "USER",
  legacy_compatibility: false,
  ready_validation_exists: true,
  approved_for_latest_version: true,
};

const validationRun: GoalValidationRun = {
  id: "run-1",
  goal_id: "goal-1",
  goal_version_id: "version-2",
  goal_version: 2,
  status: "NEEDS_REFINEMENT",
  findings: [{
    dimension: "measurement",
    finding_code: "incomplete_measurement_context",
    severity: "WARNING",
    validation_status: "NEEDS_REFINEMENT",
    explanation: "The target does not identify how progress will be measured.",
    missing_info: ["measurement"],
    clarification_questions: ["Which measure will you track?"],
    suggested_improvement: "Add a measurable signal.",
    human_intervention_required: false,
  }],
  rule_set_version: "rules-v1",
  prompt_version: "prompt-v1",
  model_provider: "test",
  model_version: "test-v1",
  actor_user_id: "user-1",
  created_at: "2026-11-08T08:00:00Z",
};

describe("goal validation panel", () => {
  it("renders latest validation version, severity, explanation, questions, suggestions, and history", () => {
    const markup = renderToStaticMarkup(
      <GoalValidationPanel
        history={[validationRun]}
        isLoading={false}
        isValidating={false}
        onValidate={() => undefined}
      />,
    );

    expect(markup).toContain("Needs Refinement");
    expect(markup).toContain("Version 2");
    expect(markup).toContain("Warning");
    expect(markup).toContain("The target does not identify how progress will be measured.");
    expect(markup).toContain("Which measure will you track?");
    expect(markup).toContain("Add a measurable signal.");
    expect(markup).toContain("Validation history (1)");
  });

  it("identifies validation findings that no longer match the edited goal version", () => {
    const markup = renderToStaticMarkup(
      <GoalValidationPanel
        history={[validationRun]}
        isLoading={false}
        isValidating={false}
        currentGoalVersion={3}
        onValidate={() => undefined}
      />,
    );

    expect(markup).toContain("This result is for an earlier goal version.");
  });

  it("lets an employee trigger revalidation", async () => {
    const onValidate = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root.render(
        <GoalValidationPanel
          history={[validationRun]}
          isLoading={false}
          isValidating={false}
          onValidate={onValidate}
        />,
      );
    });
    await act(async () => {
      container.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onValidate).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });
});

describe("evidence eligibility gate", () => {
  it("shows evidence submission for an active READY and approved latest version", () => {
    const markup = renderToStaticMarkup(
      <EvidenceEligibilityGate eligibility={readyEligibility} isLoading={false} isError={false}>
        <button>Add evidence</button>
      </EvidenceEligibilityGate>,
    );

    expect(markup).toContain("Add evidence");
  });

  it.each([
    ["draft", "draft", true, true, "Only active goals"],
    ["pending activation", "approved", true, true, "Only active goals"],
    ["non-ready", "active", false, true, "needs a READY validation"],
    ["unapproved latest version", "active", true, false, "must be approved"],
  ] as const)("hides evidence submission for %s goals", (_case, status, ready, approved, reason) => {
    const eligibility: GoalEvidenceEligibility = {
      ...readyEligibility,
      eligible: false,
      goal_status: status,
      ready_validation_exists: ready,
      approved_for_latest_version: approved,
      reason,
    };
    const markup = renderToStaticMarkup(
      <EvidenceEligibilityGate eligibility={eligibility} isLoading={false} isError={false}>
        <button>Add evidence</button>
      </EvidenceEligibilityGate>,
    );

    expect(markup).not.toContain("Add evidence");
    expect(markup).toContain("Review validation findings");
  });

  it("honors backend legacy compatibility even when current lifecycle checks would not pass", () => {
    const eligibility: GoalEvidenceEligibility = {
      ...readyEligibility,
      eligible: true,
      goal_status: "draft",
      latest_version_origin: "LEGACY",
      legacy_compatibility: true,
      ready_validation_exists: false,
      approved_for_latest_version: false,
      reason: "Evidence submission is allowed by legacy compatibility.",
    };
    const markup = renderToStaticMarkup(
      <EvidenceEligibilityGate eligibility={eligibility} isLoading={false} isError={false}>
        <button>Add evidence</button>
      </EvidenceEligibilityGate>,
    );

    expect(markup).toContain("Legacy compatibility applies");
    expect(markup).toContain("Add evidence");
  });
});
