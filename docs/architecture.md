# Architecture

The synchronous path is: authenticated Cloudflare Worker request →
OpenAI-compatible extractor → strict JSON validation → D1 gazetteer resolution
→ issue classification → deterministic clarification template → JSON response.

The LLM only extracts values present in the input. It does not provide region
codes, confidence scores, validation decisions, or clarification copy. Those
operations are deterministic TypeScript running in the Worker. Invalid model
content receives one repair attempt; transport failures and rate limits are
never retried automatically.

D1 is read-only from the runtime request path. Schema migrations and the pinned
gazetteer seed are applied explicitly through Wrangler. The Worker has no
transactional request database, queue, background job, or address history.

Cloudflare Workers do not provide a reliable process-wide concurrency semaphore
across isolates. Cost controls should therefore be enforced with the application
API key, provider limits, and—when required—a Cloudflare rate-limiting rule or
binding at deployment time.
