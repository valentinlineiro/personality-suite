import { Injectable } from '@angular/core'
import { DatabaseService } from '../db/database.service'
import { Habit, DimensionId } from '../models/habit.model'
import { HabitEntry } from '../models/habit-entry.model'
import { StoredCustomTemplate } from '../../modules/habits/models/habit-template.model'

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

interface SyncPullResponse {
  server_time: string
  habits: SyncHabitRow[]
  entries: SyncEntryRow[]
  templates: SyncTemplateRow[]
}

function toHabitRow(h: Habit): SyncHabitRow {
  return {
    id: h.syncId!,
    name: h.name,
    type: h.type,
    unit: h.unit ?? null,
    target_value: h.targetValue ?? null,
    dimension_primary: h.dimensionPrimary,
    dimension_secondary: h.dimensionSecondary,
    archived_at: h.archivedAt?.toISOString() ?? null,
    updated_at: h.updatedAt.toISOString(),
    deleted_at: h.deletedAt?.toISOString() ?? null,
  }
}

function toEntryRow(e: HabitEntry): SyncEntryRow {
  return {
    id: e.syncId!,
    habit_id: e.syncHabitId!,
    date: e.date,
    completed: e.completed ? 1 : 0,
    value: e.value ?? null,
    updated_at: e.updatedAt.toISOString(),
    deleted_at: e.deletedAt?.toISOString() ?? null,
  }
}

