import { Component, Input } from '@angular/core'
import { PersonalityProfile } from '../../engine/profile-engine.service'
import { I18nService } from '../../../../core/i18n/i18n.service'

@Component({
  selector: 'app-narrative-phrase',
  standalone: true,
  template: `
    @if (phrase()) {
      <p class="text-slate-300 text-sm leading-relaxed">{{ phrase() }}</p>
    }
  `,
})
export class NarrativePhraseComponent {
  @Input() profile: PersonalityProfile | null = null

  constructor(public i18n: I18nService) {}

  phrase(): string {
    if (!this.profile) return ''
    const { dominantDimension, neglectedDimension, scores, totalHabitsTagged } = this.profile

    if (totalHabitsTagged === 0) return this.i18n.t('personality.narrative.no_habits')
    if (!dominantDimension) return this.i18n.t('personality.narrative.no_data')

    const dominantLabel = this.i18n.t(`dimensions.${dominantDimension}.label`)
    const dominantScore = scores.find(s => s.dimensionId === dominantDimension)?.score ?? 0

    let phrase = dominantScore > 85
      ? this.i18n.t('personality.narrative.dominant_peak', { label: dominantLabel })
      : this.i18n.t('personality.narrative.dominant_base', { label: dominantLabel })

    if (neglectedDimension) {
      const neglectedLabel = this.i18n.t(`dimensions.${neglectedDimension}.label`)
      phrase += ' ' + this.i18n.t('personality.narrative.neglected_suffix', { label: neglectedLabel })
    }

    return phrase
  }
}
