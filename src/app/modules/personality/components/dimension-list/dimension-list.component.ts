import { Component, Input, computed, signal } from '@angular/core'
import { DimensionScore } from '../../engine/profile-engine.service'
import { getDimension } from '../../constants/dimensions'
import { I18nService } from '../../../../core/i18n/i18n.service'

@Component({
  selector: 'app-dimension-list',
  standalone: true,
  template: `
    <div class="space-y-2">
      @for (item of sorted(); track item.dimensionId) {
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full flex-shrink-0"
            [style.background-color]="color(item.dimensionId)"></div>
          <span class="text-sm text-slate-300 w-24 flex-shrink-0">{{ label(item.dimensionId) }}</span>
          <div class="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            @if (item.score !== null) {
              <div class="h-full rounded-full transition-all duration-500"
                [style.width]="item.score + '%'"
                [style.background-color]="color(item.dimensionId)">
              </div>
            }
          </div>
          <div class="w-16 text-right leading-tight">
            <p class="text-xs"
              [class]="item.score !== null ? 'text-slate-400' : 'text-slate-600'">
              {{ item.score !== null ? item.score + '%' : '—' }}
            </p>
            @if (item.confidence !== null) {
              <p class="text-[10px] text-slate-500">{{ confidenceLabel(item.confidence) }}</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class DimensionListComponent {
  private _scores = signal<DimensionScore[]>([])

  constructor(public i18n: I18nService) {}

  @Input() set scores(v: DimensionScore[]) {
    this._scores.set(v)
  }

  sorted = computed(() =>
    [...this._scores()].sort((a, b) => {
      if (a.score === null && b.score === null) return 0
      if (a.score === null) return 1
      if (b.score === null) return -1
      return b.score - a.score
    })
  )

  label(id: string): string {
    return this.i18n.t(`dimensions.${id}.label`)
  }

  color(id: string): string {
    return getDimension(id as any)?.color ?? '#94a3b8'
  }

  confidenceLabel(value: number): string {
    return this.i18n.t('personality.confidence_short', { value })
  }
}
