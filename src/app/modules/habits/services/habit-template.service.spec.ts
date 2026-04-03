import { HabitTemplateService } from './habit-template.service'

describe('HabitTemplateService suggestDimensions', () => {
  it('returns a high-confidence suggestion for exact template names', () => {
    const service = new HabitTemplateService({ customTemplates: { toArray: vi.fn().mockResolvedValue([]) } } as any)
    const suggestion = service.suggestDimensions('Morning run')

    expect(suggestion?.dimensionPrimary).toBe('vitality')
    expect(suggestion?.dimensionSecondary).toBe('recovery')
    expect(suggestion?.confidence).toBeGreaterThanOrEqual(90)
  })

  it('falls back to keyword-based suggestion for new names', () => {
    const service = new HabitTemplateService({ customTemplates: { toArray: vi.fn().mockResolvedValue([]) } } as any)
    const suggestion = service.suggestDimensions('Evening meditation session')

    expect(suggestion).not.toBeNull()
    expect(suggestion?.dimensionPrimary).toBe('presence')
  })
})
