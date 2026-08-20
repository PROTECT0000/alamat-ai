import type { WorkerEnv } from '../src/types'

declare module 'cloudflare:workers' {
  interface ProvidedEnv extends WorkerEnv {
    TEST_MIGRATIONS: D1Migration[]
  }
}
