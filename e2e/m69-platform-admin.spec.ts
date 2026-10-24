import { expect, test, type Page, type Route } from "@playwright/test";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  is_active: boolean;
  invitation_pending: boolean;
};

type AdminCompany = {
  id: string;
  name: string;
  user_count: number;
  created_at: string;
};

const initialUsers: AdminUser[] = [
  {
    id: "user-active",
    name: "Active Employee",
    email: "active@example.com",
    company: "Northstar",
    role: "Senior Software Engineer",
    is_active: true,
    invitation_pending: false,
  },
  {
    id: "user-disabled",
    name: "Disabled Employee",
    email: "disabled@example.com",
    company: "Northstar",
    role: "Software Engineer",
    is_active: false,
    invitation_pending: false,
  },
  {
    id: "user-pending",
    name: "Invited Employee",
    email: "invited@example.com",
    company: "Pioneer",
    role: "Engineering Manager",
    is_active: false,
    invitation_pending: true,
  },
];

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installAdminApi(page: Page, isPlatformAdmin = true) {
  const users = initialUsers.map((user) => ({ ...user }));
  const companies: AdminCompany[] = [
    {
      id: "company-northstar",
      name: "Northstar",
      user_count: 2,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "company-pioneer",
      name: "Pioneer",
      user_count: 1,
      created_at: "2026-02-01T00:00:00Z",
    },
  ];
  const capturedInvitations: Array<Record<string, unknown>> = [];
  const capturedStatusUpdates: Array<{ userId: string; is_active: boolean }> = [];

  await page.route("**/auth/refresh", async (route) => {
    await json(route, 200, {
      access_token: isPlatformAdmin ? "m69-admin-token" : "m69-member-token",
      expires_in: 3600,
      user: {
        id: isPlatformAdmin ? "platform-admin" : "customer-user",
        name: isPlatformAdmin ? "Platform Operator" : "Customer User",
        email: isPlatformAdmin ? "operator@example.com" : "customer@example.com",
        role: isPlatformAdmin ? "Platform Administrator" : "Software Engineer",
        is_platform_admin: isPlatformAdmin,
      },
    });
  });

  await page.route("**/auth/logout", async (route) => json(route, 200, {}));

  await page.route("**/admin/users/invitations", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    capturedInvitations.push(body);
    const invitationNumber = capturedInvitations.length;
    if (
      !users.some((user) => user.email === body.email) &&
      typeof body.name === "string" &&
      typeof body.email === "string" &&
      typeof body.company === "string"
    ) {
      users.push({
        id: `user-invited-${invitationNumber}`,
        name: body.name,
        email: body.email,
        company: body.company,
        role: typeof body.role === "string" ? body.role : null,
        is_active: false,
        invitation_pending: true,
      });
    }
    return json(route, 201, {
      id: `invitation-${invitationNumber}`,
      ...body,
      invite_token: `invite-token-${invitationNumber}`,
      expires_at: "2026-10-27T00:00:00Z",
    });
  });

  await page.route("**/admin/users/*/status", async (route) => {
    const request = route.request();
    const userId = new URL(request.url()).pathname.split("/").at(-2) ?? "";
    const body = request.postDataJSON() as { is_active: boolean };
    capturedStatusUpdates.push({ userId, is_active: body.is_active });
    const user = users.find((item) => item.id === userId);
    if (!user) return json(route, 404, { detail: "Customer user not found." });
    user.is_active = body.is_active;
    if (body.is_active) user.invitation_pending = false;
    return json(route, 200, { id: userId, is_active: user.is_active });
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === "/api/v1/admin/users" && request.method() === "GET") {
      return json(route, 200, users);
    }
    if (path === "/api/v1/admin/companies" && request.method() === "GET") {
      return json(route, 200, companies);
    }
    if (path === "/api/v1/goals" && request.method() === "GET") {
      return json(route, 200, url.searchParams.get("user_id") === "user-active"
        ? [{
            id: "goal-customer",
            title: "Improve platform reliability",
            description: "Reduce customer-facing incidents.",
            scope: "team",
            status: "active",
          }]
        : []);
    }
    if (path === "/api/v1/goals/goal-customer/evidence") {
      return json(route, 200, [{
        evidence_id: "evidence-customer",
        title: "Reduced production incidents",
        description: "Incident rate dropped after the rollout.",
      }]);
    }
    if (path === "/api/v1/goals/goal-customer/impact") {
      return json(route, 200, [{
        id: "impact-customer",
        impact_type: "reliability",
        impact_summary: "Customer-facing incidents fell by 25%.",
      }]);
    }
    return json(route, 404, { detail: `No fixture for ${request.method()} ${path}` });
  });

  return { users, companies, capturedInvitations, capturedStatusUpdates };
}

