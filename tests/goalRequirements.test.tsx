// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import GoalRequirementsPanel from "../src/components/Goals/GoalRequirementsPanel";
import GoalMeasuresPanel from "../src/components/Goals/GoalMeasuresPanel";
import { validateDeferrals } from "../src/components/Goals/DeferredRequirementsEditor";
import { getGoalRequirements, getGoalMeasures, getGoalAssessment } from "../src/api/myImpact";
import type { GoalAssessment, GoalDeferredRequirement } from "../src/types/api";

vi.mock("../src/api/myImpact", () => ({ getGoalRequirements: vi.fn(), getGoalMeasures: vi.fn(), getGoalAssessment: vi.fn() }));

const deferral: GoalDeferredRequirement = {
  requirement: "baseline", reason: "Awaiting measurement", due_date: null,
  resolution_stage: "Planning", state: "OPEN", resolution_reason: null, related_child_goal_id: null,
};

it("validates open and resolved deferrals without inventing requirements", () => {
  expect(validateDeferrals([deferral], "", "")).toBeNull();
  expect(validateDeferrals([{ ...deferral, resolution_stage: null }], "", "")).toContain("due date or resolution stage");
  expect(validateDeferrals([{ ...deferral, state: "RESOLVED", resolution_reason: null }], "", "")).toContain("resolution reason");
  expect(validateDeferrals([{ ...deferral, state: "RESOLVED", resolution_reason: "Collected" }], "", "")).toContain("baseline value");
  expect(validateDeferrals([{ ...deferral, state: "RESOLVED", resolution_reason: "Collected" }], "12", "")).toBeNull();
  expect(validateDeferrals([{ ...deferral, state: "NOT_APPLICABLE", resolution_reason: "Not needed" }], "", "")).toBeNull();
});

async function waitFor(assertion: () => void) {
  let error: unknown;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { assertion(); return; } catch (caught) {
      error = caught;
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    }
  }
  throw error;
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.resetAllMocks());

it("distinguishes overdue requirements and completed children from undetermined outcome and impact", async () => {
  vi.mocked(getGoalRequirements).mockResolvedValue({
    goal_version: 2, evaluated_on: "2026-11-08",
    requirements: [{ requirement: "baseline", classification: "DEFERRED_ALLOWED", state: "OVERDUE" }],
    deferred_requirements: [{ ...deferral, due_date: "2026-11-01" }],
  });
  vi.mocked(getGoalMeasures).mockResolvedValue({
    goal_id: "parent", child_execution: { total: 2, by_status: { completed: 2 } },
    own_criterion_assessment: null,
    outcome_achievement: null, demonstrated_impact: null,
  });
  vi.mocked(getGoalAssessment).mockResolvedValue({
    assessed_criteria_count: 0, criteria_count: 0, evidence_coverage_percentage: null,
  } as GoalAssessment);
  const container = document.createElement("div");
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter>
    <GoalRequirementsPanel goalId="parent" /><GoalMeasuresPanel goalId="parent" />
  </MemoryRouter></QueryClientProvider>));
  await waitFor(() => expect(container.textContent).toContain("Overdue"));
  await waitFor(() => expect(container.textContent).toContain("completed: 2"));
  expect(container.textContent).toContain("2026-11-01");
  expect(container.textContent).toContain("Evidence coverage: Not assessed");
  expect(container.textContent).toContain("Not determined. Existing criteria are not classified as outcomes.");
  expect(container.textContent).toContain("Not determined by child completion.");
  await act(async () => root.unmount());
  client.clear();
});
