import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

const enabled = process.env.MYIMPACT_E2E_ISOLATED === "1";
const authURL = process.env.MYIMPACT_E2E_AUTH_API_URL;
const aiURL = process.env.MYIMPACT_E2E_AI_API_URL;

test.skip(!enabled, "Requires explicitly configured isolated services and disposable database");

function seedEvidenceEligibility(userId: string, goalIds: string[]) {
  const container = process.env.MYIMPACT_E2E_DISPOSABLE_CONTAINER;
  if (!container || ![userId, ...goalIds].every((id) => /^[0-9a-f-]{36}$/i.test(id))) {
    throw new Error("Disposable container and UUID fixture identifiers are required");
  }
  const label = execFileSync("docker", [
    "inspect", "--format", '{{index .Config.Labels "myimpact.test"}}', container,
  ], { encoding: "utf8" }).trim();
  const port = execFileSync("docker", ["port", container, "5432/tcp"], { encoding: "utf8" }).trim();
  if (!/^hierarchy-e2e-[a-z0-9-]+$/.test(label) || !/^127\.0\.0\.1:\d+$/.test(port)) {
    throw new Error("Evidence fixtures require a labelled, loopback-only disposable container");
  }
  const ids = goalIds.map((id) => `'${id}'`).join(", ");
  const sql = `
    BEGIN;
    DO $$ BEGIN
      IF (SELECT count(*) FROM goals WHERE user_id = '${userId}' AND id IN (${ids})) <> ${goalIds.length}
      THEN RAISE EXCEPTION 'Isolated fixture goals were not found'; END IF;
    END $$;
    UPDATE goals SET status = 'ACTIVE', sub_status = 'ON_TRACK'
      WHERE user_id = '${userId}' AND id IN (${ids});
    INSERT INTO goal_validation_runs
      (id, goal_id, goal_version_id, status, findings, rule_set_version, prompt_version, created_at)
    SELECT gen_random_uuid()::text, g.id, v.id, 'READY', '[]', 'e2e-fixture', 'e2e-fixture', now()
      FROM goals g JOIN LATERAL (
        SELECT id FROM goal_versions WHERE goal_id = g.id ORDER BY version DESC LIMIT 1
      ) v ON true WHERE g.user_id = '${userId}' AND g.id IN (${ids});
    INSERT INTO goal_version_approvals (id, goal_id, goal_version_id, actor_user_id, created_at)
    SELECT gen_random_uuid()::text, g.id, v.id, '${userId}', now()
      FROM goals g JOIN LATERAL (
        SELECT id FROM goal_versions WHERE goal_id = g.id ORDER BY version DESC LIMIT 1
      ) v ON true WHERE g.user_id = '${userId}' AND g.id IN (${ids});
    COMMIT;
  `;
  execFileSync("docker", [
    "exec", "-i", container, "psql", "-v", "ON_ERROR_STOP=1",
    "-U", "e2e", "-d", "hierarchye2e",
  ], { input: sql, stdio: ["pipe", "pipe", "pipe"] });
}

