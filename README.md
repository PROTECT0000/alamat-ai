# AlamatAI

AlamatAI extracts messy Indonesian addresses through an OpenAI-compatible
model, validates administrative regions against a pinned D1 gazetteer, and
creates deterministic clarification messages.

This repository is a monorepo. `worker/` contains the Cloudflare Worker API,
`api/` is the shared OpenAPI contract, and `frontend/` contains the React + Vite
app using React Router, Axios, Zustand, and generated OpenAPI types.

## Local development

Requirements: Node.js 22+ and npm.

1. Install dependencies:

```bash
make worker-install
make frontend-install
```

2. Copy `worker/.dev.vars.example` to `worker/.dev.vars`, then set a non-placeholder
   `APP_API_KEY`. Set `LLM_API_KEY` when the configured provider requires one.
   Non-secret provider settings live in `worker/wrangler.jsonc`.

3. Prepare the local D1 database from the pinned data snapshot:

```bash
make db-migrate-local
make db-seed-local
```

4. Start the Worker and frontend in separate terminals:

```bash
make worker-dev
make frontend-dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the Worker on
`http://localhost:8787`.

## Cloudflare deployment

Create a D1 database, replace the placeholder `database_id` in
`worker/wrangler.jsonc`, configure secrets, load the data, and deploy:

```bash
cd worker
npx wrangler d1 create alamatai-gazetteer
npx wrangler secret put APP_API_KEY
npx wrangler secret put LLM_API_KEY
npm run db:migrate:remote
npm run db:seed:remote
npm run deploy
```

`LLM_API_KEY` may be omitted for a provider that does not require authentication.
Set `LLM_BASE_URL`, `LLM_MODEL`, `CORS_ORIGINS`, and the other non-secret values
in `worker/wrangler.jsonc` before deployment. See `worker/README.md` for the full
deployment checklist.

## Contract and checks

The OpenAPI source of truth is `api/openapi.yaml`:

```bash
make api-generate
make api-check
make test
make worker-build
make frontend-build
make gazetteer-verify
```

The frontend asks for the application API key at runtime and keeps it only in
`sessionStorage`; it is never embedded in the static bundle.

## Privacy

The service does not persist address requests and deliberately excludes raw
address text, recipient names, contact numbers, API keys, and raw model output
from logs. The full input is sent to the configured LLM provider. Local
processing may only be claimed when `LLM_BASE_URL` points to a local model.

## Data terminology

The official regulation is a count benchmark. The pinned `cahyadsn/wilayah`
snapshot is a community-maintained `machine_readable_primary` source under MIT;
it is not described as authoritative. See `docs/data-provenance.md`.
