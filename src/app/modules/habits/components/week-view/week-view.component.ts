import { Component, OnInit, signal, computed } from '@angular/core'
import { HabitsService } from '../../services/habits.service'
import { Habit } from '../../../../core/models/habit.model'
import { HabitEntry } from '../../../../core/models/habit-entry.model'
import { toDateString, addDays, startOfWeek } from '../../../../core/utils/date.utils'
import { I18nService } from '../../../../core/i18n/i18n.service'

type CellState = 'completed' | 'partial' | 'pending' | 'nodata'

interface WeekRow {
  habit: Habit
  cells: CellState[]
}

@Component({
  selector: 'app-week-view',
  standalone: true,
  imports: [],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <!-- Header -->
      <div class="px-4 pt-8 pb-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-white">{{ i18n.t('week.title') }}</h1>
        <div class="flex items-center gap-2">
          <button (click)="prevWeek()" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <span class="text-sm text-slate-400">{{ weekLabel() }}</span>
          <button (click)="nextWeek()" [disabled]="isCurrentWeek()"
            class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-30">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Day headers -->
      <div class="px-4">
        <div class="grid grid-cols-[1fr_repeat(7,2rem)] gap-1 mb-1">
          <div></div>
          @for (day of dayHeaders(); track day.date) {
            <div class="text-center">
              <p class="text-xs text-slate-500">{{ day.label }}</p>
              <p class="text-xs font-medium"
                [class]="day.isToday ? 'text-blue-400' : 'text-slate-400'">
                {{ day.num }}
              </p>
            </div>
          }
        </div>

        <!-- Rows -->
        <div class="space-y-1">
          @if (rows().length === 0) {
            <p class="text-slate-500 text-sm py-8 text-center">{{ i18n.t('week.empty') }}</p>
          }
          @for (row of rows(); track row.habit.id) {
            <div class="grid grid-cols-[1fr_repeat(7,2rem)] gap-1 items-center">
              <p class="text-sm text-slate-300 truncate pr-2">{{ row.habit.name }}</p>
              @for (cell of row.cells; track $index) {
                <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                  [class]="cellClass(cell)">
                  @if (cell === 'completed') {
                    <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                  @if (cell === 'partial') {
                    <div class="w-2 h-2 rounded-full bg-current opacity-60"></div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class WeekViewComponent implements OnInit {
  weekStart = signal<Date>(startOfWeek(new Date()))
  rows = signal<WeekRow[]>([])
  private habits: Habit[] = []
  today = toDateString(new Date())

  weekDates = computed(() => {
    const start = this.weekStart()
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  })

  dayHeaders = computed(() => {
    const labels = this.i18n.tArr('week.days')
    return this.weekDates().map((d, i) => ({
      date: toDateString(d),
      label: labels[i] ?? String(i),
      num: d.getDate(),
      isToday: toDateString(d) === this.today,
    }))
  })

  weekLabel = computed(() => {
    const dates = this.weekDates()
    const from = dates[0]
    const to = dates[6]
    const fromStr = from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const toStr = to.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${fromStr} – ${toStr}`
  })

  isCurrentWeek = computed(() => {
    return toDateString(this.weekStart()) === toDateString(startOfWeek(new Date()))
  })

  constructor(
    private habitsService: HabitsService,
    public i18n: I18nService,
  ) {}

  ngOnInit(): void {
    this.habitsService.getActiveHabits().then(habits => {
      this.habits = habits
      this.loadEntries()
    })
  }

  private async loadEntries(): Promise<void> {
    const dates = this.weekDates()
    const from = toDateString(dates[0])
    const to = toDateString(dates[6])

    const allEntries = await Promise.all(
      this.habits.map(h => this.habitsService.getEntriesForPeriod(h.id!, from, to))
    )

    this.rows.set(
      this.habits.map((habit, hi) => {
        const entryMap = new Map<string, HabitEntry>()
        for (const e of allEntries[hi]) entryMap.set(e.date, e)
        const cells: CellState[] = dates.map(d => {
          const ds = toDateString(d)
          const entry = entryMap.get(ds)
          if (!entry) return 'nodata'
          if (habit.type === 'binary') return entry.completed ? 'completed' : 'pending'
          const val = entry.value ?? 0
          const target = habit.targetValue ?? 1
          if (val >= target) return 'completed'
          if (val > 0) return 'partial'
          return 'pending'
        })
        return { habit, cells }
      })
    )
  }

  prevWeek(): void {
    this.weekStart.update(d => addDays(d, -7))
    this.loadEntries()
  }

  nextWeek(): void {
    if (this.isCurrentWeek()) return
    this.weekStart.update(d => addDays(d, 7))
    this.loadEntries()
  }

  cellClass(state: CellState): string {
    switch (state) {
      case 'completed': return 'bg-emerald-500'
      case 'partial':   return 'bg-emerald-500/30 text-emerald-400'
      case 'pending':   return 'bg-slate-800'
      case 'nodata':    return 'bg-slate-800/40'
    }
  }
}
