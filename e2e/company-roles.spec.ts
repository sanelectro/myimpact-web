import { expect, test, type Page, type Route } from "@playwright/test";

type RoleWrite = {
  name: string;
  summary: string | null;
  responsibilities: Array<{ statement: string }>;
  goals: Array<{ title: string; description: string | null }>;
  competencies: Array<{
    name: string;
    expected_level: string | null;
    description: string | null;
  }>;
};

type RoleRecord = RoleWrite & {
  id: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  responsibilities: Array<{ id: string; statement: string; position: number }>;
  goals: Array<{
    id: string;
    title: string;
    description: string | null;
    position: number;
  }>;
  competencies: Array<{
    id: string;
    name: string;
    expected_level: string | null;
    description: string | null;
    position: number;
  }>;
};

type HistoryRecord = {
  id: string;
  role_id: string;
  role_name: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  before_snapshot: RoleRecord | null;
  after_snapshot: RoleRecord | null;
  created_at: string;
};

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function roleRecord(id: string, payload: RoleWrite): RoleRecord {
  const now = "2026-10-25T15:00:00Z";
  return {
    id,
    name: payload.name,
    summary: payload.summary,
    responsibilities: payload.responsibilities.map((item, position) => ({
      ...item,
      id: `${id}-responsibility-${position}`,
      position,
    })),
    goals: payload.goals.map((item, position) => ({
      ...item,
      id: `${id}-goal-${position}`,
      position,
    })),
    competencies: payload.competencies.map((item, position) => ({
      ...item,
      id: `${id}-competency-${position}`,
      position,
    })),
    created_by_user_id: "role-manager",
    created_at: now,
    updated_at: now,
  };
}

async function installRoleCatalogApi(page: Page, role = "Engineering Manager") {
  const roles: RoleRecord[] = [];
  const history: HistoryRecord[] = [];

  await page.route("**/auth/refresh", async (route) =>
    json(route, 200, {
      access_token: "role-catalog-token",
      expires_in: 3600,
      user: {
        id: "role-manager",
        name: "Riley Manager",
        email: "manager@example.test",
        role,
        is_platform_admin: false,
      },
    }),
  );

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/v1/profile" && method === "GET") {
      return json(route, 200, {
        user_id: "role-manager",
        name: "Riley Manager",
        email: "manager@example.test",
        company: "Northstar",
        organization_id: "northstar-id",
        team: null,
        role,
        reporting_manager_id: null,
        reporting_manager: null,
        direct_reports: [],
        direct_report_role_options: [],
      });
    }
    if (path === "/api/v1/role-catalog/roles" && method === "GET") {
      return json(route, 200, roles);
    }
    if (path === "/api/v1/role-catalog/history" && method === "GET") {
      return json(route, 200, history);
    }

    const roleMatch = path.match(/^\/api\/v1\/role-catalog\/roles\/([^/]+)$/);
    if (path === "/api/v1/role-catalog/roles" && method === "POST") {
      const payload = request.postDataJSON() as RoleWrite;
      const created = roleRecord("role-1", payload);
      roles.push(created);
      history.unshift({
        id: "history-1",
        role_id: created.id,
        role_name: created.name,
        action: "CREATED",
        actor_user_id: "role-manager",
        actor_name: "Riley Manager",
        actor_role: role,
        before_snapshot: null,
        after_snapshot: created,
        created_at: created.created_at,
      });
      return json(route, 201, created);
    }
    if (roleMatch && method === "PUT") {
      const payload = request.postDataJSON() as RoleWrite;
      const roleIndex = roles.findIndex((item) => item.id === roleMatch[1]);
      if (roleIndex < 0) return json(route, 404, { detail: "Company role not found." });
      const previous = roles[roleIndex];
      const updated = roleRecord(previous.id, payload);
      roles[roleIndex] = updated;
      history.unshift({
        id: `history-${history.length + 1}`,
        role_id: updated.id,
        role_name: updated.name,
        action: "UPDATED",
        actor_user_id: "role-manager",
        actor_name: "Riley Manager",
        actor_role: role,
        before_snapshot: previous,
        after_snapshot: updated,
        created_at: "2026-10-25T15:01:00Z",
      });
      return json(route, 200, updated);
    }
    if (roleMatch && method === "DELETE") {
      const roleIndex = roles.findIndex((item) => item.id === roleMatch[1]);
      if (roleIndex < 0) return json(route, 404, { detail: "Company role not found." });
      const [deleted] = roles.splice(roleIndex, 1);
      history.unshift({
        id: `history-${history.length + 1}`,
        role_id: deleted.id,
        role_name: deleted.name,
        action: "DELETED",
        actor_user_id: "role-manager",
        actor_name: "Riley Manager",
        actor_role: role,
        before_snapshot: deleted,
        after_snapshot: null,
        created_at: "2026-10-25T15:02:00Z",
      });
      return route.fulfill({ status: 204 });
    }
    return json(route, 404, { detail: `No fixture for ${method} ${path}` });
  });

  return { roles, history };
}

test("company managers can create, update, delete, and review role history", async ({
  page,
}) => {
  const state = await installRoleCatalogApi(page);
  await page.goto("/company-roles");

  await expect(page.getByRole("link", { name: "Company roles" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Company roles" })).toBeVisible();
  await page.getByRole("button", { name: "Add role" }).click();
  await page.getByLabel("Role name").fill("Reliability Engineer");
  await page.getByLabel("Role summary").fill("Leads service resilience.");
  await page.getByLabel("Responsibilities").fill("Guide service reliability\nCoach teams");
  await page.getByRole("button", { name: "Add goal" }).click();
  await page.getByLabel("Goal title 1").fill("Reduce recurring incidents");
  await page.getByLabel("Goal description 1").fill("Improve prevention and follow-up.");
  await page.getByRole("button", { name: "Add competency" }).click();
  await page.getByLabel("Skill or competency 1").fill("Incident management");
  await page.getByLabel("Expected level 1").fill("Advanced");
  await page.getByRole("button", { name: "Create role" }).click();

  await expect(page.getByRole("button", { name: /Reliability Engineer/ })).toBeVisible();
  expect(state.roles[0].responsibilities).toHaveLength(2);
  expect(state.roles[0].goals[0].title).toBe("Reduce recurring incidents");
  expect(state.roles[0].competencies[0].expected_level).toBe("Advanced");
  await expect(page.getByText("created", { exact: true })).toBeVisible();

  await page.getByLabel("Role name").fill("Staff Reliability Engineer");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: /Staff Reliability Engineer/ })).toBeVisible();
  await expect(page.getByText("updated", { exact: true })).toBeVisible();
  expect(state.history[0].before_snapshot?.name).toBe("Reliability Engineer");
  expect(state.history[0].after_snapshot?.name).toBe("Staff Reliability Engineer");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete role" }).click();
  await expect(page.getByText("No roles have been added yet.")).toBeVisible();
  await expect(page.getByText("deleted", { exact: true })).toBeVisible();
  expect(state.history).toHaveLength(3);
  expect(state.history[0].before_snapshot?.name).toBe("Staff Reliability Engineer");
  expect(state.history[0].after_snapshot).toBeNull();
});

test("individual contributors cannot open company role management", async ({
  page,
}) => {
  await installRoleCatalogApi(page, "Lead Software Engineer");
  await page.goto("/company-roles");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Company roles" })).toHaveCount(0);
});
