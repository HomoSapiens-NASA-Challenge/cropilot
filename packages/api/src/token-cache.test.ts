import assert from "node:assert/strict"
import { test } from "node:test"
import { createTokenCache } from "./token-cache.ts"

function tokenExpiringIn(seconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + seconds
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url")
  return `header.${payload}.signature`
}

function countingFetcher(tokens: Array<string | undefined>) {
  let calls = 0
  const fetchToken = async () => tokens[calls++]
  return { fetchToken, calls: () => calls }
}

test("reuses a valid token", async () => {
  const token = tokenExpiringIn(600)
  const fetcher = countingFetcher([token, tokenExpiringIn(600)])
  const cache = createTokenCache(fetcher.fetchToken)

  assert.equal(await cache.get(), token)
  assert.equal(await cache.get(), token)
  assert.equal(fetcher.calls(), 1)
})

test("concurrent callers share one request", async () => {
  const fetcher = countingFetcher([tokenExpiringIn(600)])
  const cache = createTokenCache(fetcher.fetchToken)

  await Promise.all([cache.get(), cache.get(), cache.get()])

  assert.equal(fetcher.calls(), 1)
})

test("fetches again once the token is about to expire", async () => {
  const fresh = tokenExpiringIn(600)
  const fetcher = countingFetcher([tokenExpiringIn(10), fresh])
  const cache = createTokenCache(fetcher.fetchToken)

  await cache.get()

  assert.equal(await cache.get(), fresh)
})

test("fetches again after clear", async () => {
  const fetcher = countingFetcher([tokenExpiringIn(600), undefined])
  const cache = createTokenCache(fetcher.fetchToken)

  await cache.get()
  cache.clear()

  assert.equal(await cache.get(), undefined)
})

test("does not cache a signed-out result or a failure", async () => {
  const token = tokenExpiringIn(600)
  let calls = 0
  const cache = createTokenCache(async () => {
    calls++
    if (calls === 1) return undefined
    if (calls === 2) throw new Error("auth unreachable")
    return token
  })

  assert.equal(await cache.get(), undefined)
  await assert.rejects(cache.get(), /auth unreachable/)
  assert.equal(await cache.get(), token)
})
