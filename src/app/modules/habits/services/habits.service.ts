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

  async upsertEntry(habitId: number, date: string, data: Partial<HabitEntry>): Promise<void> {
    const existing = await this.db.entries
      .where('habitId').equals(habitId)
      .filter(e => e.date === date)
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

  async getStreak(habit: Habit): Promise<number> {
    const today = toDateString(new Date())
    const entries = await this.db.entries
      .where('habitId').equals(habit.id!)
      .toArray()

    const entryMap = new Map<string, HabitEntry>()
    for (const e of entries) entryMap.set(e.date, e)

    const isCompleted = (e: HabitEntry | undefined): boolean => {
      if (!e) return false
      if (habit.type === 'binary') return e.completed
      return (e.value ?? 0) >= (habit.targetValue ?? 1)
    }

    // Start from today if completed, otherwise from yesterday
    const todayEntry = entryMap.get(today)
    const startFromToday = isCompleted(todayEntry)

    let streak = 0
    const d = new Date()
    if (!startFromToday) d.setDate(d.getDate() - 1)

    for (let i = 0; i < 365; i++) {
      const ds = toDateString(d)
      if (!isCompleted(entryMap.get(ds))) break
      streak++
      d.setDate(d.getDate() - 1)
    }

    return streak
  }
}