test("platform admin can review company data, invite users, and manage account access", async ({
  page,
}) => {
  const state = await installAdminApi(page);
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();
  await expect(page.getByText("CUSTOMER ACCOUNTS").locator("..").getByText("3")).toBeVisible();
  await expect(page.getByText("Northstar", { exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /Pioneer\s+1\s+0\s+1\s+0/ })).toBeVisible();

  await page.getByRole("link", { name: "Manage customer accounts" }).click();
  await expect(page.getByRole("heading", { name: "Customer users" })).toBeVisible();
  await page.getByLabel("Full name").fill("New Northstar Engineer");
  await page.getByLabel("Work email").fill("new-engineer@example.com");
  await page.getByLabel("Company").fill("Northstar");
  await page.getByLabel("Job title").fill("Software Engineer");
  await page.getByRole("button", { name: "Create invitation" }).click();
  await expect(page.getByRole("status")).toContainText("invite-token-1");
  expect(state.capturedInvitations[0]).toEqual({
    name: "New Northstar Engineer",
    email: "new-engineer@example.com",
    company: "Northstar",
    role: "Software Engineer",
  });
  await expect(page.getByRole("row", { name: /New Northstar Engineer/ })).toContainText("Invitation pending");

  const activeUserRow = page.getByRole("row", { name: /Active Employee/ });
  await activeUserRow.getByRole("button", { name: "Review data" }).click();
  await expect(page.getByRole("heading", { name: "Active Employee" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Improve platform reliability" })).toBeVisible();
  await expect(page.getByText("Reduced production incidents")).toBeVisible();
  await expect(page.getByText("Customer-facing incidents fell by 25%.")).toBeVisible();
  await page.getByRole("button", { name: "Close review" }).click();

  await activeUserRow.getByRole("button", { name: "Disable" }).click();
  await expect(activeUserRow.getByRole("button", { name: "Reactivate" })).toBeVisible();
  await activeUserRow.getByRole("button", { name: "Reactivate" }).click();
  await expect(activeUserRow.getByRole("button", { name: "Disable" })).toBeVisible();
  expect(state.capturedStatusUpdates).toEqual([
    { userId: "user-active", is_active: false },
    { userId: "user-active", is_active: true },
  ]);

  const pendingUserRow = page.getByRole("row", { name: /Invited Employee/ });
  await pendingUserRow.getByRole("button", { name: "Resend invitation" }).click();
  await expect(page.getByRole("status")).toContainText("invite-token-2");
  expect(state.capturedInvitations[1]).toEqual({
    name: "Invited Employee",
    email: "invited@example.com",
    company: "Pioneer",
    role: "Engineering Manager",
  });

  await page.getByRole("link", { name: "Company information" }).click();
  await expect(page.getByRole("heading", { name: "Company information" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Northstar\s+2/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Pioneer\s+1/ })).toBeVisible();
});

test("a customer user cannot enter platform-admin screens", async ({ page }) => {
  const state = await installAdminApi(page, false);
  await page.goto("/admin/users");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Your career story, at a glance." })).toBeVisible();
  expect(state.capturedInvitations).toHaveLength(0);
});
