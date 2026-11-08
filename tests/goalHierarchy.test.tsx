// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import GoalHierarchyPanel from "../src/components/Goals/GoalHierarchyPanel";
import { changeGoalParent, getGoalChildren, getGoalHierarchy, getGoalRelationshipHistory, getGoals } from "../src/api/myImpact";
import type { Goal, GoalHierarchy, GoalHierarchySummary } from "../src/types/api";

vi.mock("../src/api/myImpact", () => ({
  changeGoalParent: vi.fn(),
  getGoalChildren: vi.fn(),
  getGoalHierarchy: vi.fn(),
  getGoalRelationshipHistory: vi.fn(),
  getGoals: vi.fn(),
}));

const summary: GoalHierarchySummary = {
  id: "child", title: "Child", goal_level: null, status: "active",
  parent_goal_id: "parent", relationship_revision: 3,
};
const hierarchy: GoalHierarchy = {
  goal: summary,
  ancestors: [{ ...summary, id: "parent", title: "Parent", parent_goal_id: null }],
  next_ancestor_id: null,
};

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

async function setup() {
  vi.mocked(getGoalHierarchy).mockResolvedValue(hierarchy);
  vi.mocked(getGoalChildren).mockResolvedValue([{ ...summary, id: "grandchild", title: "Grandchild" }]);
  vi.mocked(getGoalRelationshipHistory).mockResolvedValue([{
    id: "event", goal_id: "child", old_parent_goal_id: null, new_parent_goal_id: "parent",
    actor_user_id: "owner", reason: "Alignment", relationship_revision: 3, created_at: "2026-11-08T00:00:00Z",
  }]);
  vi.mocked(getGoals).mockResolvedValue([
    { id: "child", title: "Child" }, { id: "parent", title: "Parent" }, { id: "new", title: "New parent" },
  ] as Goal[]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter><GoalHierarchyPanel goalId="child" /></MemoryRouter></QueryClientProvider>));
  await waitFor(() => expect(container.textContent).toContain("Grandchild"));
  return { container, root, client };
}

async function cleanup(result: Awaited<ReturnType<typeof setup>>) {
  await act(async () => result.root.unmount());
  result.client.clear();
  result.container.remove();
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.resetAllMocks());

it("shows hierarchy and changes the parent using the current revision", async () => {
  vi.mocked(changeGoalParent).mockResolvedValue({ id: "child", parent_goal_id: "new", relationship_revision: 4 });
  const result = await setup();
  expect(result.container.textContent).toContain("Parent");
  expect(result.container.textContent).toContain("Alignment");
  const select = result.container.querySelector("select")!;
  await act(async () => { select.value = "new"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  const button = [...result.container.querySelectorAll("button")].find((item) => item.textContent === "Change parent")!;
  await act(async () => button.click());
  await waitFor(() => expect(changeGoalParent).toHaveBeenCalledWith("child", "new", 3, null));
  await waitFor(() => expect(getGoalHierarchy).toHaveBeenCalledTimes(2));
  await cleanup(result);
});

it("reports conflicts, reloads the hierarchy and permits disconnect", async () => {
  vi.mocked(changeGoalParent).mockRejectedValueOnce(new Error("Relationship revision is stale; reload the goal"));
  const result = await setup();
  const button = [...result.container.querySelectorAll("button")].find((item) => item.textContent === "Disconnect parent")!;
  await act(async () => button.click());
  await waitFor(() => expect(result.container.textContent).toContain("Relationship revision is stale"));
  expect(changeGoalParent).toHaveBeenCalledWith("child", null, 3, null);
  await waitFor(() => expect(getGoalHierarchy).toHaveBeenCalledTimes(2));
  await cleanup(result);
});
