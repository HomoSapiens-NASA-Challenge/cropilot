import { getMigrations } from "better-auth/db/migration"
import { AUTH_SCHEMA, auth, pool } from "./auth.ts"

await pool.query(`CREATE SCHEMA IF NOT EXISTS ${AUTH_SCHEMA}`)
const { runMigrations } = await getMigrations(auth.options)
await runMigrations()
await pool.end()
