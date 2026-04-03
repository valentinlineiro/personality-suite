import { DimensionId } from '../../../core/models/habit.model'

export interface Dimension {
  id: DimensionId
  cluster: 'body' | 'mind' | 'production' | 'inner'
  label: string
  description: string
  color: string
  examples: string[]
}

export const DIMENSIONS: Dimension[] = [
  { id: 'vitality',   cluster: 'body',       label: 'Vitality',   description: 'Active physical investment',       color: '#22c55e', examples: ['exercise', 'steps', 'nutrition'] },
  { id: 'recovery',   cluster: 'body',       label: 'Recovery',   description: 'Wear management',                  color: '#86efac', examples: ['sleep', 'active rest'] },
  { id: 'focus',      cluster: 'mind',       label: 'Focus',      description: 'Deep cognitive work',              color: '#3b82f6', examples: ['technical reading', 'deep work'] },
  { id: 'creativity', cluster: 'mind',       label: 'Creativity', description: 'Generative output',                color: '#a78bfa', examples: ['writing', 'personal builds'] },
  { id: 'discipline', cluster: 'production', label: 'Discipline', description: 'Systems consistency',              color: '#f59e0b', examples: ['fixed routines'] },
  { id: 'execution',  cluster: 'production', label: 'Execution',  description: 'Progress on real projects',        color: '#f97316', examples: ['commits', 'deliverables'] },
  { id: 'presence',   cluster: 'inner',      label: 'Presence',   description: 'Deliberate self-observation',      color: '#ec4899', examples: ['journaling', 'meditation'] },
  { id: 'autonomy',   cluster: 'inner',      label: 'Autonomy',   description: 'Self-direction outside of work',   color: '#06b6d4', examples: ['personal projects'] },
]

export const getDimension = (id: DimensionId): Dimension =>
  DIMENSIONS.find(d => d.id === id)!
