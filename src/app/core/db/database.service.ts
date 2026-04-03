import Dexie, { type Table } from 'dexie'
import { Injectable } from '@angular/core'
import { Habit } from '../models/habit.model'
import { HabitEntry } from '../models/habit-entry.model'
import { StoredCustomTemplate } from '../../modules/habits/models/habit-template.model'

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
      customTemplates: '++id, name, createdAt',
    })
  }
}
