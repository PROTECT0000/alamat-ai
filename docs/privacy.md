# Privacy and logging

Address text may contain names, phone numbers, and delivery instructions. The
Worker sends that text and any clarification replies to the LLM endpoint
configured by the operator. The operator is responsible for selecting a
provider and data-processing policy appropriate for the deployment.

The Worker does not persist requests, clarification history, or responses. The
client sends the complete clarification history again for each reply.
Structured Workers logs contain request ID, method, path, status, latency,
model failure class, and sanitized error type only. They never include the raw
address, parsed address, recipient, contact number, API keys, or raw provider
content.

`APP_API_KEY` and `LLM_API_KEY` are Cloudflare secrets. They must not be stored
in `wrangler.jsonc`; local values belong in the ignored `worker/.dev.vars` file.
