// Run with: deno test --allow-env supabase/functions/claude-proxy/index.test.ts
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { handleRequest } from './index.ts'

const MOCK_ENV: Record<string, string> = { CLAUDE_API_KEY: 'test-key-abc' }
const getEnv = (k: string) => MOCK_ENV[k]

const CLAUDE_RESPONSE = JSON.stringify({
  content: [{ type: 'text', text: '{"recommendations":[]}' }],
})

function mockFetch(body = CLAUDE_RESPONSE, status = 200): typeof fetch {
  return async (_url: string | URL | Request, _init?: RequestInit) => {
    return new Response(body, {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function makeRequest(
  method = 'POST',
  body: unknown = { model: 'claude-haiku', max_tokens: 100, messages: [] },
  headers: Record<string, string> = {},
): Request {
  return new Request('https://proxy.test/claude-proxy', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  })
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

Deno.test('OPTIONS returns 204 with CORS headers', async () => {
  const res = await handleRequest(new Request('https://proxy.test', { method: 'OPTIONS' }), mockFetch(), getEnv)
  assertEquals(res.status, 204)
  assertEquals(res.headers.get('access-control-allow-origin'), '*')
  assertEquals(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS')
})

// ─── Method guard ─────────────────────────────────────────────────────────────

Deno.test('GET returns 405', async () => {
  const res = await handleRequest(new Request('https://proxy.test', { method: 'GET' }), mockFetch(), getEnv)
  assertEquals(res.status, 405)
  const body = await res.json()
  assertStringIncludes(body.error, 'Method not allowed')
})

// ─── Missing API key ──────────────────────────────────────────────────────────

Deno.test('returns 500 when CLAUDE_API_KEY env var is not set', async () => {
  const res = await handleRequest(makeRequest(), mockFetch(), (_k) => undefined)
  assertEquals(res.status, 500)
  const body = await res.json()
  assertStringIncludes(body.error, 'CLAUDE_API_KEY')
})

// ─── Request validation ───────────────────────────────────────────────────────

Deno.test('returns 400 for malformed JSON body', async () => {
  const req = new Request('https://proxy.test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json {{{',
  })
  const res = await handleRequest(req, mockFetch(), getEnv)
  assertEquals(res.status, 400)
  const body = await res.json()
  assertStringIncludes(body.error, 'Invalid JSON')
})

// ─── Successful forwarding ────────────────────────────────────────────────────

Deno.test('forwards valid request and returns upstream response', async () => {
  const res = await handleRequest(makeRequest(), mockFetch(), getEnv)
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.content[0].text, '{"recommendations":[]}')
})

Deno.test('adds x-api-key header when forwarding to Claude', async () => {
  let capturedHeaders: Record<string, string> = {}
  const capturingFetch: typeof fetch = async (_url, init) => {
    capturedHeaders = Object.fromEntries(
      new Headers(init?.headers as Record<string, string>).entries()
    )
    return new Response(CLAUDE_RESPONSE, { status: 200 })
  }
  await handleRequest(makeRequest(), capturingFetch, getEnv)
  assertEquals(capturedHeaders['x-api-key'], 'test-key-abc')
})

Deno.test('forwards anthropic-version header from incoming request', async () => {
  let capturedHeaders: Record<string, string> = {}
  const capturingFetch: typeof fetch = async (_url, init) => {
    capturedHeaders = Object.fromEntries(
      new Headers(init?.headers as Record<string, string>).entries()
    )
    return new Response(CLAUDE_RESPONSE, { status: 200 })
  }
  await handleRequest(
    makeRequest('POST', {}, { 'anthropic-version': '2024-01-01' }),
    capturingFetch,
    getEnv,
  )
  assertEquals(capturedHeaders['anthropic-version'], '2024-01-01')
})

Deno.test('forwards anthropic-beta header when present', async () => {
  let capturedHeaders: Record<string, string> = {}
  const capturingFetch: typeof fetch = async (_url, init) => {
    capturedHeaders = Object.fromEntries(
      new Headers(init?.headers as Record<string, string>).entries()
    )
    return new Response(CLAUDE_RESPONSE, { status: 200 })
  }
  await handleRequest(
    makeRequest('POST', {}, { 'anthropic-beta': 'prompt-caching-2024-07-31' }),
    capturingFetch,
    getEnv,
  )
  assertEquals(capturedHeaders['anthropic-beta'], 'prompt-caching-2024-07-31')
})

Deno.test('omits anthropic-beta header when not in request', async () => {
  let capturedHeaders: Record<string, string> = {}
  const capturingFetch: typeof fetch = async (_url, init) => {
    capturedHeaders = Object.fromEntries(
      new Headers(init?.headers as Record<string, string>).entries()
    )
    return new Response(CLAUDE_RESPONSE, { status: 200 })
  }
  await handleRequest(makeRequest(), capturingFetch, getEnv)
  assertEquals(capturedHeaders['anthropic-beta'], undefined)
})

Deno.test('never forwards anthropic-dangerous-direct-browser-access header', async () => {
  let capturedHeaders: Record<string, string> = {}
  const capturingFetch: typeof fetch = async (_url, init) => {
    capturedHeaders = Object.fromEntries(
      new Headers(init?.headers as Record<string, string>).entries()
    )
    return new Response(CLAUDE_RESPONSE, { status: 200 })
  }
  await handleRequest(
    makeRequest('POST', {}, { 'anthropic-dangerous-direct-browser-access': 'true' }),
    capturingFetch,
    getEnv,
  )
  assertEquals(capturedHeaders['anthropic-dangerous-direct-browser-access'], undefined)
})

// ─── Upstream errors ──────────────────────────────────────────────────────────

Deno.test('forwards non-200 status from Claude API', async () => {
  const res = await handleRequest(makeRequest(), mockFetch('{"error":"rate limited"}', 429), getEnv)
  assertEquals(res.status, 429)
})

Deno.test('returns 502 when upstream fetch throws', async () => {
  const failFetch: typeof fetch = async () => { throw new Error('network error') }
  const res = await handleRequest(makeRequest(), failFetch, getEnv)
  assertEquals(res.status, 502)
})

// ─── CORS on all responses ────────────────────────────────────────────────────

Deno.test('all responses include CORS allow-origin header', async () => {
  const responses = await Promise.all([
    handleRequest(new Request('https://proxy.test', { method: 'GET' }), mockFetch(), getEnv),
    handleRequest(new Request('https://proxy.test', { method: 'POST', body: 'bad', headers: { 'Content-Type': 'application/json' } }), mockFetch(), getEnv),
    handleRequest(makeRequest(), mockFetch(), getEnv),
  ])
  for (const res of responses) {
    assertEquals(res.headers.get('access-control-allow-origin'), '*')
  }
})
