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

Copy `.env.example` to `.env.local` when you need to override the local API or user ID.

```text
VITE_API_BASE_URL=http://localhost:8000
VITE_MYIMPACT_USER_ID=user-1
```

The default user ID is `user-1`, matching the M5 test/development fixtures. Replace it with the user ID available in your local API data.

### Validation

```bash
npm test
npm run build
```

## Boundary

This repository owns UI and client-side interactions. AI orchestration, RAG, MCP and database logic belong to `myimpact-ai` / `myimpact-api`.
