import { Injectable, signal } from '@angular/core'
import { HabitTemplate } from '../models/habit-template.model'
import { HABIT_TEMPLATES } from '../data/habit-templates'

@Injectable({ providedIn: 'root' })
export class HabitTemplateService {
  private templatesSignal = signal<HabitTemplate[]>(HABIT_TEMPLATES)

  templates(): HabitTemplate[] {
    return this.templatesSignal()
  }

  addTemplate(template: Omit<HabitTemplate, 'id'> & { id?: string }): void {
    const id = template.id ?? `custom-${Date.now()}`
    this.templatesSignal.update(list => [...list, { ...template, id }])
  }
}
