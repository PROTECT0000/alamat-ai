import { handleRequest } from './app'
import type { WorkerEnv } from './types'

export default {
  fetch(request, env, _context): Promise<Response> {
    return handleRequest(request, env)
  },
} satisfies ExportedHandler<WorkerEnv>
