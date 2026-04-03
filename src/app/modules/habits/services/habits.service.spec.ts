import { HabitsService } from './habits.service'
import { HabitEntry } from '../../../core/models/habit-entry.model'

describe('HabitsService upsertEntry', () => {
  it('uses compound [habitId+date] lookup and updates existing entries', async () => {
    const first = vi.fn().mockResolvedValue({
      id: 42,
      habitId: 1,
      date: '2026-04-03',
      completed: false,
      createdAt: new Date('2026-04-03T08:00:00.000Z'),
    } as HabitEntry)
    const equals = vi.fn().mockReturnValue({ first })
    const where = vi.fn().mockReturnValue({ equals })
    const update = vi.fn().mockResolvedValue(undefined)
    const add = vi.fn().mockResolvedValue(43)

    const service = new HabitsService({
      entries: { where, update, add },
    } as any)

    await service.upsertEntry(1, '2026-04-03', { completed: true })

    expect(where).toHaveBeenCalledWith('[habitId+date]')
    expect(equals).toHaveBeenCalledWith([1, '2026-04-03'])
    expect(update).toHaveBeenCalledWith(42, { completed: true })
    expect(add).not.toHaveBeenCalled()
  })

  it('adds a new entry when no habit/day entry exists', async () => {
    const first = vi.fn().mockResolvedValue(undefined)
    const equals = vi.fn().mockReturnValue({ first })
    const where = vi.fn().mockReturnValue({ equals })
    const update = vi.fn().mockResolvedValue(undefined)
    const add = vi.fn().mockResolvedValue(99)

    const service = new HabitsService({
      entries: { where, update, add },
    } as any)

    await service.upsertEntry(7, '2026-04-04', { value: 3, completed: true })

    expect(where).toHaveBeenCalledWith('[habitId+date]')
    expect(equals).toHaveBeenCalledWith([7, '2026-04-04'])
    expect(update).not.toHaveBeenCalled()
    expect(add).toHaveBeenCalledTimes(1)
    const addedRow = add.mock.calls[0][0] as HabitEntry
    expect(addedRow.habitId).toBe(7)
    expect(addedRow.date).toBe('2026-04-04')
    expect(addedRow.completed).toBe(true)
    expect(addedRow.value).toBe(3)
    expect(addedRow.createdAt).toBeInstanceOf(Date)
  })
})
