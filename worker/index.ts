interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

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

const json = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })

function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id')
}

async function ensureUser(env: Env, userId: string): Promise<void> {
  await env.DB
    .prepare('INSERT OR IGNORE INTO users (id) VALUES (?)')
    .bind(userId)
    .run()
}

async function handleSyncPull(request: Request, env: Env, userId: string): Promise<Response> {
  const payload = (await request.json()) as SyncPullPayload
  const since = payload?.since && payload.since.trim().length > 0 ? payload.since : '1970-01-01T00:00:00.000Z'

  const [habits, entries, templates] = await Promise.all([
    env.DB.prepare(
      `SELECT id, name, type, unit, target_value, dimension_primary, dimension_secondary,
              archived_at, updated_at, deleted_at
       FROM habits
       WHERE user_id = ? AND updated_at > ?
       ORDER BY updated_at ASC`
    ).bind(userId, since).all<SyncHabitRow>(),
    env.DB.prepare(
      `SELECT id, habit_id, date, completed, value, updated_at, deleted_at
       FROM habit_entries
       WHERE user_id = ? AND updated_at > ?
       ORDER BY updated_at ASC`
    ).bind(userId, since).all<SyncEntryRow>(),
    env.DB.prepare(
      `SELECT id, name, description, habit_name, habit_type, habit_unit,
              habit_target_value, habit_dimension_primary, habit_dimension_secondary,
              updated_at, deleted_at
       FROM custom_templates
       WHERE user_id = ? AND updated_at > ?
       ORDER BY updated_at ASC`
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
    `INSERT INTO habits (
      id, user_id, name, type, unit, target_value, dimension_primary,
      dimension_secondary, archived_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      name = excluded.name,
      type = excluded.type,
      unit = excluded.unit,
      target_value = excluded.target_value,
      dimension_primary = excluded.dimension_primary,
      dimension_secondary = excluded.dimension_secondary,
      archived_at = excluded.archived_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
    WHERE excluded.updated_at > habits.updated_at`
  )
    .bind(
      row.id,
      userId,
      row.name,
      row.type,
      row.unit ?? null,
      row.target_value ?? null,
      row.dimension_primary ?? null,
      row.dimension_secondary ?? null,
      row.archived_at ?? null,
      row.updated_at,
      row.deleted_at ?? null,
    )
    .run()
}

async function upsertEntry(env: Env, userId: string, row: SyncEntryRow): Promise<void> {
  const completed = typeof row.completed === 'boolean' ? Number(row.completed) : row.completed

  await env.DB.prepare(
    `INSERT INTO habit_entries (
      id, user_id, habit_id, date, completed, value, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      habit_id = excluded.habit_id,
      date = excluded.date,
      completed = excluded.completed,
      value = excluded.value,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
    WHERE excluded.updated_at > habit_entries.updated_at`
  )
    .bind(
      row.id,
      userId,
      row.habit_id,
      row.date,
      completed,
      row.value ?? null,
      row.updated_at,
      row.deleted_at ?? null,
    )
    .run()
}

async function upsertTemplate(env: Env, userId: string, row: SyncTemplateRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO custom_templates (
      id, user_id, name, description, habit_name, habit_type,
      habit_unit, habit_target_value, habit_dimension_primary,
      habit_dimension_secondary, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      name = excluded.name,
      description = excluded.description,
      habit_name = excluded.habit_name,
      habit_type = excluded.habit_type,
      habit_unit = excluded.habit_unit,
      habit_target_value = excluded.habit_target_value,
      habit_dimension_primary = excluded.habit_dimension_primary,
      habit_dimension_secondary = excluded.habit_dimension_secondary,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at
    WHERE excluded.updated_at > custom_templates.updated_at`
  )
    .bind(
      row.id,
      userId,
      row.name,
      row.description ?? null,
      row.habit_name,
      row.habit_type,
      row.habit_unit ?? null,
      row.habit_target_value ?? null,
      row.habit_dimension_primary ?? null,
      row.habit_dimension_secondary ?? null,
      row.updated_at,
      row.deleted_at ?? null,
    )
    .run()
}

async function handleSyncPush(request: Request, env: Env, userId: string): Promise<Response> {
  const payload = (await request.json()) as SyncPushPayload

  for (const row of payload.habits ?? []) {
    await upsertHabit(env, userId, row)
  }

  for (const row of payload.entries ?? []) {
    await upsertEntry(env, userId, row)
  }

  for (const row of payload.templates ?? []) {
    await upsertTemplate(env, userId, row)
  }

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type,x-user-id',
        },
      })
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, service: 'sync-api' })
    }

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    const userId = getUserId(request)
    if (!userId) {
      return json({ error: 'Missing x-user-id header' }, { status: 401 })
    }

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
