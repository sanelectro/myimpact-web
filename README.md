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

```text
VITE_API_BASE_URL=http://localhost:8000
```

### Local mock login

The frontend includes client-side demo accounts for local testing:

| Username | Password | User |
| --- | --- | --- |
| `alex` | `alex123` | `user-1`, rich demo data |
| `priya` | `priya123` | `user-2`, partial demo data |
| `empty` | `empty123` | `user-empty`, empty state |
| `user-3` | `jl4-demo` | `user-3`, JL-4 empty state |

This mock login only selects a user in the browser. Credentials are bundled with the frontend, and the API still accepts a caller-supplied `user_id`; this is not authentication or authorization and must not be used in production.

### Validation

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright goal acceptance tests start the Vite app on `127.0.0.1:5174`
and use deterministic API fixtures for browser flows. Database-backed API and
import coverage lives in `myimpact-ai/tests/integration`; document extraction
with a live external LLM provider is not part of the browser test suite.

### Workspace scrolling

On desktop (above 680px), the sidebar stays in place while the right-hand content
scrolls independently. The sidebar can scroll separately on short screens so all
navigation links remain accessible. At 680px and below, navigation stacks above
the content and the page scrolls normally.

## Boundary

This repository owns UI and client-side interactions. AI orchestration, RAG, MCP and database logic belong to `myimpact-ai` / `myimpact-api`.
