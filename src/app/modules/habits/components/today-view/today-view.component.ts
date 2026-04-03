import { Component, OnInit, signal, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { HabitsService } from '../../services/habits.service'
import { Habit } from '../../../../core/models/habit.model'
import { HabitEntry } from '../../../../core/models/habit-entry.model'
import { toDateString } from '../../../../core/utils/date.utils'

interface HabitRow {
  habit: Habit
  entry: HabitEntry | null
  streak: number
  inputValue: string
}

@Component({
  selector: 'app-today-view',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <!-- Header -->
      <div class="px-4 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-white">Today</h1>
          <p class="text-sm text-slate-500">{{ todayLabel() }}</p>
        </div>
        <a routerLink="/habits/new"
          class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          + New
        </a>
      </div>

      <!-- Progress -->
      @if (rows().length > 0) {
        <div class="px-4 mb-4">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-slate-400">{{ completedCount() }} / {{ rows().length }} completed</span>
            <span class="text-slate-500">{{ progressPct() }}%</span>
          </div>
          <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 rounded-full transition-all duration-300"
              [style.width]="progressPct() + '%'"></div>
          </div>
        </div>
      }

      <!-- Habit list -->
      <div class="px-4 space-y-2">
        @if (rows().length === 0) {
          <div class="text-center py-16">
            <p class="text-slate-500 mb-4">No habits yet.</p>
            <a routerLink="/habits/new"
              class="text-blue-400 hover:text-blue-300 text-sm">Create your first habit →</a>
          </div>
        }

        @for (row of rows(); track row.habit.id) {
          <div class="bg-slate-800 rounded-xl px-4 py-3"
            [class.ring-1]="isCompleted(row)"
            [class.ring-emerald-500]="isCompleted(row)">

            <div class="flex items-start gap-3">
              <!-- Checkbox / status -->
              @if (row.habit.type === 'binary') {
                <button (click)="toggleBinary(row)"
                  class="mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  [class]="isCompleted(row) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-slate-400'">
                  @if (isCompleted(row)) {
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                </button>
              }

              @if (row.habit.type !== 'binary') {
                <div class="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  [class]="isCompleted(row) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
              }

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-white font-medium truncate">{{ row.habit.name }}</p>
                  @if (row.streak >= 2) {
                    <span class="text-xs text-orange-400 font-medium">🔥 {{ row.streak }}</span>
                  }
                </div>

                <!-- Quantity / time input -->
                @if (row.habit.type !== 'binary') {
                  <div class="flex items-center gap-2 mt-2">
                    <input type="number" min="0"
                      [value]="row.inputValue"
                      (input)="updateInputValue(row, $event)"
                      class="w-24 bg-slate-700 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      [placeholder]="row.habit.targetValue?.toString() ?? '0'" />
                    @if (row.habit.unit) {
                      <span class="text-slate-500 text-sm">{{ row.habit.unit }}</span>
                    }
                    <button (click)="confirmValue(row)"
                      class="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                      ✓
                    </button>
                  </div>
                  @if (row.entry?.value != null) {
                    <p class="text-xs text-slate-500 mt-1">
                      {{ row.entry!.value }} {{ row.habit.unit }}
                      @if (row.habit.targetValue) { / {{ row.habit.targetValue }} }
                    </p>
                  }
                }
              </div>
            </div>

          </div>
        }
      </div>
    </div>
  `,
})
export class TodayViewComponent implements OnInit {
  today = toDateString(new Date())
  rows = signal<HabitRow[]>([])

  todayLabel = signal(
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  )

  completedCount = computed(() => this.rows().filter(r => this.isCompleted(r)).length)
  progressPct = computed(() => {
    const total = this.rows().length
    return total === 0 ? 0 : Math.round((this.completedCount() / total) * 100)
  })

  constructor(private habitsService: HabitsService) {}

  ngOnInit(): void {
    this.load()
  }

  private async load(): Promise<void> {
    const [habits, entries] = await Promise.all([
      this.habitsService.getActiveHabits(),
      this.habitsService.getTodayEntries(this.today),
    ])

    const entryMap = new Map<number, HabitEntry>()
    for (const e of entries) entryMap.set(e.habitId, e)

    const streaks = await Promise.all(habits.map(h => this.habitsService.getStreak(h)))

    this.rows.set(
      habits.map((habit, i) => ({
        habit,
        entry: entryMap.get(habit.id!) ?? null,
        streak: streaks[i],
        inputValue: String(entryMap.get(habit.id!)?.value ?? ''),
      }))
    )
  }

  isCompleted(row: HabitRow): boolean {
    if (!row.entry) return false
    if (row.habit.type === 'binary') return row.entry.completed
    return (row.entry.value ?? 0) >= (row.habit.targetValue ?? 1)
  }

  async toggleBinary(row: HabitRow): Promise<void> {
    const newCompleted = !this.isCompleted(row)
    await this.habitsService.upsertEntry(row.habit.id!, this.today, { completed: newCompleted })
    this.rows.update(rows =>
      rows.map(r =>
        r.habit.id === row.habit.id
          ? { ...r, entry: { ...(r.entry ?? { habitId: row.habit.id!, date: this.today, createdAt: new Date() }), completed: newCompleted } }
          : r
      )
    )
  }

  updateInputValue(row: HabitRow, event: Event): void {
    const value = (event.target as HTMLInputElement).value
    this.rows.update(rows =>
      rows.map(r => r.habit.id === row.habit.id ? { ...r, inputValue: value } : r)
    )
  }

  async confirmValue(row: HabitRow): Promise<void> {
    const value = parseFloat(row.inputValue)
    if (isNaN(value)) return
    const completed = value >= (row.habit.targetValue ?? 1)
    await this.habitsService.upsertEntry(row.habit.id!, this.today, { value, completed })
    this.rows.update(rows =>
      rows.map(r =>
        r.habit.id === row.habit.id
          ? { ...r, entry: { ...(r.entry ?? { habitId: row.habit.id!, date: this.today, createdAt: new Date() }), value, completed } }
          : r
      )
    )
  }
}
