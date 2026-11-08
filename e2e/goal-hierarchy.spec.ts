import { expect, test } from "@playwright/test";
import { installMockApi, makeGoal, signInAndOpen, type MockState } from "./goal-e2e-helpers";

test("connects, reparents and disconnects without changing goal details", async ({ page }) => {
  const state: MockState = {
    goals: [makeGoal("child", "Child goal"), makeGoal("first", "First parent"), makeGoal("second", "Second parent")],
    history: {},
  };
  await installMockApi(page, state);
  let parent: string | null = null;
  let revision = 0;
  const events: Array<Record<string, unknown>> = [];
  await page.route("**/api/v1/goals/child/**", async (route) => {
    const request = route.request();
    const action = new URL(request.url()).pathname.split("/").pop();
    const summary = (id: string, title: string) => ({
      id, title, status: "draft", goal_level: null, parent_goal_id: null, relationship_revision: 0,
    });
    if (action === "hierarchy") {
      return route.fulfill({ json: {
        goal: { ...summary("child", "Child goal"), parent_goal_id: parent, relationship_revision: revision },
        ancestors: parent ? [summary(parent, state.goals.find((goal) => goal.id === parent)!.title)] : [],
        next_ancestor_id: null,
      } });
    }
    if (action === "children") return route.fulfill({ json: [] });
    if (action === "relationship-history") return route.fulfill({ json: events });
    if (action === "parent") {
      const body = request.postDataJSON();
      expect(body.expected_revision).toBe(revision);
      const old = parent;
      parent = request.method() === "DELETE" ? null : body.parent_goal_id;
      revision++;
      events.unshift({
        id: `event-${revision}`, goal_id: "child", old_parent_goal_id: old,
        new_parent_goal_id: parent, actor_user_id: "user-1", reason: body.reason,
        relationship_revision: revision, created_at: "2026-11-08T00:00:00Z",
      });
      return route.fulfill({ json: { id: "child", parent_goal_id: parent, relationship_revision: revision } });
    }
    return route.fallback();
  });
  await signInAndOpen(page, "/goals/child");
  const panel = page.locator(".goal-hierarchy-panel");
  await expect(panel.getByText("No parent goal.")).toBeVisible();
  await panel.getByLabel("Parent goal").selectOption("first");
  await panel.getByRole("button", { name: "Connect parent" }).click();
  await expect(panel.getByRole("link", { name: "First parent" })).toBeVisible();
  await panel.getByLabel("Parent goal").selectOption("second");
  await panel.getByRole("button", { name: "Change parent" }).click();
  await expect(panel.getByRole("link", { name: "Second parent" })).toBeVisible();
  await panel.getByRole("button", { name: "Disconnect parent" }).click();
  await expect(panel.getByText("No parent goal.")).toBeVisible();
  await panel.getByText("Relationship history").click();
  await expect(panel.getByText("Revision 3")).toBeVisible();
  expect(state.goals[0].title).toBe("Child goal");
});
