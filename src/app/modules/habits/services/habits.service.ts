import { Injectable } from '@angular/core'
import { DatabaseService } from '../../../core/db/database.service'
import { Habit } from '../../../core/models/habit.model'
import { HabitEntry } from '../../../core/models/habit-entry.model'
import { toDateString } from '../../../core/utils/date.utils'

@Injectable({ providedIn: 'root' })
export class HabitsService {
  constructor(private db: DatabaseService) {}

  getActiveHabits(): Promise<Habit[]> {
    return this.db.habits.filter(h => !h.archivedAt).toArray()
  }

  getArchivedHabits(): Promise<Habit[]> {
    return this.db.habits.filter(h => !!h.archivedAt).toArray()
  }

  getHabitById(id: number): Promise<Habit | undefined> {
    return this.db.habits.get(id)
  }

  createHabit(data: Omit<Habit, 'id' | 'createdAt'>): Promise<number> {
    return this.db.habits.add({ ...data, createdAt: new Date() })
  }

  async updateHabit(id: number, data: Partial<Habit>): Promise<void> {
    await this.db.habits.update(id, data)
  }

  async archiveHabit(id: number): Promise<void> {
    await this.updateHabit(id, { archivedAt: new Date() })
  }

  async deleteHabit(id: number): Promise<void> {
    await this.db.transaction('rw', this.db.habits, this.db.entries, async () => {
      await this.db.entries.where('habitId').equals(id).delete()
      await this.db.habits.delete(id)
    })
  }

  getTodayEntries(date: string): Promise<HabitEntry[]> {
    return this.db.entries.where('date').equals(date).toArray()
  }

  getEntriesForPeriod(habitId: number, from: string, to: string): Promise<HabitEntry[]> {
    return this.db.entries
      .where('date')
      .between(from, to, true, true)
      .filter(e => e.habitId === habitId)
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
      .filter(e => idSet.has(e.habitId))
      .toArray()
  }

  async upsertEntry(habitId: number, date: string, data: Partial<HabitEntry>): Promise<void> {
    const existing = await this.db.entries
      .where('[habitId+date]').equals([habitId, date])
      .first()

    if (existing?.id != null) {
      await this.db.entries.update(existing.id, data)
    } else {
      await this.db.entries.add({
        habitId,
        date,
        completed: false,
        createdAt: new Date(),
        ...data,
      })
    }
  }

  async getStreaks(habits: Habit[]): Promise<Map<number, number>> {
    const habitsWithIds = habits.filter((h): h is Habit & { id: number } => h.id != null)
    if (habitsWithIds.length === 0) return new Map()

    const habitIds = habitsWithIds.map(h => h.id)
    const entries = await this.db.entries
      .where('habitId')
      .anyOf(habitIds)
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
    const entries = await this.db.entries.where('habitId').equals(habit.id).toArray()
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
