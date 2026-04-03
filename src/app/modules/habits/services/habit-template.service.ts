import { Injectable, signal, computed } from '@angular/core'
import { HabitTemplate } from '../models/habit-template.model'
import { BUILT_IN_TEMPLATES } from '../data/habit-templates'
import { DatabaseService } from '../../../core/db/database.service'
import { DimensionId, HabitType } from '../../../core/models/habit.model'

export interface DimensionSuggestion {
  dimensionPrimary: DimensionId
  dimensionSecondary: DimensionId | null
  confidence: number
}

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

  suggestDimensions(name: string): DimensionSuggestion | null {
    const normalized = this.normalize(name)
    if (!normalized) return null

    const templates = this.templates()
    const exact = templates.find(t => this.normalize(t.name) === normalized)
    if (exact) {
      return {
        dimensionPrimary: exact.habit.dimensionPrimary,
        dimensionSecondary: exact.habit.dimensionSecondary,
        confidence: 95,
      }
    }

    const queryTokens = new Set(normalized.split(' ').filter(Boolean))
    const scores = new Map<DimensionId, number>()
    const addScore = (dimension: DimensionId, amount: number) => {
      scores.set(dimension, (scores.get(dimension) ?? 0) + amount)
    }

    // Learn from existing templates by token overlap.
    for (const template of templates) {
      const templateTokens = new Set(this.normalize(template.name).split(' ').filter(Boolean))
      if (templateTokens.size === 0) continue
      let overlap = 0
      for (const token of queryTokens) {
        if (templateTokens.has(token)) overlap++
      }
      if (overlap === 0) continue
      const overlapRatio = overlap / Math.max(queryTokens.size, templateTokens.size)
      addScore(template.habit.dimensionPrimary, overlapRatio * 4)
      if (template.habit.dimensionSecondary) {
        addScore(template.habit.dimensionSecondary, overlapRatio * 2)
      }
    }

    // Keyword priors as fallback when templates are sparse.
    const KEYWORDS: Record<DimensionId, string[]> = {
      vitality: ['run', 'walk', 'gym', 'workout', 'exercise', 'cardio', 'steps', 'training', 'swim', 'bike'],
      recovery: ['sleep', 'rest', 'stretch', 'mobility', 'nap', 'recover', 'breathwork'],
      focus: ['study', 'read', 'focus', 'deep', 'learn', 'coding', 'revision', 'practice'],
      creativity: ['write', 'drawing', 'paint', 'music', 'brainstorm', 'idea', 'compose', 'design'],
      discipline: ['routine', 'consistency', 'habit', 'plan', 'system', 'cleanup', 'organize'],
      execution: ['ship', 'deliver', 'build', 'task', 'project', 'launch', 'publish'],
      presence: ['meditation', 'journal', 'reflect', 'mindful', 'prayer', 'gratitude'],
      autonomy: ['side', 'personal', 'indie', 'freedom', 'explore', 'language', 'hobby'],
    }
    for (const token of queryTokens) {
      for (const [dimension, keywords] of Object.entries(KEYWORDS) as [DimensionId, string[]][]) {
        if (keywords.some(k => token.includes(k) || k.includes(token))) {
          addScore(dimension, 1.2)
        }
      }
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
    if (ranked.length === 0) return null
    const [primary, primaryScore] = ranked[0]
    const second = ranked.find(([dim, score]) => dim !== primary && score >= primaryScore * 0.45)
    const confidence = Math.max(25, Math.min(95, Math.round(35 + primaryScore * 11)))

    return {
      dimensionPrimary: primary,
      dimensionSecondary: second?.[0] ?? null,
      confidence,
    }
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
