import { HabitType, DimensionId } from '../../../core/models/habit.model'

export interface HabitTemplate {
  key: string           // slug: 'morning-run', 'meditation', or 'custom-<dbId>'
  name: string          // fallback / canonical display name
  description?: string
  isBuiltIn: boolean
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
