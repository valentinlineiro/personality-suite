import { ProfileEngineService } from './profile-engine.service'
import { Habit } from '../../../core/models/habit.model'
import { HabitEntry } from '../../../core/models/habit-entry.model'

const BASE_HABIT: Habit = {
  id: 1,
  name: 'Test Habit',
  type: 'binary',
  dimensionPrimary: 'vitality',
  dimensionSecondary: null,
  createdAt: new Date('2026-04-01T00:00:00.000Z'),
}

function createService(params: { habits: Habit[]; entries: HabitEntry[] }): ProfileEngineService {
  const toArray = vi.fn().mockResolvedValue(params.entries)
  const between = vi.fn().mockReturnValue({ toArray })
  const where = vi.fn().mockReturnValue({ between })
  const getActiveHabits = vi.fn().mockResolvedValue(params.habits)

  return new ProfileEngineService(
    { entries: { where } } as any,
    { getActiveHabits } as any,
  )
}

describe('ProfileEngineService confidence weighting', () => {
  it('pulls sparse low-data scores toward neutral', async () => {
    const service = createService({
      habits: [BASE_HABIT],
      entries: [
        {
          id: 1,
          habitId: 1,
          date: '2026-04-03',
          completed: false,
          createdAt: new Date('2026-04-03T10:00:00.000Z'),
        },
      ],
    })

    const profile = await service.computeProfile(7)
    const vitality = profile.scores.find(s => s.dimensionId === 'vitality')

    expect(vitality?.confidence).toBe(14)
    expect(vitality?.score).toBe(43)
  })

  it('uses full confidence when enough tracked days exist', async () => {
    const entries: HabitEntry[] = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      habitId: 1,
      date: `2026-04-0${i + 1}`,
      completed: false,
      createdAt: new Date(`2026-04-0${i + 1}T10:00:00.000Z`),
    }))

    const service = createService({
      habits: [BASE_HABIT],
      entries,
    })

    const profile = await service.computeProfile(7)
    const vitality = profile.scores.find(s => s.dimensionId === 'vitality')

    expect(vitality?.confidence).toBe(100)
    expect(vitality?.score).toBe(0)
  })
})
