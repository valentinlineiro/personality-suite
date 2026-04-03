import { Component, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { HabitsService } from '../../services/habits.service'
import { Habit } from '../../../../core/models/habit.model'
import { getDimension } from '../../../personality/constants/dimensions'

@Component({
  selector: 'app-habits-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <div class="px-4 pt-8 pb-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-white">Habits</h1>
        <a routerLink="/habits/new"
          class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          + New
        </a>
      </div>

      <!-- Active habits -->
      <div class="px-4 space-y-2">
        @if (activeHabits().length === 0) {
          <p class="text-slate-500 text-sm py-8 text-center">No habits yet. Create one to get started.</p>
        }
        @for (habit of activeHabits(); track habit.id) {
          <div class="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p class="text-white font-medium">{{ habit.name }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-slate-500 capitalize">{{ habit.type }}</span>
                @if (habit.dimensionPrimary) {
                  <span class="text-xs px-2 py-0.5 rounded-full"
                    [style.background-color]="getDimensionColor(habit.dimensionPrimary) + '33'"
                    [style.color]="getDimensionColor(habit.dimensionPrimary)">
                    {{ getDimensionLabel(habit.dimensionPrimary) }}
                  </span>
                }
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a [routerLink]="['/habits/edit', habit.id]"
                class="text-slate-400 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-slate-700 transition-colors">
                Edit
              </a>
              <button (click)="archive(habit)"
                class="text-slate-500 hover:text-red-400 text-sm px-3 py-1 rounded-lg hover:bg-slate-700 transition-colors">
                Archive
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Archived section -->
      @if (archivedHabits().length > 0) {
        <div class="px-4 mt-6">
          <button (click)="toggleArchived()"
            class="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-3 transition-colors">
            <svg class="w-4 h-4 transition-transform" [class.rotate-90]="showArchived()"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            Archived ({{ archivedHabits().length }})
          </button>
          @if (showArchived()) {
            <div class="space-y-2">
              @for (habit of archivedHabits(); track habit.id) {
                <div class="bg-slate-800/50 rounded-xl px-4 py-3 opacity-60">
                  <p class="text-slate-400 font-medium">{{ habit.name }}</p>
                  <span class="text-xs text-slate-600 capitalize">{{ habit.type }}</span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class HabitsListComponent implements OnInit {
  activeHabits = signal<Habit[]>([])
  archivedHabits = signal<Habit[]>([])
  showArchived = signal(false)

  constructor(private habitsService: HabitsService) {}

  ngOnInit(): void {
    this.load()
  }

  private load(): void {
    this.habitsService.getActiveHabits().then(h => this.activeHabits.set(h))
    this.habitsService.getArchivedHabits().then(h => this.archivedHabits.set(h))
  }

  async archive(habit: Habit): Promise<void> {
    await this.habitsService.archiveHabit(habit.id!)
    this.activeHabits.update(list => list.filter(h => h.id !== habit.id))
    this.archivedHabits.update(list => [...list, { ...habit, archivedAt: new Date() }])
  }

  toggleArchived(): void {
    this.showArchived.update(v => !v)
  }

  getDimensionLabel(id: string): string {
    return getDimension(id as any)?.label ?? id
  }

  getDimensionColor(id: string): string {
    return getDimension(id as any)?.color ?? '#94a3b8'
  }
}
