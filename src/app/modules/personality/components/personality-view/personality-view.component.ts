import { Component, OnInit, signal, effect } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ProfileEngineService, PersonalityProfile } from '../../engine/profile-engine.service'
import { RadarChartComponent } from '../radar-chart/radar-chart.component'
import { NarrativePhraseComponent } from '../narrative-phrase/narrative-phrase.component'
import { DimensionListComponent } from '../dimension-list/dimension-list.component'
import { I18nService } from '../../../../core/i18n/i18n.service'
import { addDays } from '../../../../core/utils/date.utils'
import { DimensionId } from '../../../../core/models/habit.model'

@Component({
  selector: 'app-personality-view',
  standalone: true,
  imports: [RouterLink, RadarChartComponent, NarrativePhraseComponent, DimensionListComponent],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <!-- Header -->
      <div class="px-4 pt-8 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-semibold text-white">{{ i18n.t('personality.title') }}</h1>
        </div>
        <!-- Period selector -->
        <div class="flex gap-2">
          @for (opt of periodOptions; track opt.days) {
            <button (click)="setPeriod(opt.days)"
              class="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors"
              [class]="selectedDays() === opt.days ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'">
              {{ i18n.t(opt.label) }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <div class="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
      } @else if (profile()) {
        <!-- Radar -->
        <div class="px-8 py-4">
          <app-radar-chart [profile]="profile()" />
        </div>

        <!-- Narrative -->
        <div class="px-4 py-3 mx-4 rounded-xl bg-slate-800/50">
          <app-narrative-phrase [profile]="profile()" />
        </div>

        <!-- Dimension list -->
        <div class="px-4 mt-5">
          <h2 class="text-sm text-slate-500 uppercase tracking-wider mb-1">
            {{ i18n.t('personality.dimensions_title') }}
          </h2>
          <p class="text-[11px] text-slate-500 mb-3">{{ i18n.t('personality.trend_hint') }}</p>
          <app-dimension-list [scores]="profile()!.scores" [deltas]="deltas()" />
        </div>

        <!-- Onboarding banner -->
        @if (profile()!.totalHabitsUntagged > 0) {
          <div class="mx-4 mt-5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center justify-between">
            <div>
              <p class="text-amber-400 text-sm font-medium">
                {{ i18n.t('personality.untagged_title', { count: profile()!.totalHabitsUntagged }) }}
              </p>
              <p class="text-amber-500/70 text-xs">{{ i18n.t('personality.untagged_desc') }}</p>
            </div>
            <a routerLink="/personality/onboarding"
              class="text-amber-400 text-sm font-medium hover:text-amber-300 transition-colors">
              {{ i18n.t('personality.untagged_cta') }}
            </a>
          </div>
        }
      }
    </div>
  `,
})
export class PersonalityViewComponent {
  selectedDays = signal<7 | 30 | 90>(7)
  profile = signal<PersonalityProfile | null>(null)
  previousProfile = signal<PersonalityProfile | null>(null)
  loading = signal(false)

  periodOptions = [
    { days: 7 as const, label: 'personality.period_7d' },
    { days: 30 as const, label: 'personality.period_30d' },
    { days: 90 as const, label: 'personality.period_90d' },
  ]

  deltas = signal<Partial<Record<DimensionId, number | null>>>({})

  constructor(
    private engine: ProfileEngineService,
    public i18n: I18nService,
  ) {
    effect(() => {
      const days = this.selectedDays()
      this.loading.set(true)
      Promise.all([
        this.engine.computeProfile(days),
        this.engine.computeProfileForEndDate(days, addDays(new Date(), -days)),
      ])
        .then(([current, previous]) => {
          this.profile.set(current)
          this.previousProfile.set(previous)
          this.deltas.set(this.computeDeltas(current, previous))
        })
        .finally(() => this.loading.set(false))
    })
  }

  setPeriod(days: 7 | 30 | 90): void {
    this.selectedDays.set(days)
  }

  private computeDeltas(
    current: PersonalityProfile,
    previous: PersonalityProfile,
  ): Partial<Record<DimensionId, number | null>> {
    const previousByDimension = new Map(previous.scores.map(s => [s.dimensionId, s.score]))
    const next: Partial<Record<DimensionId, number | null>> = {}

    for (const score of current.scores) {
      const prev = previousByDimension.get(score.dimensionId)
      next[score.dimensionId] = score.score === null || prev == null ? null : score.score - prev
    }
    return next
  }
}
