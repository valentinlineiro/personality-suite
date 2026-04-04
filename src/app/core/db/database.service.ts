import Dexie, { type Table } from 'dexie'
import { Injectable } from '@angular/core'
import { Habit } from '../models/habit.model'
import { HabitEntry } from '../models/habit-entry.model'
import { StoredCustomTemplate } from '../../modules/habits/models/habit-template.model'

function getEntryTimestamp(entry: HabitEntry): number {
  return entry.createdAt instanceof Date
    ? entry.createdAt.getTime()
    : new Date(entry.createdAt).getTime()
}

export function getEntryIdsToKeepForUniqueHabitDate(entries: HabitEntry[]): Set<number> {
  const bestIdByKey = new Map<string, number>()
  const bestEntryByKey = new Map<string, HabitEntry>()

  for (const entry of entries) {
    if (entry.id == null) continue
    const key = `${entry.habitId}|${entry.date}`
    const currentBest = bestEntryByKey.get(key)
    const currentBestId = bestIdByKey.get(key)

    if (!currentBest || currentBestId == null) {
      bestEntryByKey.set(key, entry)
      bestIdByKey.set(key, entry.id)
      continue
    }

    const incomingCreatedAt = getEntryTimestamp(entry)
    const bestCreatedAt = getEntryTimestamp(currentBest)
    const shouldReplace = incomingCreatedAt > bestCreatedAt
      || (incomingCreatedAt === bestCreatedAt && entry.id > currentBestId)

    if (shouldReplace) {
      bestEntryByKey.set(key, entry)
      bestIdByKey.set(key, entry.id)
    }
  }

  return new Set(bestIdByKey.values())
}

@Injectable({ providedIn: 'root' })
export class DatabaseService extends Dexie {
  habits!: Table<Habit, number>
  entries!: Table<HabitEntry, number>
  customTemplates!: Table<StoredCustomTemplate, number>

  constructor() {
    super('PersonalitySuiteDB')
    this.version(1).stores({
      habits: '++id, name, type, dimensionPrimary, dimensionSecondary, createdAt, archivedAt',
      entries: '++id, habitId, date, completed, createdAt',
    })
    this.version(2).stores({
      habits: '++id, name, type, dimensionPrimary, dimensionSecondary, createdAt, archivedAt',
      entries: '++id, habitId, date, completed, createdAt',
      customTemplates: '++id, name, createdAt',
    })
    this.version(3)
      .stores({
        habits: '++id, name, type, dimensionPrimary, dimensionSecondary, createdAt, archivedAt',
        entries: '++id, habitId, date, &[habitId+date], completed, createdAt',
        customTemplates: '++id, name, createdAt',
      })
      .upgrade(async tx => {
        const entriesTable = tx.table<HabitEntry, number>('entries')
        const entries = await entriesTable.toArray()
        const idsToKeep = getEntryIdsToKeepForUniqueHabitDate(entries)
        for (const entry of entries) {
          if (entry.id != null && !idsToKeep.has(entry.id)) {
            await entriesTable.delete(entry.id)
          }
        }
      })
    this.version(4)
      .stores({
        habits: '++id, syncId, name, type, dimensionPrimary, dimensionSecondary, createdAt, archivedAt',
        entries: '++id, syncId, syncHabitId, habitId, date, &[habitId+date], completed, createdAt',
        customTemplates: '++id, syncId, name, createdAt',
      })
      .upgrade(async tx => {
        const habitsTable = tx.table<Habit, number>('habits')
        const habits = await habitsTable.toArray()
        const habitSyncIdMap = new Map<number, string>()
        for (const habit of habits) {
          const syncId = habit.syncId ?? crypto.randomUUID()
          habitSyncIdMap.set(habit.id!, syncId)
          if (!habit.syncId) await habitsTable.update(habit.id!, { syncId })
        }

        const entriesTable = tx.table<HabitEntry, number>('entries')
        const entries = await entriesTable.toArray()
        for (const entry of entries) {
          const updates: Partial<HabitEntry> = {}
          if (!entry.syncId) updates.syncId = crypto.randomUUID()
          if (!entry.syncHabitId) updates.syncHabitId = habitSyncIdMap.get(entry.habitId)
          if (Object.keys(updates).length > 0) await entriesTable.update(entry.id!, updates)
        }

        const templatesTable = tx.table<StoredCustomTemplate, number>('customTemplates')
        const templates = await templatesTable.toArray()
        for (const template of templates) {
          if (!template.syncId) await templatesTable.update(template.id!, { syncId: crypto.randomUUID() })
        }
      })
    this.version(5)
      .stores({
        habits: '++id, syncId, updatedAt, name, type, dimensionPrimary, dimensionSecondary, createdAt, archivedAt',
        entries: '++id, syncId, syncHabitId, updatedAt, habitId, date, &[habitId+date], completed, createdAt',
        customTemplates: '++id, syncId, updatedAt, name, createdAt',
      })
      .upgrade(async tx => {
        const habitsTable = tx.table<Habit, number>('habits')
        for (const habit of await habitsTable.toArray()) {
          if (!habit.updatedAt) await habitsTable.update(habit.id!, { updatedAt: habit.createdAt })
        }

        const entriesTable = tx.table<HabitEntry, number>('entries')
        for (const entry of await entriesTable.toArray()) {
          if (!entry.updatedAt) await entriesTable.update(entry.id!, { updatedAt: entry.createdAt })
        }

        const templatesTable = tx.table<StoredCustomTemplate, number>('customTemplates')
        for (const template of await templatesTable.toArray()) {
          if (!template.updatedAt) await templatesTable.update(template.id!, { updatedAt: template.createdAt })
        }
      })
  }
}
