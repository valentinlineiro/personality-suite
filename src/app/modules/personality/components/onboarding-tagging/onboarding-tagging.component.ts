import { Component, OnInit, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { HabitsService } from '../../../habits/services/habits.service'
import { Habit, DimensionId } from '../../../../core/models/habit.model'
import { DIMENSIONS } from '../../constants/dimensions'

interface TaggingRow {
  habit: Habit
  selectedDimension: DimensionId | null
}

@Component({
  selector: 'app-onboarding-tagging',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <div class="px-4 pt-8 pb-4 flex items-center gap-3">
        <a routerLink="/personality"
          class="text-slate-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <h1 class="text-xl font-semibold text-white">Tag Your Habits</h1>
      </div>

      <p class="px-4 text-sm text-slate-400 mb-6">
        Assign a primary dimension to each habit so your profile can be computed.
      </p>

      <div class="px-4 space-y-3">
        @for (row of rows(); track row.habit.id) {
          <div class="bg-slate-800 rounded-xl px-4 py-3">
            <p class="text-white font-medium mb-2">{{ row.habit.name }}</p>
            <select
              [value]="row.selectedDimension ?? ''"
              (change)="setDimension(row, $event)"
              class="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
              <option value="" disabled>Select dimension</option>
              @for (d of dimensions; track d.id) {
                <option [value]="d.id">{{ d.label }}</option>
              }
            </select>
          </div>
        }
      </div>

      @if (rows().length === 0) {
        <p class="px-4 text-slate-500 text-sm text-center py-12">All habits are already tagged.</p>
      }

      <div class="px-4 mt-6">
        <button (click)="saveAll()"
          class="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors">
          Save all
        </button>
      </div>
    </div>
  `,
})
export class OnboardingTaggingComponent implements OnInit {
  rows = signal<TaggingRow[]>([])
  dimensions = DIMENSIONS

  constructor(
    private habitsService: HabitsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.habitsService.getActiveHabits().then(habits => {
      const untagged = habits.filter(h => !h.dimensionPrimary)
      this.rows.set(untagged.map(habit => ({ habit, selectedDimension: null })))
    })
  }

  setDimension(row: TaggingRow, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as DimensionId
    this.rows.update(rows =>
      rows.map(r => r.habit.id === row.habit.id ? { ...r, selectedDimension: value } : r)
    )
  }

  async saveAll(): Promise<void> {
    const updates = this.rows().filter(r => r.selectedDimension !== null)
    await Promise.all(
      updates.map(r =>
        this.habitsService.updateHabit(r.habit.id!, { dimensionPrimary: r.selectedDimension })
      )
    )
    await this.router.navigate(['/personality'])
  }
}
