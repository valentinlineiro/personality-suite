import { HabitType, DimensionId } from '../../../core/models/habit.model'

export interface HabitTemplate {
  key: string           // slug: 'custom-<dbId>'
  name: string          // fallback / canonical display name
  description?: string
  dbId?: number         // only set for custom templates (Dexie row id)
  habit: {
    name: string
    type: HabitType
    unit?: string
    targetValue?: number
    dimensionPrimary: DimensionId
    dimensionSecondary: DimensionId | null
  }
}

export interface StoredCustomTemplate {
  id?: number
  name: string
  description?: string
  createdAt: Date
  habit: {
    name: string
    type: HabitType
    unit?: string
    targetValue?: number
    dimensionPrimary: DimensionId
    dimensionSecondary: DimensionId | null
  }
}
