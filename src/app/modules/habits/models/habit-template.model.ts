import { Habit } from '../../../core/models/habit.model'

export interface HabitTemplate {
  id: string
  name: string
  description?: string
  labelKey?: string
  descriptionKey?: string
  habit: Omit<Habit, 'id' | 'createdAt'>
}
