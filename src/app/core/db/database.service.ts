import Dexie, { type Table } from 'dexie'
import { Injectable } from '@angular/core'
import { Habit } from '../models/habit.model'
import { HabitEntry } from '../models/habit-entry.model'

@Injectable({ providedIn: 'root' })
export class DatabaseService extends Dexie {
  habits!: Table<Habit, number>
  entries!: Table<HabitEntry, number>

  constructor() {
    super('PersonalitySuiteDB')
    this.version(1).stores({
      habits: '++id, name, type, dimensionPrimary, dimensionSecondary, createdAt, archivedAt',
      entries: '++id, habitId, date, completed, createdAt',
    })
  }
}