test("persists hierarchy, deferrals and evidence through the real stack", async ({ page, request }) => {
  for (const url of [authURL, aiURL, process.env.PLAYWRIGHT_BASE_URL]) {
    if (!url || new URL(url).hostname !== "127.0.0.1") {
      throw new Error("Isolated real-stack tests require explicit loopback service URLs");
    }
  }
  const suffix = randomUUID();
  const password = `isolated-${randomUUID()}`;
  const email = `hierarchy-${suffix}@example.com`;
  const register = await request.post(`${authURL}/auth/register`, {
    data: { name: "Hierarchy Test", company: `E2E ${suffix}`, email, password },
  });
  expect(register.status(), await register.text()).toBe(201);
  const { access_token: token, user } = await register.json();
  const headers = { Authorization: `Bearer ${token}` };
  const createGoal = async (title: string, goal_level: string) => {
    const response = await request.post(`${aiURL}/api/v1/goals`, {
      params: { user_id: user.id }, headers, data: { title, goal_level },
    });
    expect(response.status(), await response.text()).toBe(201);
    return response.json();
  };
  const parent = await createGoal("Real stack parent", "ANNUAL");
  const child = await createGoal("Real stack child", "SPRINT");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/goals/${child.id}`);
  const hierarchy = page.locator(".goal-hierarchy-panel").filter({
    has: page.getByRole("heading", { name: "Alignment and relationships" }),
  });
  await expect(hierarchy.getByText("No parent goal.")).toBeVisible();
  await hierarchy.getByLabel("Parent goal").selectOption(parent.id);
  await hierarchy.getByRole("button", { name: "Connect parent" }).click();
  await expect(hierarchy.getByRole("link", { name: "Real stack parent" })).toBeVisible();

  const savedHierarchy = await request.get(`${aiURL}/api/v1/goals/${child.id}/hierarchy`, {
    params: { user_id: user.id }, headers,
  });
  expect(savedHierarchy.status(), await savedHierarchy.text()).toBe(200);
  expect((await savedHierarchy.json()).goal).toMatchObject({
    parent_goal_id: parent.id, relationship_revision: 1,
  });

  await page.goto(`/goals/${parent.id}/edit`);
  await page.getByLabel("Baseline deferral state").selectOption("OPEN");
  await page.getByLabel("Baseline deferral reason").fill("Waiting for the baseline");
  await page.getByLabel("Baseline resolution stage").fill("Planning");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/goals/${parent.id}$`));
  const requirements = page.getByRole("heading", { name: "Requirement status" }).locator("..");
  await expect(requirements.getByText(/Waiting for the baseline/)).toBeVisible();
  const measures = page.getByRole("heading", { name: "Execution, outcome and impact" }).locator("..");
  await expect(measures.getByText(/1 direct children/)).toBeVisible();
  await expect(measures.getByText(/Not determined by child completion/)).toBeVisible();
  await page.reload();
  await expect(requirements.getByText(/Waiting for the baseline/)).toBeVisible();
  await expect(measures.getByText(/1 direct children/)).toBeVisible();

  const savedGoal = await request.get(`${aiURL}/api/v1/goals/${parent.id}`, {
    params: { user_id: user.id }, headers,
  });
  expect(savedGoal.status(), await savedGoal.text()).toBe(200);
  expect((await savedGoal.json()).structured_fields.deferred_requirements).toMatchObject([{
    requirement: "baseline", reason: "Waiting for the baseline",
    resolution_stage: "Planning", state: "OPEN",
  }]);
  const staleChange = await request.put(`${aiURL}/api/v1/goals/${child.id}/parent`, {
    params: { user_id: user.id }, headers,
    data: { parent_goal_id: parent.id, expected_revision: 0 },
  });
  expect(staleChange.status()).toBe(409);

  seedEvidenceEligibility(user.id, [parent.id, child.id]);
  const evidence = await request.post(`${aiURL}/api/v1/goals/${child.id}/evidence`, {
    params: { user_id: user.id }, headers,
    data: {
      title: "Real stack evidence", source_type: "personal",
      captured_at: new Date().toISOString(), relevance: "high",
    },
  });
  expect(evidence.status(), await evidence.text()).toBe(201);
  const evidenceId = (await evidence.json()).evidence_id;
  await page.reload();
  const evidencePanel = page.getByRole("heading", { name: "Evidence context" }).locator("..");
  await evidencePanel.getByRole("button", { name: "Show evidence context" }).click();
  await expect(evidencePanel.getByText(/Inherited · primary/)).toBeVisible();
  const beforeLink = await request.get(`${aiURL}/api/v1/goals/${parent.id}/evidence`, {
    params: { user_id: user.id }, headers,
  });
  expect(beforeLink.status(), await beforeLink.text()).toBe(200);
  expect(await beforeLink.json()).toEqual([]);
  await evidencePanel.getByLabel("Source goal").selectOption(child.id);
  await evidencePanel.getByRole("combobox", { name: "Evidence", exact: true }).selectOption(evidenceId);
  await evidencePanel.getByLabel("Relationship type").selectOption("CONTRIBUTION");
  await evidencePanel.getByLabel(/Contribution description/).fill("Supports the parent outcome");
  await evidencePanel.getByRole("button", { name: "Link evidence" }).click();
  await expect(evidencePanel.getByText("Evidence linked. Approval is pending.")).toBeVisible();
  const context = await request.get(`${aiURL}/api/v1/goals/${parent.id}/evidence-context`, {
    params: { user_id: user.id }, headers,
  });
  expect(context.status(), await context.text()).toBe(200);
  expect((await context.json()).items).toMatchObject([{
    evidence_id: evidenceId,
    origins: expect.arrayContaining([
      expect.objectContaining({ origin: "INHERITED", source_goal_id: child.id }),
      expect.objectContaining({
        origin: "DIRECT", mapping_kind: "CONTRIBUTION", approval_status: "pending",
        contribution_description: "Supports the parent outcome",
      }),
    ]),
  }]);

  const otherRegistration = await request.post(`${authURL}/auth/register`, {
    data: {
      name: "Other Test User", company: `E2E ${suffix}`,
      email: `other-${suffix}@example.com`, password,
    },
  });
  expect(otherRegistration.status(), await otherRegistration.text()).toBe(201);
  const other = await otherRegistration.json();
  const forbidden = await request.get(`${aiURL}/api/v1/goals/${child.id}/hierarchy`, {
    params: { user_id: other.user.id },
    headers: { Authorization: `Bearer ${other.access_token}` },
  });
  expect(forbidden.status()).toBe(404);

  await page.goto(`/goals/${child.id}`);
  await expect(hierarchy.getByRole("link", { name: "Real stack parent" })).toBeVisible();
  await hierarchy.getByRole("button", { name: "Disconnect parent" }).click();
  await expect(hierarchy.getByText("No parent goal.")).toBeVisible();
  await hierarchy.getByText("Relationship history").click();
  await expect(hierarchy.getByText("Revision 2")).toBeVisible();
  const parentMeasures = await request.get(`${aiURL}/api/v1/goals/${parent.id}/measures`, {
    params: { user_id: user.id, include_assessment: false }, headers,
  });
  expect(parentMeasures.status(), await parentMeasures.text()).toBe(200);
  expect((await parentMeasures.json()).child_execution.total).toBe(0);
});
