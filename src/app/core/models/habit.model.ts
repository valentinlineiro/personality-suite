export type HabitType = 'binary' | 'quantity' | 'time'

export type DimensionId =
  | 'vitality'
  | 'recovery'
  | 'focus'
  | 'creativity'
  | 'discipline'
  | 'execution'
  | 'presence'
  | 'autonomy'

export interface Habit {
  id?: number
  name: string
  type: HabitType
  unit?: string
  targetValue?: number
  dimensionPrimary: DimensionId | null
  dimensionSecondary: DimensionId | null
  createdAt: Date
  archivedAt?: Date
}
