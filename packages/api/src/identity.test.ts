import assert from "node:assert/strict"
import { test } from "node:test"
import { handleFromName } from "./identity.ts"

// The backend accepts exactly this rule (apps/backend/app/core/auth.py); a handle outside it
// would lock the reader out of every private page.
const BACKEND_RULE = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/

test("a typed name becomes a handle the backend accepts", () => {
  for (const [name, handle] of [
    ["Joaquín León", "joaquin-leon"],
    ["  @Martín_Bianchi!  ", "martin-bianchi"],
    ["Ñandú 2026", "nandu-2026"],
    ["jl", "jl"],
  ] as const) {
    assert.equal(handleFromName(name), handle)
    assert.match(handle, BACKEND_RULE)
  }
})

test("a long name is cut to 40 characters without a trailing hyphen", () => {
  const handle = handleFromName(`${"a".repeat(39)} b`)
  assert.equal(handle, "a".repeat(39))
  assert.match(handle ?? "", BACKEND_RULE)
})

test("a name with fewer than two letters or digits has no handle", () => {
  for (const name of ["", "   ", "a", "!!!", "é"]) {
    assert.equal(handleFromName(name), null)
  }
})
