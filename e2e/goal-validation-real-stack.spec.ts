import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

test.skip(
  process.env.MYIMPACT_E2E_ISOLATED !== "1",
  "Requires explicitly configured isolated services and disposable database",
);

test("validates, approves and activates a goal before accepting evidence", async ({ page, request }) => {
  const authURL = process.env.MYIMPACT_E2E_AUTH_API_URL;
  const aiURL = process.env.MYIMPACT_E2E_AI_API_URL;
  for (const url of [authURL, aiURL, process.env.PLAYWRIGHT_BASE_URL]) {
    if (!url || new URL(url).hostname !== "127.0.0.1") {
      throw new Error("Isolated real-stack tests require explicit loopback service URLs");
    }
  }
  const port = Number(process.env.MYIMPACT_E2E_VALIDATION_LLM_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Set MYIMPACT_E2E_VALIDATION_LLM_PORT to the isolated local provider port");
  }
  let providerCalls = 0;
  const provider = createServer((incoming, response) => {
    if (incoming.method !== "POST" || incoming.url !== "/v1/chat/completions") {
      response.writeHead(404).end();
      return;
    }
    let body = "";
    incoming.setEncoding("utf8");
    incoming.on("data", (chunk: string) => { body += chunk; });
    incoming.on("end", () => {
      const payload = JSON.parse(body);
      const isValidation = payload.response_format?.type === "json_object";
      if (isValidation) providerCalls++;
      const content = isValidation
        ? providerCalls === 1 ? "invalid JSON" : JSON.stringify({ issues: [] })
        : JSON.stringify({ suggestions: [{
          title: "Review release", description: "Review the release",
          completion_criteria: "The release is reviewed",
        }] });
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
        id: "local-validation-fixture", object: "chat.completion", created: 0,
        model: "local-validation-fixture", choices: [{
          index: 0, finish_reason: "stop", message: { role: "assistant", content },
        }],
      }));
    });
  });
  await new Promise<void>((resolve, reject) => {
    provider.once("error", reject);
    provider.listen(port, "127.0.0.1", resolve);
  });
  try {
    const suffix = randomUUID();
    const email = `validation-${suffix}@example.com`;
    const password = `isolated-${randomUUID()}`;
    const registered = await request.post(`${authURL}/auth/register`, {
      data: { name: "Validation Test", company: `E2E ${suffix}`, email, password },
    });
    expect(registered.status(), await registered.text()).toBe(201);
    const { user, access_token: token } = await registered.json();
    const headers = { Authorization: `Bearer ${token}` };
    const params = { user_id: user.id };
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/goals/new");
    await page.getByLabel(/Goal title/).fill("Validate the release workflow");
    await page.getByLabel(/Goal level/).selectOption("ANNUAL");
    await page.getByLabel("Accountability").fill("Release owner");
    await page.getByLabel(/Success criteria/).fill("Release completed");
    await page.getByLabel("Baseline deferral state").selectOption("OPEN");
    await page.getByLabel("Baseline deferral reason").fill("Waiting for data");
    await page.getByLabel("Baseline resolution stage").fill("Planning");
    await page.getByRole("button", { name: "Create goal" }).click();
    await expect(page).toHaveURL(/\/goals\/[0-9a-f-]+$/);
    const goalId = new URL(page.url()).pathname.split("/").pop()!;
    const saved = await request.get(`${aiURL}/api/v1/goals/${goalId}`, { params, headers });
    expect(saved.status(), await saved.text()).toBe(200);
    expect((await saved.json()).structured_fields.success_criteria).toMatchObject([{
      criterion_type: "BINARY", description: "Release completed", completion_conditions: "Release completed",
    }]);
    const prematureApproval = await request.post(`${aiURL}/api/v1/goals/${goalId}/approve`, {
      params, headers,
    });
    expect(prematureApproval.status()).toBe(422);

    const panel = page.locator("#goal-validation");
    await panel.getByRole("button", { name: "Validate goal" }).click();
    await expect(panel.getByRole("alert")).toContainText("Could not validate this goal");
    const failedHistory = await request.get(`${aiURL}/api/v1/goals/${goalId}/validation-history`, {
      params, headers,
    });
    expect(failedHistory.status(), await failedHistory.text()).toBe(200);
    expect(await failedHistory.json()).toEqual([]);

    await panel.getByRole("button", { name: "Validate goal" }).click();
    await expect(panel.locator(".goal-validation-status")).toHaveText("Ready");
    const history = await request.get(`${aiURL}/api/v1/goals/${goalId}/validation-history`, {
      params, headers,
    });
    expect(history.status(), await history.text()).toBe(200);
    const runs = await history.json();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      status: "READY",
      input_context: { goal_level: "ANNUAL", deferred_requirements: [
        expect.objectContaining({ requirement: "baseline", state: "OPEN" }),
      ] },
      result_context: { requirements: expect.arrayContaining([
        expect.objectContaining({ requirement: "baseline", state: "DEFERRED" }),
      ]) },
    });
    expect(providerCalls).toBe(2);
    await page.getByRole("button", { name: "Approve goal" }).click();
    await expect(page.getByRole("button", { name: "Activate goal" })).toBeVisible();
    await page.getByRole("button", { name: "Activate goal" }).click();
    await expect(page.getByRole("button", { name: "Add evidence", exact: true })).toBeEnabled();
    const eligibility = await request.get(`${aiURL}/api/v1/goals/${goalId}/evidence-eligibility`, {
      params, headers,
    });
    expect(eligibility.status(), await eligibility.text()).toBe(200);
    expect(await eligibility.json()).toMatchObject({
      eligible: true, goal_status: "active", ready_validation_exists: true,
      approved_for_latest_version: true, legacy_compatibility: false,
    });
    const evidence = await request.post(`${aiURL}/api/v1/goals/${goalId}/evidence`, {
      params, headers,
      data: {
        title: "Release confirmation", source_type: "personal",
        captured_at: new Date().toISOString(), relevance: "high",
      },
    });
    expect(evidence.status(), await evidence.text()).toBe(201);
    expect(await evidence.json()).toMatchObject({ approval_status: "pending" });
    await page.reload();
    await expect(page.getByText("Release confirmation").first()).toBeVisible();
    await expect(page.locator("#goal-validation .goal-validation-status")).toHaveText("Ready");
  } finally {
    await new Promise<void>((resolve, reject) => provider.close((error) => error ? reject(error) : resolve()));
  }
});
