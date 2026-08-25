# AlamatAI Cloudflare Worker

The Worker implements `GET /healthz`, `GET /readyz`, and authenticated
`POST /v1/parse`. It uses a configurable OpenAI-compatible Chat Completions
endpoint for extraction and a D1 binding for deterministic region validation.

## Configuration

Production runtime variables are configured in the Cloudflare dashboard. The
Worker sets `keep_vars` in `wrangler.jsonc` and deliberately does not declare a
`vars` block, so code deployments do not replace dashboard-managed values:

- `LLM_BASE_URL` — provider base URL ending at `/v1`.
- `LLM_MODEL` — provider-specific model name.
- `LLM_TIMEOUT_MS` — outbound request deadline.
- `LLM_MAX_OUTPUT_TOKENS` — extraction output limit.
- `LLM_REASONING_EFFORT` — GPT-5.6 effort: `none`, `low`, `medium`, `high`,
  `xhigh`, or `max`; defaults to `none`.
- `LLM_RESPONSE_FORMAT` — `prompt`, `json_object`, or `json_schema`.
- `FUZZY_THRESHOLD` — deterministic region similarity threshold.
- `CORS_ORIGINS` — comma-separated browser origins; avoid `*` in production.
- `SERVICE_VERSION` — version exposed by health endpoints.

Secrets are configured separately:

```bash
npx wrangler secret put APP_API_KEY
npx wrangler secret put LLM_API_KEY
```

For local development, copy `.dev.vars.example` to `.dev.vars`. Never commit
`.dev.vars`. Local development commands use `wrangler.selfhost.jsonc`; production
deploy and remote D1 commands continue to use `wrangler.jsonc`.

## Self-hosted workerd container

`worker/Dockerfile` runs the Worker through Wrangler/Miniflare and its pinned
`workerd` runtime. It uses `wrangler.selfhost.jsonc`, so it never connects the
self-hosted process to the production Cloudflare D1 database. Runtime variables
are read from container environment variables; use `.dev.vars` with Docker's
`--env-file` option.

The container accepts these commands:

- `serve` applies migrations, conditionally seeds D1, and listens on port 8787.
- `migrate` applies pending local D1 migrations and exits.
- `seed` applies migrations, replaces gazetteer data with the pinned snapshot,
  and exits.

The image generates the checksum-verified seed at build time. Mount `/data` as
a persistent volume. With the default `ALAMATAI_SEED_DATABASE=auto`, the seed is
loaded only when its checksum marker is absent. `always` reloads it on each
start; `never` only runs migrations. See the root `README.md` for complete
Docker Compose, backend-only, frontend-only, and reseeding commands.

## D1 setup

Create the database and paste the returned ID into `wrangler.jsonc`:

```bash
npx wrangler d1 create alamatai-gazetteer
```

Then apply the schema and import the pinned snapshot:

```bash
npm run db:migrate:remote
npm run db:seed:remote
```

The seed is generated into ignored `.generated/` storage. The generator checks
the upstream SHA-256, exact level counts, duplicates, and parent references,
then downloads and verifies the pinned `sooluh/kodepos` enrichment before
producing D1-compatible SQL. Seed generation therefore requires network access.
Re-running the import replaces only the gazetteer tables and does not touch
request data because the Worker stores none.

Postal codes are not unique. D1 stores one row per locality, including village,
district, regency, province, coordinates, elevation, timezone, and an optional
mapped village-region code. During parsing, the validator queries this table and
fills only values that are common to every matching row.

`POST /v1/parse` accepts an optional `mode` value. `normal` is the default and
uses the configured reasoning effort and output limit. `fast` forces reasoning
effort to `none` for GPT-5.6-compatible models and caps model output at 400
tokens. The selected mode is returned as `meta.inference_mode`.

Clarification is stateless. When a response contains `clarification_message`,
the client can call `POST /v1/parse` again with the same `text` and a
`clarifications` array containing the question and the user's answer. Send the
complete ordered history on every reply. The Worker accepts at most eight turns,
does not persist them, and asks the model to merge explicit replies into the
final structured address before running deterministic D1 validation again.

## Development and verification

```bash
npm ci
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

Run all Worker checks with:

```bash
npm run types:check
npm run typecheck
npm test
npm run build
npm run data:verify
```
