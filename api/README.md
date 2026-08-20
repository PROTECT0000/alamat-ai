# API contract

`openapi.yaml` is the source of truth for the public HTTP API. The frontend
types in `frontend/src/types/api.generated.ts` are generated from this contract.
The Worker implements the same paths directly with Web Platform APIs.

Run `make api-generate` after changing the specification and `make api-check`
before committing.
