# AlamatAI

AlamatAI extracts messy Indonesian addresses through an OpenAI-compatible
model, validates administrative regions against a pinned D1 gazetteer, and
creates deterministic clarification messages.

This repository is a monorepo. `worker/` contains the Cloudflare Worker API,
`api/` is the shared OpenAPI contract, and `frontend/` contains the React + Vite
app using React Router, Axios, Zustand, and generated OpenAPI types.

## Local development without Docker

Requirements: Node.js 22+ and npm.

1. Install backend and frontend dependencies:

```bash
make worker-install
make frontend-install
```

2. Create the local backend environment file:

```bash
cp worker/.dev.vars.example worker/.dev.vars
```

Set a non-placeholder `APP_API_KEY` and `LLM_MODEL`. Set `LLM_API_KEY` when the
configured provider requires one, and point `LLM_BASE_URL` at its
OpenAI-compatible `/v1` endpoint. `.dev.vars` is ignored by Git.

3. Apply the schema and seed the local D1 database:

```bash
make db-migrate-local
make db-seed-local
```

`db-seed-local` verifies the pinned region snapshot, downloads the pinned
postal-code snapshot, checks its SHA-256, generates SQL under the ignored
`worker/.generated/` directory, and imports it. It requires internet access
while generating the seed and is safe to rerun: gazetteer tables are replaced.

4. Start the Worker and frontend in separate terminals:

```bash
make worker-dev
make frontend-dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the Worker on
`http://localhost:8787`.

Useful backend checks:

```bash
curl http://localhost:8787/healthz
curl http://localhost:8787/readyz
```

## Self-host with Docker and workerd

The backend image runs Wrangler/Miniflare's pinned `workerd` runtime and a local
D1-compatible SQLite database. This is intended for a single self-hosted
instance; unlike Cloudflare D1, the local volume does not provide replication or
multi-node coordination.

First create `worker/.dev.vars` as described above, then build and start the
whole monorepo:

```bash
docker compose build
docker compose up -d
docker compose logs -f backend
```

The image build needs internet access to fetch and verify the pinned postal-code
snapshot. Runtime initialization uses the generated seed bundled in the image,
so it does not download the dataset again.

The frontend is available at `http://localhost:3000`, and the backend is bound
to the host loopback interface at `http://localhost:8787`. Nginx proxies
frontend requests from `/api` to the backend service. Put the service behind a
production reverse proxy before making it internet-accessible.

The first backend start automatically applies migrations and imports the pinned
seed. Database files are persisted in the named volume `alamatai-data`. A seed
checksum marker prevents the same snapshot from being imported on every start;
a newly built image with changed seed data is imported automatically.

To apply only migrations or force a reseed manually, stop the backend first and
run the corresponding one-shot command:

```bash
docker compose stop backend
docker compose run --rm backend migrate
docker compose run --rm backend seed
docker compose up -d backend frontend
```

`seed` replaces only gazetteer tables. To discard the entire self-hosted local
database, `docker compose down -v` removes the named volume and cannot be undone;
the next start creates and seeds a new database.

### Backend-only container

```bash
docker build -f worker/Dockerfile -t alamatai-backend .
docker volume create alamatai-data
docker run -d --name alamatai-backend \
  --env-file worker/.dev.vars \
  --add-host host.docker.internal:host-gateway \
  -v alamatai-data:/data \
  -p 127.0.0.1:8787:8787 \
  alamatai-backend
```

The default command is `serve`. Append `migrate` or `seed` for a one-shot
database operation. Set `ALAMATAI_SEED_DATABASE=never` to disable automatic
seeding, or `always` to reseed on every container start. If the LLM runs on the
Docker host, use a base URL such as
`http://host.docker.internal:11434/v1` in `worker/.dev.vars`.

### Frontend-only container

Build the frontend after the backend is reachable, then point its Nginx proxy at
that backend:

```bash
docker build -f frontend/Dockerfile -t alamatai-frontend .
docker run -d --name alamatai-frontend \
  --add-host host.docker.internal:host-gateway \
  -e BACKEND_UPSTREAM=host.docker.internal:8787 \
  -p 3000:80 \
  alamatai-frontend
```

For a backend on another host, set `BACKEND_UPSTREAM` to `hostname:port`.

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
in the Cloudflare dashboard. Deployments retain dashboard-managed variables via
`keep_vars`. See `worker/README.md` for the full deployment checklist.

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
