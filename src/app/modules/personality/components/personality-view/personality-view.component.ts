import { Component, OnInit, signal, effect } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ProfileEngineService, PersonalityProfile } from '../../engine/profile-engine.service'
import { RadarChartComponent } from '../radar-chart/radar-chart.component'
import { NarrativePhraseComponent } from '../narrative-phrase/narrative-phrase.component'
import { DimensionListComponent } from '../dimension-list/dimension-list.component'

@Component({
  selector: 'app-personality-view',
  standalone: true,
  imports: [RouterLink, RadarChartComponent, NarrativePhraseComponent, DimensionListComponent],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <!-- Header -->
      <div class="px-4 pt-8 pb-4">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-semibold text-white">Active Identity</h1>
        </div>
        <!-- Period selector -->
        <div class="flex gap-2">
          @for (opt of periodOptions; track opt.days) {
            <button (click)="setPeriod(opt.days)"
              class="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors"
              [class]="selectedDays() === opt.days ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'">
              {{ opt.label }}
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
          <h2 class="text-sm text-slate-500 uppercase tracking-wider mb-3">Dimensions</h2>
          <app-dimension-list [scores]="profile()!.scores" />
        </div>

        <!-- Onboarding banner -->
        @if (profile()!.totalHabitsUntagged > 0) {
          <div class="mx-4 mt-5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center justify-between">
            <div>
              <p class="text-amber-400 text-sm font-medium">{{ profile()!.totalHabitsUntagged }} untagged habits</p>
              <p class="text-amber-500/70 text-xs">Tag them to improve your profile accuracy.</p>
            </div>
            <a routerLink="/personality/onboarding"
              class="text-amber-400 text-sm font-medium hover:text-amber-300 transition-colors">
              Tag →
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
  loading = signal(false)

  periodOptions = [
    { days: 7 as const, label: '7d' },
    { days: 30 as const, label: '30d' },
    { days: 90 as const, label: '90d' },
  ]

  constructor(private engine: ProfileEngineService) {
    effect(() => {
      const days = this.selectedDays()
      this.loading.set(true)
      this.engine.computeProfile(days)
        .then(p => this.profile.set(p))
        .finally(() => this.loading.set(false))
    })
  }

  setPeriod(days: 7 | 30 | 90): void {
    this.selectedDays.set(days)
  }
}
