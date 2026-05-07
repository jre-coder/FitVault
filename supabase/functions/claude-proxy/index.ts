// FitVault — Claude API proxy
// Keeps the Anthropic API key server-side, away from the mobile app bundle.
// Deploy: supabase functions deploy claude-proxy
// Secret:  supabase secrets set CLAUDE_API_KEY=sk-ant-...

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, anthropic-version, anthropic-beta',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

type EnvGetter = (key: string) => string | undefined

// handleRequest is exported so it can be unit-tested without starting a server.
// In production Deno.serve calls it directly.
export async function handleRequest(
  req: Request,
  fetchImpl: typeof fetch = fetch,
  getEnv: EnvGetter = (k) => Deno.env.get(k),
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const apiKey = getEnv('CLAUDE_API_KEY')
  if (!apiKey) {
    return jsonResponse({ error: 'Server misconfiguration: CLAUDE_API_KEY not set' }, 500)
  }

  let bodyText: string
  try {
    bodyText = await req.text()
    JSON.parse(bodyText) // validate parseable before forwarding
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': req.headers.get('anthropic-version') ?? '2023-06-01',
  }
  const beta = req.headers.get('anthropic-beta')
  if (beta) upstreamHeaders['anthropic-beta'] = beta

  let upstream: Response
  try {
    upstream = await fetchImpl(CLAUDE_API_URL, {
      method: 'POST',
      headers: upstreamHeaders,
      body: bodyText,
    })
  } catch {
    return jsonResponse({ error: 'Failed to reach upstream API' }, 502)
  }

  const responseText = await upstream.text()
  return new Response(responseText, {
    status: upstream.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

if (import.meta.main) {
  Deno.serve((req) => handleRequest(req))
}
