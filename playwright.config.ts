import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5174";
const webPort = new URL(baseURL).port || "5174";
const useRealStack = process.env.MYIMPACT_E2E_REAL_STACK === "1";
const authApiURL =
  process.env.MYIMPACT_E2E_AUTH_API_URL ?? "http://127.0.0.1:8001";
const aiApiURL =
  process.env.MYIMPACT_E2E_AI_API_URL ?? "http://127.0.0.1:8000";
const backendWebServers = useRealStack
  ? [
      {
        command:
          `cd ../myimpact-api && python -m uvicorn app.main:app --host 127.0.0.1 --port ${new URL(authApiURL).port || "8001"}`,
        url: `${authApiURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
      {
        command:
          `cd ../myimpact-ai && python -m uvicorn app.main:app --host 127.0.0.1 --port ${new URL(aiApiURL).port || "8000"}`,
        url: `${aiApiURL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
    ]
  : [];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    ...backendWebServers,
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: useRealStack
        ? {
            VITE_AUTH_API_BASE_URL: authApiURL,
            VITE_API_BASE_URL: aiApiURL,
          }
        : undefined,
    },
  ],
});
