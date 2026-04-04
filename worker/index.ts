interface Env {
  DB: D1Database
  ASSETS: Fetcher
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  JWT_SECRET: string
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

const enc = new TextEncoder()

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function b64urlEncode(str: string): string {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function b64urlDecode(str: string): string {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
}

async function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage])
}

async function createJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64urlEncode(JSON.stringify(payload))
  const data = `${header}.${body}`
  const key = await hmacKey(secret, 'sign')
  const sig = b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
  return `${data}.${sig}`
}

async function verifyJWT(token: string, secret: string): Promise<{ sub: string; email: string } | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const key = await hmacKey(secret, 'verify')
  const sigBytes = Uint8Array.from(b64urlDecode(sig), c => c.charCodeAt(0))
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${header}.${body}`))
  if (!valid) return null
  const payload = JSON.parse(b64urlDecode(body))
  if (payload.exp && payload.exp < Date.now() / 1000) return null
  return payload
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function authenticate(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const payload = await verifyJWT(auth.slice(7), env.JWT_SECRET)
  return payload?.sub ?? null
}

// ─── Sync types ───────────────────────────────────────────────────────────────

interface SyncHabitRow {
  id: string
  name: string
  type: 'binary' | 'quantity' | 'time'
  unit?: string | null
  target_value?: number | null
  dimension_primary?: string | null
  dimension_secondary?: string | null
  archived_at?: string | null
  updated_at: string
  deleted_at?: string | null
}

interface SyncEntryRow {
  id: string
  habit_id: string
  date: string
  completed: number | boolean
  value?: number | null
  updated_at: string
  deleted_at?: string | null
}

interface SyncTemplateRow {
  id: string
  name: string
  description?: string | null
  habit_name: string
  habit_type: 'binary' | 'quantity' | 'time'
  habit_unit?: string | null
  habit_target_value?: number | null
  habit_dimension_primary?: string | null
  habit_dimension_secondary?: string | null
  updated_at: string
  deleted_at?: string | null
}

interface SyncPushPayload {
  habits?: SyncHabitRow[]
  entries?: SyncEntryRow[]
  templates?: SyncTemplateRow[]
}

interface SyncPullPayload {
  since?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const json = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...init.headers },
  })

async function ensureUser(env: Env, userId: string): Promise<void> {
  await env.DB.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').bind(userId).run()
}

// ─── Sync handlers ────────────────────────────────────────────────────────────

async function handleSyncPull(request: Request, env: Env, userId: string): Promise<Response> {
  const payload = (await request.json()) as SyncPullPayload
  const since = payload?.since && payload.since.trim().length > 0 ? payload.since : '1970-01-01T00:00:00.000Z'

  const [habits, entries, templates] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, type, unit, target_value, dimension_primary, dimension_secondary,
              archived_at, updated_at, deleted_at
       FROM habits WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC`
    ).bind(userId, since).all<SyncHabitRow>(),
    env.DB.prepare(
      `SELECT id, habit_id, date, completed, value, updated_at, deleted_at
       FROM habit_entries WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC`
    ).bind(userId, since).all<SyncEntryRow>(),
    env.DB.prepare(
      `SELECT id, name, description, habit_name, habit_type, habit_unit,
              habit_target_value, habit_dimension_primary, habit_dimension_secondary,
              updated_at, deleted_at
       FROM custom_templates WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC`
    ).bind(userId, since).all<SyncTemplateRow>(),
  ])

  return json({
    server_time: new Date().toISOString(),
    habits: habits.results ?? [],
    entries: entries.results ?? [],
    templates: templates.results ?? [],
  })
}

