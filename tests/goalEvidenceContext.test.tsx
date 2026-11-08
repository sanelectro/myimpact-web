// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import GoalEvidenceContextPanel from "../src/components/Goals/GoalEvidenceContextPanel";
import { getGoalEvidence, getGoalEvidenceContext, getGoals, linkGoalEvidence } from "../src/api/myImpact";
import type { Goal, GoalEvidence, GoalEvidenceEligibility } from "../src/types/api";

vi.mock("../src/api/myImpact", () => ({
  getGoalEvidence: vi.fn(), getGoalEvidenceContext: vi.fn(), getGoals: vi.fn(), linkGoalEvidence: vi.fn(),
}));

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

const eligibility: GoalEvidenceEligibility = {
  eligible: true, reason: "Eligible", goal_status: "active", latest_version: 1,
  latest_version_origin: "USER", legacy_compatibility: false, ready_validation_exists: true,
  approved_for_latest_version: true,
};

async function setup(eligible = true) {
  vi.mocked(getGoals).mockResolvedValue([{ id: "child", title: "Child goal" }] as Goal[]);
  vi.mocked(getGoalEvidence).mockResolvedValue([{ evidence_id: "evidence-1", title: "Evidence one" }] as GoalEvidence[]);
  vi.mocked(getGoalEvidenceContext).mockResolvedValue({
    items: [{ evidence_id: "evidence-1", title: "Evidence one", description: null, source_type: "personal",
      source_url: null, captured_at: "2026-11-08T00:00:00Z", source_updated_at: null,
      origins: [{ origin: "INHERITED", source_goal_id: "child", goal_path: ["parent", "child"],
        mapping_id: "mapping-1", mapping_kind: "CONTRIBUTION", contribution_description: "Supports outcome",
        relevance: "high", confidence: 1, approval_status: "pending" }] }],
    has_more: false, next_offset: null, hierarchy_truncated: true,
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(
    <QueryClientProvider client={client}><MemoryRouter><GoalEvidenceContextPanel goalId="parent"
      eligibility={{ ...eligibility, eligible }} eligibilityLoading={false} eligibilityError={false} /></MemoryRouter></QueryClientProvider>,
  ));
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Show evidence context")!;
  await act(async () => button.click());
  await waitFor(() => expect(container.textContent).toContain("Supports outcome"));
  return { container, root, client };
}

async function cleanup(result: Awaited<ReturnType<typeof setup>>) {
  await act(async () => result.root.unmount());
  result.client.clear();
  result.container.remove();
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.resetAllMocks());

it("shows inherited provenance, warning and links existing contribution evidence", async () => {
  vi.mocked(linkGoalEvidence).mockResolvedValue({ mapping_id: "new", approval_status: "pending" });
  const result = await setup();
  expect(result.container.textContent).toContain("Inherited · contribution");
  expect(result.container.textContent).toContain("parent → child");
  expect(result.container.textContent).toContain("may be incomplete");
  const selects = result.container.querySelectorAll("select");
  await act(async () => { selects[0].value = "child"; selects[0].dispatchEvent(new Event("change", { bubbles: true })); });
  await waitFor(() => expect(result.container.textContent).toContain("Evidence one"));
  await waitFor(() => expect(result.container.querySelectorAll("select")).toHaveLength(4));
  const updated = result.container.querySelectorAll("select");
  await act(async () => {
    updated[1].value = "evidence-1";
    updated[1].dispatchEvent(new Event("change", { bubbles: true }));
    updated[2].value = "CONTRIBUTION";
    updated[2].dispatchEvent(new Event("change", { bubbles: true }));
  });
  const button = [...result.container.querySelectorAll("button")].find((item) => item.textContent === "Link evidence")!;
  await act(async () => button.click());
  await waitFor(() => expect(linkGoalEvidence).toHaveBeenCalledWith("parent", {
    evidence_id: "evidence-1", mapping_kind: "CONTRIBUTION", contribution_description: null, relevance: "medium",
  }));
  await waitFor(() => expect(result.container.textContent).toContain("Approval is pending"));
  await cleanup(result);
});

it("does not offer linking when the server says the goal is ineligible", async () => {
  const result = await setup(false);
  expect(result.container.textContent).not.toContain("Link evidence");
  expect(getGoals).not.toHaveBeenCalled();
  await cleanup(result);
});
