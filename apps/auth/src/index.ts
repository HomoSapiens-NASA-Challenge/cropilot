import { createServer } from "node:http"
import { toNodeHandler } from "better-auth/node"
import { auth } from "./auth.ts"
import { env } from "./env.ts"

// Better Auth serves everything under /api/auth, including /api/auth/ok for health checks.
createServer(toNodeHandler(auth)).listen(env.port, () => {
  console.info(`auth listening on :${env.port}`)
})
