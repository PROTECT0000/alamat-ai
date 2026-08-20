# AlamatAI MVP — Cloudflare Worker + React Monorepo

## Goal

Run the AlamatAI API as a TypeScript Cloudflare Worker. Extraction uses a
configurable OpenAI-compatible Chat Completions endpoint, while D1 stores the
pinned Indonesian administrative gazetteer used for deterministic validation.
The React frontend consumes the unchanged OpenAPI contract.

## Decisions

- Contract-first HTTP API at `POST /v1/parse`, documented by OpenAPI 3.0.3.
- Native ES-module Worker using Web Platform APIs and no routing framework.
- D1 binding for exact, alias, fuzzy, hierarchy, and optional postal validation.
- Wrangler migration plus a reproducible seed generator from the pinned source.
- React + Vite frontend with React Router, Axios, and Zustand.
- `X-API-Key` protects the model-backed endpoint; health endpoints are public.
- `APP_API_KEY` and `LLM_API_KEY` are Cloudflare secrets, never plaintext vars.
- One repair call is allowed only when model message content is invalid.
- Raw PII is sent to the configured provider but is never persisted or logged.
- Region normalization, hierarchy, issues, and clarification are deterministic.
- No LLM confidence score is exposed.

## Acceptance

- `make api-check`, `make test`, `make worker-build`, `make frontend-build`, and
  `make gazetteer-verify` pass.
- Worker tests run in the Cloudflare `workerd` runtime with an isolated D1.
- A full local D1 import verifies 38/514/7,285/83,762 and zero hierarchy orphans.
- Provider model/base URL are configurable and credentials use Worker secrets.
- Ambiguous regions are never guessed and produce concise Indonesian clarification.
- Full address text, recipient, contact, API keys, and model content never appear
  in logs.
