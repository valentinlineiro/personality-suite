import { Component, OnInit, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { HabitsService } from '../../services/habits.service'
import { HabitTemplateService } from '../../services/habit-template.service'
import { Habit } from '../../../../core/models/habit.model'
import { getDimension } from '../../../personality/constants/dimensions'
import { I18nService } from '../../../../core/i18n/i18n.service'

@Component({
  selector: 'app-habits-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <div class="px-4 pt-8 pb-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-white">{{ i18n.t('habit_list.title') }}</h1>
        <div class="flex gap-2">
          <a routerLink="/habits/new"
            class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            {{ i18n.t('habit_list.new_habit') }}
          </a>
          <a routerLink="/settings" fragment="templates"
            class="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            {{ i18n.t('habit_list.new_template') }}
          </a>
        </div>
      </div>

      <!-- Start from template -->
      @if (customTemplates().length > 0) {
        <div class="px-4 mb-5">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">{{ i18n.t('habit_list.start_from_template') }}</p>
          <div class="flex flex-wrap gap-2">
            @for (template of customTemplates(); track template.key) {
              <a [routerLink]="['/habits/new']" [queryParams]="{ template: template.key }"
                class="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors">
                {{ template.name }}
              </a>
            }
          </div>
        </div>
      }

      <!-- Active habits -->
      <div class="px-4 space-y-2">
        @if (activeHabits().length === 0) {
          <p class="text-slate-500 text-sm py-8 text-center">{{ i18n.t('habit_list.empty') }}</p>
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
                    {{ dimLabel(habit.dimensionPrimary) }}
                  </span>
                }
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a [routerLink]="['/habits/edit', habit.id]"
                class="text-slate-400 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-slate-700 transition-colors">
                {{ i18n.t('habit_list.edit') }}
              </a>
              <button (click)="archive(habit)"
                class="text-slate-500 hover:text-red-400 text-sm px-3 py-1 rounded-lg hover:bg-slate-700 transition-colors">
                {{ i18n.t('habit_list.archive') }}
              </button>
              <button (click)="deleteHabit(habit)"
                class="text-slate-500 hover:text-red-400 text-sm px-3 py-1 rounded-lg hover:bg-slate-700 transition-colors">
                {{ i18n.t('habit_list.delete') }}
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
            {{ i18n.t('habit_list.archived', { count: archivedHabits().length }) }}
          </button>
          @if (showArchived()) {
            <div class="space-y-2">
            @for (habit of archivedHabits(); track habit.id) {
              <div class="bg-slate-800/50 rounded-xl px-4 py-3 opacity-60">
                <p class="text-slate-400 font-medium">{{ habit.name }}</p>
                <span class="text-xs text-slate-600 capitalize">{{ habit.type }}</span>
                <div class="mt-2 flex gap-2">
                  <button (click)="deleteHabit(habit)"
                    class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors">
                    {{ i18n.t('habit_list.delete') }}
                  </button>
                </div>
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

  constructor(
    private habitsService: HabitsService,
    private habitTemplateService: HabitTemplateService,
    public i18n: I18nService,
  ) {}

  ngOnInit(): void {
    this.habitsService.getActiveHabits().then(h => this.activeHabits.set(h))
    this.habitsService.getArchivedHabits().then(h => this.archivedHabits.set(h))
  }

  async archive(habit: Habit): Promise<void> {
    await this.habitsService.archiveHabit(habit.id!)
    this.activeHabits.update(list => list.filter(h => h.id !== habit.id))
    this.archivedHabits.update(list => [...list, { ...habit, archivedAt: new Date() }])
  }

  async deleteHabit(habit: Habit): Promise<void> {
    if (!habit.id) return
    if (!confirm(`Delete "${habit.name}" and all its entries?`)) return
    await this.habitsService.deleteHabit(habit.id)
    this.activeHabits.update(list => list.filter(h => h.id !== habit.id))
    this.archivedHabits.update(list => list.filter(h => h.id !== habit.id))
  }

  toggleArchived(): void {
    this.showArchived.update(v => !v)
  }

  dimLabel(id: string): string {
    return this.i18n.t(`dimensions.${id}.label`) || getDimension(id as any)?.label || id
  }

  getDimensionColor(id: string): string {
    return getDimension(id as any)?.color ?? '#94a3b8'
  }

  customTemplates() {
    return this.habitTemplateService.templates()
  }
}
