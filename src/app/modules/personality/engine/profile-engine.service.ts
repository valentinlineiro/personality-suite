import { Injectable } from '@angular/core'
import { DatabaseService } from '../../../core/db/database.service'
import { HabitsService } from '../../habits/services/habits.service'
import { DimensionId } from '../../../core/models/habit.model'
import { HabitEntry } from '../../../core/models/habit-entry.model'
import { DIMENSIONS } from '../constants/dimensions'
import { toDateString, addDays } from '../../../core/utils/date.utils'

export interface DimensionScore {
  dimensionId: DimensionId
  score: number | null
  habitsCount: number
}

export interface PersonalityProfile {
  period: { days: number; from: Date; to: Date }
  scores: DimensionScore[]
  dominantDimension: DimensionId | null
  neglectedDimension: DimensionId | null
  totalHabitsTagged: number
  totalHabitsUntagged: number
}

@Injectable({ providedIn: 'root' })
export class ProfileEngineService {
  constructor(
    private db: DatabaseService,
    private habitsService: HabitsService,
  ) {}

  async computeProfile(days: number): Promise<PersonalityProfile> {
    const to = new Date()
    const from = addDays(to, -(days - 1))
    const fromStr = toDateString(from)
    const toStr = toDateString(to)

    const habits = await this.habitsService.getActiveHabits()

    // Batch-load all entries for the period in one query
    const allEntries = await this.db.entries
      .where('date')
      .between(fromStr, toStr, true, true)
      .toArray()

    // Group entries by habitId
    const entriesByHabit = new Map<number, HabitEntry[]>()
    for (const e of allEntries) {
      if (!entriesByHabit.has(e.habitId)) entriesByHabit.set(e.habitId, [])
      entriesByHabit.get(e.habitId)!.push(e)
    }

    const totalHabitsTagged = habits.filter(h => h.dimensionPrimary !== null).length
    const totalHabitsUntagged = habits.filter(h => h.dimensionPrimary === null).length

    const scores: DimensionScore[] = DIMENSIONS.map(dim => {
      const primary = habits.filter(h => h.dimensionPrimary === dim.id)
      const secondary = habits.filter(h => h.dimensionSecondary === dim.id)

      if (primary.length === 0 && secondary.length === 0) {
        return { dimensionId: dim.id, score: null, habitsCount: 0 }
      }

      const weightedSum = [
        ...primary.map(h => ({ habit: h, weight: 1.0 })),
        ...secondary.map(h => ({ habit: h, weight: 0.5 })),
      ]

      let totalWeight = 0
      let weightedAdherence = 0

      for (const { habit, weight } of weightedSum) {
        const entries = entriesByHabit.get(habit.id!) ?? []
        const completed = entries.filter(e => {
          if (habit.type === 'binary') return e.completed
          return (e.value ?? 0) >= (habit.targetValue ?? 1)
        }).length
        const adherence = (completed / days) * 100
        weightedAdherence += adherence * weight
        totalWeight += weight
      }

      const score = totalWeight > 0 ? Math.round(weightedAdherence / totalWeight) : null

      return {
        dimensionId: dim.id,
        score,
        habitsCount: primary.length + secondary.length,
      }
    })

    const nonNullScores = scores.filter(s => s.score !== null)
    const dominantDimension = nonNullScores.length > 0
      ? nonNullScores.reduce((a, b) => (a.score! > b.score! ? a : b)).dimensionId
      : null

    const neglectedCandidates = nonNullScores.filter(s => s.score! < 20)
    const neglectedDimension = neglectedCandidates.length > 0
      ? neglectedCandidates.reduce((a, b) => (a.score! < b.score! ? a : b)).dimensionId
      : null

    return {
      period: { days, from, to },
      scores,
      dominantDimension,
      neglectedDimension,
      totalHabitsTagged,
      totalHabitsUntagged,
    }
  }
}
