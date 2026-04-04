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
  syncId?: string
  name: string
  type: HabitType
  unit?: string
  targetValue?: number
  dimensionPrimary: DimensionId | null
  dimensionSecondary: DimensionId | null
  createdAt: Date
  updatedAt: Date
  archivedAt?: Date
  deletedAt?: Date
}