function toTemplateRow(t: StoredCustomTemplate): SyncTemplateRow {
  return {
    id: t.syncId!,
    name: t.name,
    description: t.description ?? null,
    habit_name: t.habit.name,
    habit_type: t.habit.type,
    habit_unit: t.habit.unit ?? null,
    habit_target_value: t.habit.targetValue ?? null,
    habit_dimension_primary: t.habit.dimensionPrimary,
    habit_dimension_secondary: t.habit.dimensionSecondary,
    updated_at: t.updatedAt.toISOString(),
    deleted_at: t.deletedAt?.toISOString() ?? null,
  }
}

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly USER_ID_KEY = 'ps_user_id'
  private readonly LAST_PULL_KEY = 'ps_last_pull'
  private readonly LAST_PUSH_KEY = 'ps_last_push'

  private pushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private db: DatabaseService) {}

  get userId(): string {
    let id = localStorage.getItem(this.USER_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(this.USER_ID_KEY, id)
    }
    return id
  }

  private get lastPullAt(): string {
    return localStorage.getItem(this.LAST_PULL_KEY) ?? '1970-01-01T00:00:00.000Z'
  }

  private get lastPushAt(): Date {
    const stored = localStorage.getItem(this.LAST_PUSH_KEY)
    return stored ? new Date(stored) : new Date(0)
  }

  /** Fire-and-forget push with 500ms debounce so rapid mutations coalesce. */
  push(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer)
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null
      this.doPush()
    }, 500)
  }

  async pull(): Promise<void> {
    try {
      const res = await fetch('/api/sync/pull', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': this.userId },
        body: JSON.stringify({ since: this.lastPullAt }),
      })
      if (!res.ok) return
      const data = await res.json() as SyncPullResponse
      await this.mergePull(data)
      localStorage.setItem(this.LAST_PULL_KEY, data.server_time)
    } catch {
      // offline — continue with local data
    }
  }

  private async doPush(): Promise<void> {
    const since = this.lastPushAt
    try {
      const [habits, entries, templates] = await Promise.all([
        this.db.habits.where('updatedAt').above(since).toArray(),
        this.db.entries.where('updatedAt').above(since).toArray(),
        this.db.customTemplates.where('updatedAt').above(since).toArray(),
      ])

      const payload = {
        habits: habits.filter(h => h.syncId).map(toHabitRow),
        entries: entries.filter(e => e.syncId && e.syncHabitId).map(toEntryRow),
        templates: templates.filter(t => t.syncId).map(toTemplateRow),
      }

      if (!payload.habits.length && !payload.entries.length && !payload.templates.length) return

      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-user-id': this.userId },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        localStorage.setItem(this.LAST_PUSH_KEY, new Date().toISOString())
      }
    } catch {
      // offline — will retry on next mutation
    }
  }

  private async mergePull(data: SyncPullResponse): Promise<void> {
    for (const row of data.habits) {
      const existing = await this.db.habits.where('syncId').equals(row.id).first()
      const serverUpdatedAt = row.updated_at
      if (existing?.id != null) {
        const localUpdatedAt = existing.updatedAt?.toISOString() ?? '1970-01-01T00:00:00.000Z'
        if (serverUpdatedAt > localUpdatedAt) {
          await this.db.habits.update(existing.id, {
            name: row.name,
            type: row.type,
            unit: row.unit ?? undefined,
            targetValue: row.target_value ?? undefined,
            dimensionPrimary: (row.dimension_primary as DimensionId) ?? null,
            dimensionSecondary: (row.dimension_secondary as DimensionId) ?? null,
            archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
            updatedAt: new Date(serverUpdatedAt),
            deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
          })
        }
      } else if (!row.deleted_at) {
        await this.db.habits.add({
          syncId: row.id,
          name: row.name,
          type: row.type,
          unit: row.unit ?? undefined,
          targetValue: row.target_value ?? undefined,
          dimensionPrimary: (row.dimension_primary as DimensionId) ?? null,
          dimensionSecondary: (row.dimension_secondary as DimensionId) ?? null,
          archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
          createdAt: new Date(serverUpdatedAt),
          updatedAt: new Date(serverUpdatedAt),
        })
      }
    }

    for (const row of data.entries) {
      const habit = await this.db.habits.where('syncId').equals(row.habit_id).first()
      if (!habit?.id) continue

      const serverUpdatedAt = row.updated_at
      const existing = await this.db.entries.where('syncId').equals(row.id).first()
      if (existing?.id != null) {
        const localUpdatedAt = existing.updatedAt?.toISOString() ?? '1970-01-01T00:00:00.000Z'
        if (serverUpdatedAt > localUpdatedAt) {
          await this.db.entries.update(existing.id, {
            completed: Boolean(row.completed),
            value: row.value ?? undefined,
            updatedAt: new Date(serverUpdatedAt),
            deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
          })
        }
      } else if (!row.deleted_at) {
        await this.db.entries.add({
          syncId: row.id,
          syncHabitId: row.habit_id,
          habitId: habit.id,
          date: row.date,
          completed: Boolean(row.completed),
          value: row.value ?? undefined,
          createdAt: new Date(serverUpdatedAt),
          updatedAt: new Date(serverUpdatedAt),
        })
      }
    }

    for (const row of data.templates) {
      const serverUpdatedAt = row.updated_at
      const existing = await this.db.customTemplates.where('syncId').equals(row.id).first()
      if (existing?.id != null) {
        const localUpdatedAt = existing.updatedAt?.toISOString() ?? '1970-01-01T00:00:00.000Z'
        if (serverUpdatedAt > localUpdatedAt) {
          await this.db.customTemplates.update(existing.id, {
            name: row.name,
            description: row.description ?? undefined,
            updatedAt: new Date(serverUpdatedAt),
            deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
            habit: {
              name: row.habit_name,
              type: row.habit_type,
              unit: row.habit_unit ?? undefined,
              targetValue: row.habit_target_value ?? undefined,
              dimensionPrimary: row.habit_dimension_primary as DimensionId,
              dimensionSecondary: (row.habit_dimension_secondary as DimensionId) ?? null,
            },
          })
        }
      } else if (!row.deleted_at) {
        await this.db.customTemplates.add({
          syncId: row.id,
          name: row.name,
          description: row.description ?? undefined,
          createdAt: new Date(serverUpdatedAt),
          updatedAt: new Date(serverUpdatedAt),
          habit: {
            name: row.habit_name,
            type: row.habit_type,
            unit: row.habit_unit ?? undefined,
            targetValue: row.habit_target_value ?? undefined,
            dimensionPrimary: row.habit_dimension_primary as DimensionId,
            dimensionSecondary: (row.habit_dimension_secondary as DimensionId) ?? null,
          },
        })
      }
    }
  }
}
