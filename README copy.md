# MyImpact Web — M6.1

Greenfield frontend foundation for MyImpact AI.

## Stack

- React + TypeScript — UI and type-safe frontend contracts
- Vite — development server and production build
- React Router — product page routing
- TanStack Query — server-state/query foundation

## M6.1 scope

This milestone establishes:

- React application shell
- Product navigation
- Dashboard foundation
- Route structure for upcoming product areas
- Central API client foundation
- TanStack Query provider
- TypeScript configuration
- Frontend build/test scripts

The feature pages are intentionally placeholders. Product functionality will be added incrementally in later M6 milestones.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

The default API URL is `http://localhost:8000`.

## Validate

```bash
npm test
npm run build
```

## API boundary

The frontend communicates only with the product-facing MyImpact API under `/api/v1`.

It does not access repositories, PostgreSQL, pgvector, embeddings, LLM providers, or internal processing services directly.