async function upsertHabit(env: Env, userId: string, row: SyncHabitRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO habits (id, user_id, name, type, unit, target_value, dimension_primary,
       dimension_secondary, archived_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id, name = excluded.name, type = excluded.type,
       unit = excluded.unit, target_value = excluded.target_value,
       dimension_primary = excluded.dimension_primary,
       dimension_secondary = excluded.dimension_secondary,
       archived_at = excluded.archived_at, updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at
     WHERE excluded.updated_at > habits.updated_at`
  ).bind(
    row.id, userId, row.name, row.type, row.unit ?? null, row.target_value ?? null,
    row.dimension_primary ?? null, row.dimension_secondary ?? null,
    row.archived_at ?? null, row.updated_at, row.deleted_at ?? null,
  ).run()
}

async function upsertEntry(env: Env, userId: string, row: SyncEntryRow): Promise<void> {
  const completed = typeof row.completed === 'boolean' ? Number(row.completed) : row.completed
  await env.DB.prepare(
    `INSERT INTO habit_entries (id, user_id, habit_id, date, completed, value, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id, habit_id = excluded.habit_id, date = excluded.date,
       completed = excluded.completed, value = excluded.value,
       updated_at = excluded.updated_at, deleted_at = excluded.deleted_at
     WHERE excluded.updated_at > habit_entries.updated_at`
  ).bind(
    row.id, userId, row.habit_id, row.date, completed,
    row.value ?? null, row.updated_at, row.deleted_at ?? null,
  ).run()
}

async function upsertTemplate(env: Env, userId: string, row: SyncTemplateRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO custom_templates (id, user_id, name, description, habit_name, habit_type,
       habit_unit, habit_target_value, habit_dimension_primary,
       habit_dimension_secondary, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id, name = excluded.name, description = excluded.description,
       habit_name = excluded.habit_name, habit_type = excluded.habit_type,
       habit_unit = excluded.habit_unit, habit_target_value = excluded.habit_target_value,
       habit_dimension_primary = excluded.habit_dimension_primary,
       habit_dimension_secondary = excluded.habit_dimension_secondary,
       updated_at = excluded.updated_at, deleted_at = excluded.deleted_at
     WHERE excluded.updated_at > custom_templates.updated_at`
  ).bind(
    row.id, userId, row.name, row.description ?? null, row.habit_name, row.habit_type,
    row.habit_unit ?? null, row.habit_target_value ?? null,
    row.habit_dimension_primary ?? null, row.habit_dimension_secondary ?? null,
    row.updated_at, row.deleted_at ?? null,
  ).run()
}

async function handleSyncPush(request: Request, env: Env, userId: string): Promise<Response> {
  const payload = (await request.json()) as SyncPushPayload
  for (const row of payload.habits ?? []) await upsertHabit(env, userId, row)
  for (const row of payload.entries ?? []) await upsertEntry(env, userId, row)
  for (const row of payload.templates ?? []) await upsertTemplate(env, userId, row)
  return json({
    ok: true,
    server_time: new Date().toISOString(),
    counts: {
      habits: payload.habits?.length ?? 0,
      entries: payload.entries?.length ?? 0,
      templates: payload.templates?.length ?? 0,
    },
  })
}

// ─── Auth handlers ────────────────────────────────────────────────────────────

function handleAuthLogin(request: Request, env: Env): Response {
  const origin = new URL(request.url).origin
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  })
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302)
}

async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (!code) return Response.redirect('/?auth_error=no_code', 302)

  const redirectUri = `${url.origin}/api/auth/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return Response.redirect('/?auth_error=token_exchange', 302)
  const tokens = await tokenRes.json() as { access_token: string }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!userRes.ok) return Response.redirect('/?auth_error=user_info', 302)
  const googleUser = await userRes.json() as { id: string; email: string; name: string }

  const row = await env.DB.prepare(
    `INSERT INTO users (id, email, google_id) VALUES (?, ?, ?)
     ON CONFLICT(google_id) DO UPDATE SET email = excluded.email
     RETURNING id`
  ).bind(crypto.randomUUID(), googleUser.email, googleUser.id).first<{ id: string }>()

  if (!row?.id) return Response.redirect('/?auth_error=db', 302)

  const token = await createJWT(
    { sub: row.id, email: googleUser.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 },
    env.JWT_SECRET,
  )

  return Response.redirect(`/?token=${token}`, 302)
}

async function handleAuthMe(request: Request, env: Env): Promise<Response> {
  const userId = await authenticate(request, env)
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 })
  const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first<{ id: string; email: string }>()
  if (!user) return json({ error: 'User not found' }, { status: 404 })
  return json(user)
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type,authorization',
        },
      })
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, service: 'sync-api' })
    }

    if (url.pathname === '/api/auth/login' && request.method === 'GET') {
      return handleAuthLogin(request, env)
    }

    if (url.pathname === '/api/auth/callback' && request.method === 'GET') {
      return handleAuthCallback(request, env)
    }

    if (url.pathname === '/api/auth/me' && request.method === 'GET') {
      return handleAuthMe(request, env)
    }

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    const userId = await authenticate(request, env)
    if (!userId) return json({ error: 'Unauthorized' }, { status: 401 })

    await ensureUser(env, userId)

    if (url.pathname === '/api/sync/pull' && request.method === 'POST') {
      return handleSyncPull(request, env, userId)
    }

    if (url.pathname === '/api/sync/push' && request.method === 'POST') {
      return handleSyncPush(request, env, userId)
    }

    return new Response('Not found', { status: 404 })
  },
}
