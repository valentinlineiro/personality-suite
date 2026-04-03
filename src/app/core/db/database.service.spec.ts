import { HabitEntry } from '../models/habit-entry.model'
import { getEntryIdsToKeepForUniqueHabitDate } from './database.service'

describe('getEntryIdsToKeepForUniqueHabitDate', () => {
  it('keeps the most recent entry for duplicate habit/date keys', () => {
    const entries: HabitEntry[] = [
      { id: 1, habitId: 10, date: '2026-04-01', completed: false, createdAt: new Date('2026-04-01T08:00:00.000Z') },
      { id: 2, habitId: 10, date: '2026-04-01', completed: true, createdAt: new Date('2026-04-01T10:00:00.000Z') },
      { id: 3, habitId: 11, date: '2026-04-01', completed: true, createdAt: new Date('2026-04-01T09:00:00.000Z') },
    ]

    const idsToKeep = getEntryIdsToKeepForUniqueHabitDate(entries)

    expect(idsToKeep).toEqual(new Set([2, 3]))
  })

  it('breaks same-timestamp ties by keeping the highest id', () => {
    const timestamp = new Date('2026-04-02T09:00:00.000Z')
    const entries: HabitEntry[] = [
      { id: 4, habitId: 12, date: '2026-04-02', completed: true, createdAt: timestamp },
      { id: 5, habitId: 12, date: '2026-04-02', completed: false, createdAt: timestamp },
    ]

    const idsToKeep = getEntryIdsToKeepForUniqueHabitDate(entries)

    expect(idsToKeep).toEqual(new Set([5]))
  })
})
