// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import GoalFormPage from "../src/pages/Goals/GoalFormPage";
import { createGoal, getGoal, getProfile, updateGoal } from "../src/api/myImpact";

vi.mock("../src/api/myImpact", () => ({
  createGoal: vi.fn(),
  getGoal: vi.fn(),
  getProfile: vi.fn(),
  updateGoal: vi.fn(),
}));

const goal = {
  id: "goal-1",
  title: "Existing goal",
  description: null,
  scope: "personal",
  goal_level: "QUARTERLY",
  start_date: null,
  end_date: null,
  source: null,
  structured_fields: null,
};

async function waitFor(assertion: () => void) {
  let error: unknown;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      assertion();
      return;
    } catch (caught) {
      error = caught;
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    }
  }
  throw error;
}

async function renderForm(path: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/goals/new" element={<GoalFormPage />} />
            <Route path="/goals/:goalId/edit" element={<GoalFormPage />} />
            <Route path="/goals/:goalId" element={<p>Goal saved</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return { container, root, client };
}

describe("goal level form", () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  afterEach(() => vi.resetAllMocks());

  it("creates an unspecified level as null", async () => {
    vi.mocked(getProfile).mockResolvedValue({ organization_id: null } as Awaited<ReturnType<typeof getProfile>>);
    vi.mocked(createGoal).mockResolvedValue({ id: "goal-1" } as Awaited<ReturnType<typeof createGoal>>);
    const { container, root, client } = await renderForm("/goals/new");
    const input = container.querySelector<HTMLInputElement>("input[placeholder^='e.g. Improve']")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "New goal");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await waitFor(() => expect(createGoal).toHaveBeenCalledWith(expect.objectContaining({ goal_level: null })));
    await act(async () => root.unmount());
    client.clear();
    container.remove();
  });

  it("loads an existing level and saves a changed level", async () => {
    vi.mocked(getProfile).mockResolvedValue({ organization_id: null } as Awaited<ReturnType<typeof getProfile>>);
    vi.mocked(getGoal).mockResolvedValue(goal as Awaited<ReturnType<typeof getGoal>>);
    vi.mocked(updateGoal).mockResolvedValue({ id: "goal-1" } as Awaited<ReturnType<typeof updateGoal>>);
    const { container, root, client } = await renderForm("/goals/goal-1/edit");
    await waitFor(() => expect(container.querySelector("select")?.value).toBe("QUARTERLY"));
    const select = container.querySelector<HTMLSelectElement>("select")!;
    await act(async () => {
      select.value = "SPRINT";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await waitFor(() => expect(updateGoal).toHaveBeenCalledWith("goal-1", expect.objectContaining({ goal_level: "SPRINT" })));
    await act(async () => root.unmount());
    client.clear();
    container.remove();
  });

  it("uses each new success criterion as its completion condition", async () => {
    vi.mocked(getProfile).mockResolvedValue({ organization_id: null } as Awaited<ReturnType<typeof getProfile>>);
    vi.mocked(createGoal).mockResolvedValue({ id: "goal-1" } as Awaited<ReturnType<typeof createGoal>>);
    const { container, root, client } = await renderForm("/goals/new");
    const title = container.querySelector<HTMLInputElement>("input[placeholder^='e.g. Improve']")!;
    const criteria = container.querySelector<HTMLTextAreaElement>("textarea[placeholder^='How will you know']")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(title, "New goal");
      title.dispatchEvent(new Event("input", { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(criteria, "Release is live\nReview is complete");
      criteria.dispatchEvent(new Event("input", { bubbles: true }));
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await waitFor(() => expect(createGoal).toHaveBeenCalledOnce());
    expect(vi.mocked(createGoal).mock.calls[0][0].structured_fields?.success_criteria).toEqual([
      expect.objectContaining({ criterion_type: "BINARY", description: "Release is live", completion_conditions: "Release is live" }),
      expect.objectContaining({ criterion_type: "BINARY", description: "Review is complete", completion_conditions: "Review is complete" }),
    ]);
    await act(async () => root.unmount());
    client.clear();
    container.remove();
  });

  it("preserves the full definition of an unchanged criterion", async () => {
    const criterion = {
      criterion_type: "BINARY" as const, description: "Release is live",
      completion_conditions: "Release is available to every customer", milestones: [],
      target_value: null, unit: null, evidence_suggestions: ["Release log"],
      assumptions_and_clarifications: [],
    };
    vi.mocked(getProfile).mockResolvedValue({ organization_id: null } as Awaited<ReturnType<typeof getProfile>>);
    vi.mocked(getGoal).mockResolvedValue({
      ...goal, structured_fields: { success_criteria: [criterion] },
    } as Awaited<ReturnType<typeof getGoal>>);
    vi.mocked(updateGoal).mockResolvedValue({ id: "goal-1" } as Awaited<ReturnType<typeof updateGoal>>);
    const { container, root, client } = await renderForm("/goals/goal-1/edit");
    await waitFor(() => expect(container.querySelector<HTMLTextAreaElement>("textarea[placeholder^='How will you know']")?.value).toBe("Release is live"));
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledOnce());
    expect(vi.mocked(updateGoal).mock.calls[0][1].structured_fields?.success_criteria).toEqual([criterion]);
    await act(async () => root.unmount());
    client.clear();
    container.remove();
  });

  it("omits unchanged deferrals so concurrent changes are preserved by the server", async () => {
    vi.mocked(getProfile).mockResolvedValue({ organization_id: null } as Awaited<ReturnType<typeof getProfile>>);
    vi.mocked(getGoal).mockResolvedValue({
      ...goal,
      structured_fields: {
        deferred_requirements: [{
          requirement: "baseline", reason: "Pending data", due_date: "2026-12-01",
          resolution_stage: null, state: "OPEN", resolution_reason: null, related_child_goal_id: null,
        }],
      },
    } as Awaited<ReturnType<typeof getGoal>>);
    vi.mocked(updateGoal).mockResolvedValue({ id: "goal-1" } as Awaited<ReturnType<typeof updateGoal>>);
    const { container, root, client } = await renderForm("/goals/goal-1/edit");
    await waitFor(() => expect(container.textContent).toContain("Baseline deferral reason"));
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledOnce());
    const payload = vi.mocked(updateGoal).mock.calls[0][1];
    expect(payload.structured_fields).not.toHaveProperty("deferred_requirements");
    await act(async () => root.unmount());
    client.clear();
    container.remove();
  });

  it("saves an explicitly edited deferral with a resolution stage", async () => {
    vi.mocked(getProfile).mockResolvedValue({ organization_id: null } as Awaited<ReturnType<typeof getProfile>>);
    vi.mocked(getGoal).mockResolvedValue(goal as Awaited<ReturnType<typeof getGoal>>);
    vi.mocked(updateGoal).mockResolvedValue({ id: "goal-1" } as Awaited<ReturnType<typeof updateGoal>>);
    const { container, root, client } = await renderForm("/goals/goal-1/edit");
    await waitFor(() => expect(container.querySelectorAll("fieldset")).toHaveLength(2));
    const fieldset = container.querySelectorAll("fieldset")[0];
    const select = fieldset.querySelector("select")!;
    await act(async () => { select.value = "OPEN"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    const inputs = fieldset.querySelectorAll("input");
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      set.call(inputs[0], "  Awaiting data  ");
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
      set.call(inputs[2], "  Planning  ");
      inputs[2].dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledOnce());
    expect(vi.mocked(updateGoal).mock.calls[0][1].structured_fields?.deferred_requirements).toEqual([{
      requirement: "baseline", reason: "Awaiting data", due_date: null, resolution_stage: "Planning",
      state: "OPEN", resolution_reason: null, related_child_goal_id: null,
    }]);
    expect(vi.mocked(updateGoal).mock.calls[0][1].expected_deferred_requirements).toEqual([]);
    await act(async () => root.unmount());
    client.clear();
    container.remove();
  });
});
