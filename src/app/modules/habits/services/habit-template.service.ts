import { Injectable, signal, computed } from '@angular/core'
import { HabitTemplate } from '../models/habit-template.model'
import { BUILT_IN_TEMPLATES } from '../data/habit-templates'
import { DatabaseService } from '../../../core/db/database.service'
import { DimensionId, HabitType } from '../../../core/models/habit.model'

@Injectable({ providedIn: 'root' })
export class HabitTemplateService {
  private customTemplates = signal<HabitTemplate[]>([])
  readonly templates = computed(() => [...BUILT_IN_TEMPLATES, ...this.customTemplates()])

  constructor(private db: DatabaseService) {}

  async init(): Promise<void> {
    const stored = await this.db.customTemplates.toArray()
    const custom: HabitTemplate[] = stored.map(t => ({
      key: `custom-${t.id}`,
      name: t.name,
      description: t.description,
      isBuiltIn: false,
      dbId: t.id,
      habit: t.habit,
    }))
    this.customTemplates.set(custom)
  }

  async addCustomTemplate(data: {
    name: string
    description?: string
    habit: {
      name: string
      type: HabitType
      unit?: string
      targetValue?: number
      dimensionPrimary: DimensionId
      dimensionSecondary: DimensionId | null
    }
  }): Promise<void> {
    const id = await this.db.customTemplates.add({
      name: data.name,
      description: data.description,
      createdAt: new Date(),
      habit: data.habit,
    })
    this.customTemplates.update(list => [
      ...list,
      {
        key: `custom-${id}`,
        name: data.name,
        description: data.description,
        isBuiltIn: false,
        dbId: id as number,
        habit: data.habit,
      },
    ])
  }

  async deleteCustomTemplate(dbId: number): Promise<void> {
    await this.db.customTemplates.delete(dbId)
    this.customTemplates.update(list => list.filter(t => t.dbId !== dbId))
  }
}
