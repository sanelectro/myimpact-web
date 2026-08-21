# MyImpact Web

Frontend for **MyImpact — AI Performance Intelligence Platform**.

## MVP
The UI lets an employee:
- Select a reporting period
- Upload goals/role/1:1 documents
- Upload personal evidence
- Generate Weekly Impact
- View goal alignment
- Inspect source evidence behind AI claims

## Technology
- React / Next.js
- TypeScript
- Microsoft Entra ID
- REST API via `myimpact-api`

## Structure
```text
src/
├── app/
├── components/
├── features/
│   ├── dashboard/
│   ├── evidence/
│   ├── goals/
│   ├── reports/
│   └── documents/
├── services/
├── types/
└── utils/
```

## Local setup
```bash
npm install
npm run dev
```

Example environment:
```text
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Do not commit secrets.

## Boundary
This repository owns UI and client-side interactions. AI orchestration, RAG, MCP and database logic belong to `myimpact-ai` / `myimpact-api`.
