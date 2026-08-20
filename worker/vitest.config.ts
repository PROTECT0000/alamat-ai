import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

process.env.APP_API_KEY ??= 'test-app-key'

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations('./migrations'),
          APP_API_KEY: 'test-app-key',
          LLM_API_KEY: 'test-llm-key',
          LLM_BASE_URL: 'https://llm.example/v1',
          LLM_MODEL: 'test-model',
          LLM_TIMEOUT_MS: '20000',
          LLM_MAX_OUTPUT_TOKENS: '800',
          LLM_RESPONSE_FORMAT: 'prompt',
          FUZZY_THRESHOLD: '0.82',
          CORS_ORIGINS: '*',
          SERVICE_VERSION: 'test',
        },
      },
    })),
  ],
  test: {
    setupFiles: ['./test/setup.ts'],
  },
})
