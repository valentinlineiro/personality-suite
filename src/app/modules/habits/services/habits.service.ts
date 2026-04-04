import { Injectable } from '@angular/core'
import { DatabaseService } from '../../../core/db/database.service'
import { Habit } from '../../../core/models/habit.model'
import { HabitEntry } from '../../../core/models/habit-entry.model'
import { SyncService } from '../../../core/sync/sync.service'
import { toDateString } from '../../../core/utils/date.utils'

@Injectable({ providedIn: 'root' })
export class HabitsService {
  constructor(
    private db: DatabaseService,
    private sync: SyncService,
  ) {}

  getActiveHabits(): Promise<Habit[]> {
    return this.db.habits.filter(h => !h.archivedAt && !h.deletedAt).toArray()
  }

  getArchivedHabits(): Promise<Habit[]> {
    return this.db.habits.filter(h => !!h.archivedAt && !h.deletedAt).toArray()
  }

  getHabitById(id: number): Promise<Habit | undefined> {
    return this.db.habits.get(id)
  }

  async createHabit(data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date()
    const id = await this.db.habits.add({ ...data, syncId: crypto.randomUUID(), createdAt: now, updatedAt: now })
    this.sync.push()
    return id
  }

  async updateHabit(id: number, data: Partial<Habit>): Promise<void> {
    await this.db.habits.update(id, { ...data, updatedAt: new Date() })
    this.sync.push()
  }

  async archiveHabit(id: number): Promise<void> {
    await this.updateHabit(id, { archivedAt: new Date() })
  }

  async deleteHabit(id: number): Promise<void> {
    const now = new Date()
    await this.db.transaction('rw', this.db.habits, this.db.entries, async () => {
      await this.db.habits.update(id, { deletedAt: now, updatedAt: now })
      const entries = await this.db.entries.where('habitId').equals(id).toArray()
      for (const entry of entries) {
        if (entry.id != null) {
          await this.db.entries.update(entry.id, { deletedAt: now, updatedAt: now })
        }
      }
    })
    this.sync.push()
  }

  getTodayEntries(date: string): Promise<HabitEntry[]> {
    return this.db.entries.where('date').equals(date).filter(e => !e.deletedAt).toArray()
  }

  getEntriesForPeriod(habitId: number, from: string, to: string): Promise<HabitEntry[]> {
    return this.db.entries
      .where('date')
      .between(from, to, true, true)
      .filter(e => e.habitId === habitId && !e.deletedAt)
      .toArray()
  }

  async getEntriesForHabitsInPeriod(
    habitIds: number[],
    from: string,
    to: string,
  ): Promise<HabitEntry[]> {
    if (habitIds.length === 0) return []
    const idSet = new Set(habitIds)
    return this.db.entries
      .where('date')
      .between(from, to, true, true)
      .filter(e => idSet.has(e.habitId) && !e.deletedAt)
      .toArray()
  }

  async upsertEntry(habitId: number, date: string, data: Partial<HabitEntry>): Promise<void> {
    const existing = await this.db.entries
      .where('[habitId+date]').equals([habitId, date])
      .first()

    if (existing?.id != null) {
      await this.db.entries.update(existing.id, { ...data, updatedAt: new Date() })
    } else {
      const habit = await this.db.habits.get(habitId)
      const now = new Date()
      await this.db.entries.add({
        habitId,
        date,
        completed: false,
        createdAt: now,
        updatedAt: now,
        syncId: crypto.randomUUID(),
        syncHabitId: habit?.syncId,
        ...data,
      })
    }
    this.sync.push()
  }

  async getStreaks(habits: Habit[]): Promise<Map<number, number>> {
    const habitsWithIds = habits.filter((h): h is Habit & { id: number } => h.id != null)
    if (habitsWithIds.length === 0) return new Map()

    const habitIds = habitsWithIds.map(h => h.id)
    const entries = await this.db.entries
      .where('habitId')
      .anyOf(habitIds)
      .filter(e => !e.deletedAt)
      .toArray()

    const entriesByHabit = new Map<number, HabitEntry[]>()
    for (const entry of entries) {
      const list = entriesByHabit.get(entry.habitId)
      if (list) list.push(entry)
      else entriesByHabit.set(entry.habitId, [entry])
    }

    const streaks = new Map<number, number>()
    for (const habit of habitsWithIds) {
      streaks.set(habit.id, this.calculateStreak(habit, entriesByHabit.get(habit.id) ?? []))
    }
    return streaks
  }

  async getStreak(habit: Habit): Promise<number> {
    if (habit.id == null) return 0
    const entries = await this.db.entries
      .where('habitId').equals(habit.id)
      .filter(e => !e.deletedAt)
      .toArray()
    return this.calculateStreak(habit, entries)
  }

  private calculateStreak(habit: Habit, entries: HabitEntry[]): number {
    const today = toDateString(new Date())
    const entryMap = new Map<string, HabitEntry>()
    for (const entry of entries) entryMap.set(entry.date, entry)

    const isCompleted = (entry: HabitEntry | undefined): boolean => {
      if (!entry) return false
      if (habit.type === 'binary') return entry.completed
      return (entry.value ?? 0) >= (habit.targetValue ?? 1)
    }

    // Start from today if completed, otherwise from yesterday.
    const startFromToday = isCompleted(entryMap.get(today))
    let streak = 0
    const d = new Date()
    if (!startFromToday) d.setDate(d.getDate() - 1)

    for (let i = 0; i < 365; i++) {
      const dateString = toDateString(d)
      if (!isCompleted(entryMap.get(dateString))) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }
}
