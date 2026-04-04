export interface HabitEntry {
  id?: number
  syncId?: string
  syncHabitId?: string
  habitId: number
  date: string       // 'YYYY-MM-DD'
  completed: boolean
  value?: number     // for quantity and time types
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
