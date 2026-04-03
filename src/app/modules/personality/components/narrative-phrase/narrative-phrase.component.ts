import { Component, Input } from '@angular/core'
import { PersonalityProfile } from '../../engine/profile-engine.service'
import { getDimension } from '../../constants/dimensions'

@Component({
  selector: 'app-narrative-phrase',
  standalone: true,
  template: `
    @if (phrase) {
      <p class="text-slate-300 text-sm leading-relaxed">{{ phrase }}</p>
    }
  `,
})
export class NarrativePhraseComponent {
  @Input() profile: PersonalityProfile | null = null

  get phrase(): string {
    if (!this.profile) return ''
    if (this.profile.totalHabitsTagged === 0) return 'Tag your habits to see your profile.'

    const { dominantDimension, neglectedDimension, scores } = this.profile
    if (!dominantDimension) return 'Keep logging habits to build your profile.'

    const dominant = getDimension(dominantDimension)
    const dominantScore = scores.find(s => s.dimensionId === dominantDimension)?.score ?? 0

    let phrase = dominantScore > 85
      ? `${dominant.label} at peak — consolidation zone.`
      : `This week you've been primarily ${dominant.label}.`

    if (neglectedDimension) {
      const neglected = getDimension(neglectedDimension)
      phrase += ` ${neglected.label} has been at a low for weeks.`
    }

    return phrase
  }
}
