.PHONY: api-generate api-check worker-install worker-types worker-typecheck worker-test worker-build worker-dev worker-deploy db-migrate-local db-seed-local db-migrate-remote db-seed-remote gazetteer gazetteer-verify frontend-install frontend-generate frontend-test frontend-build frontend-dev test run docker-up docker-down

api-generate: frontend-generate worker-types

api-check:
	@tmp=$$(mktemp); \
	cd frontend && npx openapi-typescript ../api/openapi.yaml -o $$tmp >/dev/null; \
	status=0; cmp -s $$tmp src/types/api.generated.ts || status=1; rm -f $$tmp; \
	if [ $$status -ne 0 ]; then echo "generated frontend contract is out of date; run make frontend-generate"; exit 1; fi
	@cmp -s api/openapi.yaml frontend/public/openapi.yaml || (echo "public OpenAPI copy is out of date; run make frontend-generate"; exit 1)
	cd worker && npm run types:check

worker-install:
	cd worker && npm ci

worker-types:
	cd worker && npm run types

worker-typecheck:
	cd worker && npm run typecheck

worker-test:
	cd worker && npm test

worker-build:
	cd worker && npm run build

worker-dev:
	cd worker && npm run dev

worker-deploy:
	cd worker && npm run deploy

db-migrate-local:
	cd worker && npm run db:migrate:local

db-seed-local:
	cd worker && npm run db:seed:local

db-migrate-remote:
	cd worker && npm run db:migrate:remote

db-seed-remote:
	cd worker && npm run db:seed:remote

gazetteer:
	cd worker && npm run db:seed:generate

gazetteer-verify:
	cd worker && npm run data:verify

frontend-install:
	cd frontend && npm ci

frontend-generate:
	cd frontend && npm run generate:api

frontend-test:
	cd frontend && npm test

frontend-build:
	cd frontend && npm run build

frontend-dev:
	cd frontend && npm run dev

test: worker-typecheck worker-test frontend-test

run: worker-dev

docker-up:
	docker compose up --build

docker-down:
	docker compose down
