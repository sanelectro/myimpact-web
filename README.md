# MyImpact Web

Frontend for **MyImpact — AI Performance Intelligence Platform**.

## M6.2 — MyImpact Dashboard

M6.2 connects the dashboard to the existing M5 product APIs. The frontend does not introduce a new dashboard API; it aggregates the existing goal-scoped contracts at the UI layer.

### Dashboard data flow

```text
GET /api/v1/goals?user_id=...
          │
          ├── GET /api/v1/goals/{goal_id}/evidence
          ├── GET /api/v1/goals/{goal_id}/impact
          │
          └── GET /api/v1/goals/{goal_id}/insight
                         │
                         ▼
                 MyImpact Dashboard
```

The dashboard currently surfaces:

- Active goal count
- Evidence count connected to active goals
- Impact assessment count
- Career insight availability
- Recent impact assessments
- Latest career insight
- Preparation / next action
- Active goal summary

### Local setup

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when you need to override the local API URL.
New account registration requires an organization name and associates the
account with that organization's shared directory.

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Local demo accounts

The local seed creates nine employee accounts and one MyImpact platform-admin
account with real password hashes. Use the email for the selected account and the shared password provided as
`DEMO_USER_PASSWORD` when running `myimpact-db/scripts/demo/seed_demo_data.sh`.

| Account | Email | Role |
| --- | --- | --- |
| Platform | `myimpact-admin@example.com` | MyImpact Platform Administrator |
| JL1 | `user-tse@example.com` | Trainee Software Engineer |
| JL2 | `user-jse@example.com` | Junior Software Engineer |
| JL3 | `user-se@example.com` | Software Engineer |
| JL4 | `user-sse@example.com` | Senior Software Engineer |
| JL4 | `user-em@example.com` | Engineering Manager |
| JL5 | `user-lse@example.com` | Lead Software Engineer |
| JL5 | `user-lsa@example.com` | Lead Software Architect |
| JL5 | `user-sem@example.com` | Senior Engineering Manager |
| JL6 | `user-ed@example.com` | Engineering Director (Technical Director level) |

For local mock GitHub/Jira discovery, set `SOURCE_DEMO_MOCKS_ENABLED=true` in
`myimpact-ai/.env` and restart the AI service. This is development-only; when
disabled, the existing OAuth and local-token source behavior is unchanged.

### Platform administrator

The MyImpact platform administrator has a separate console with a platform
overview, customer account management, and a company information page. Company
administrators can rename customer companies; the current company record stores
the company name and uses it as the display identity throughout the workspace.

### Manager evidence reviews

Reporting managers can review direct reports' pending evidence from **Pending
requests**. Every user can open **Notifications** to review manager decisions
and mark updates as read.

### Validation

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Fixture-based Playwright tests start the Vite app on `127.0.0.1:5174` for
browser flows. The real-stack document ingestion test can be run with
`npm run test:e2e:m64`. Database-backed API and import coverage lives in
`myimpact-ai/tests/integration`; document extraction with a live external LLM
provider is not part of the browser test suite.

See [Playwright E2E scenarios](./docs/playwright-scenarios.md) for current
browser coverage and planned user journeys.

### Workspace scrolling

On desktop (above 680px), the sidebar stays in place while the right-hand content
scrolls independently. The sidebar can scroll separately on short screens so all
navigation links remain accessible. At 680px and below, navigation stacks above
the content and the page scrolls normally.

## Boundary

This repository owns UI and client-side interactions. AI orchestration, RAG, MCP and database logic belong to `myimpact-ai` / `myimpact-api`.
