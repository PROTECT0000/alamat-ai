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
          LLM_MODEL: 'test-model',
        },
      },
    })),
  ],
  test: {
    setupFiles: ['./test/setup.ts'],
  },
})
