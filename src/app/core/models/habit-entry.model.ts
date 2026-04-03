export interface HabitEntry {
  id?: number
  habitId: number
  date: string       // 'YYYY-MM-DD'
  completed: boolean
  value?: number     // for quantity and time types
  createdAt: Date
}
