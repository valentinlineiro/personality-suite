import { Component, OnInit, signal, computed } from '@angular/core'
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'
import { Router, ActivatedRoute, RouterLink } from '@angular/router'
import { HabitsService } from '../../services/habits.service'
import { HabitType, DimensionId } from '../../../../core/models/habit.model'
import { DIMENSIONS, Dimension } from '../../../personality/constants/dimensions'
import { I18nService } from '../../../../core/i18n/i18n.service'

@Component({
  selector: 'app-habit-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <div class="px-4 pt-8 pb-4 flex items-center gap-3">
        <a routerLink="/habits/list" class="text-slate-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <h1 class="text-xl font-semibold text-white">
          {{ editId() ? i18n.t('habit_form.edit_title') : i18n.t('habit_form.new_title') }}
        </h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="px-4 space-y-5">

        <!-- Name -->
        <div>
          <label class="block text-sm text-slate-400 mb-1">{{ i18n.t('habit_form.name_label') }}</label>
          <input formControlName="name" type="text"
            [placeholder]="i18n.t('habit_form.name_placeholder')"
            class="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500" />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <p class="text-red-400 text-sm mt-1">{{ i18n.t('habit_form.validation_name') }}</p>
          }
        </div>

        <!-- Type -->
        <div>
          <label class="block text-sm text-slate-400 mb-1">{{ i18n.t('habit_form.type_label') }}</label>
          <div class="flex gap-2">
            @for (t of habitTypes; track t) {
              <button type="button" (click)="setType(t)"
                class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                [class]="selectedType() === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'">
                {{ typeLabel(t) }}
              </button>
            }
          </div>
          @if (form.get('type')?.invalid && form.get('type')?.touched) {
            <p class="text-red-400 text-sm mt-1">{{ i18n.t('habit_form.validation_type') }}</p>
          }
        </div>

        <!-- Unit / Target -->
        @if (selectedType() === 'quantity' || selectedType() === 'time') {
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm text-slate-400 mb-1">
                {{ selectedType() === 'time' ? i18n.t('habit_form.unit_label_time') : i18n.t('habit_form.unit_label_quantity') }}
              </label>
            <input formControlName="unit" type="text"
              class="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
              [placeholder]="unitPlaceholder()" />
            </div>
            <div class="flex-1">
              <label class="block text-sm text-slate-400 mb-1">{{ i18n.t('habit_form.target_label') }}</label>
              <input formControlName="targetValue" type="number" min="1"
                class="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                [placeholder]="i18n.t('habit_form.target_placeholder')" />
            </div>
          </div>
        }

        <!-- Primary Dimension -->
        <div>
          <label class="block text-sm text-slate-400 mb-1">{{ i18n.t('habit_form.dimension_primary_label') }}</label>
          <select formControlName="dimensionPrimary"
            class="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
            <option value="" disabled>{{ i18n.t('habit_form.dimension_primary_placeholder') }}</option>
            @for (d of dimensions; track d.id) {
              <option [value]="d.id">{{ dimLabel(d.id) }}</option>
            }
          </select>
          @if (form.get('dimensionPrimary')?.invalid && form.get('dimensionPrimary')?.touched) {
            <p class="text-red-400 text-sm mt-1">{{ i18n.t('habit_form.validation_dimension') }}</p>
          }
        </div>

        <!-- Secondary Dimension -->
        <div>
          <label class="block text-sm text-slate-400 mb-1">
            {{ i18n.t('habit_form.dimension_secondary_label') }}
            <span class="text-slate-500">{{ i18n.t('habit_form.dimension_secondary_optional') }}</span>
          </label>
          <select formControlName="dimensionSecondary"
            class="w-full bg-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
            <option [value]="null">—</option>
            @for (d of availableSecondaryDimensions(); track d.id) {
              <option [value]="d.id">{{ dimLabel(d.id) }}</option>
            }
          </select>
        </div>

        <!-- Submit -->
        <button type="submit" [disabled]="form.invalid"
          class="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-4">
          {{ editId() ? i18n.t('habit_form.save') : i18n.t('habit_form.create') }}
        </button>

      </form>
    </div>
  `,
})
export class HabitFormComponent implements OnInit {
  form: FormGroup
  habitTypes: HabitType[] = ['binary', 'quantity', 'time']
  dimensions: Dimension[] = DIMENSIONS
  editId = signal<number | null>(null)
  selectedType = signal<HabitType>('binary')

  availableSecondaryDimensions = computed(() =>
    DIMENSIONS.filter(d => d.id !== this.form.get('dimensionPrimary')?.value)
  )

  constructor(
    private fb: FormBuilder,
    private habitsService: HabitsService,
    private router: Router,
    private route: ActivatedRoute,
    public i18n: I18nService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['binary', Validators.required],
      unit: [''],
      targetValue: [null],
      dimensionPrimary: [null, Validators.required],
      dimensionSecondary: [null],
    })

    this.form.get('type')!.valueChanges.subscribe((v: HabitType) => {
      this.selectedType.set(v)
    })
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id')
    if (idParam) {
      const id = Number(idParam)
      this.editId.set(id)
      this.habitsService.getHabitById(id).then(habit => {
        if (!habit) return
        this.form.patchValue({
          name: habit.name,
          type: habit.type,
          unit: habit.unit ?? '',
          targetValue: habit.targetValue ?? null,
          dimensionPrimary: habit.dimensionPrimary,
          dimensionSecondary: habit.dimensionSecondary,
        })
        this.selectedType.set(habit.type)
      })
    }
  }

  setType(t: HabitType): void {
    this.form.patchValue({ type: t })
  }

  typeLabel(type: HabitType): string {
    return this.i18n.t(`habit_form.type_${type}`) || type
  }

  unitPlaceholder(): string {
    if (this.selectedType() === 'time') {
      return this.i18n.t('habit_form.unit_placeholder_time') || 'min'
    }
    return this.i18n.t('habit_form.unit_placeholder_quantity') || 'km'
  }

  dimLabel(id: string): string {
    return this.i18n.t(`dimensions.${id}.label`) || id
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }
    const { name, type, unit, targetValue, dimensionPrimary, dimensionSecondary } = this.form.value
    const id = this.editId()
    if (id != null) {
      await this.habitsService.updateHabit(id, {
        name, type,
        unit: unit || undefined,
        targetValue: targetValue ?? undefined,
        dimensionPrimary: dimensionPrimary as DimensionId,
        dimensionSecondary: (dimensionSecondary as DimensionId) ?? null,
      })
    } else {
      await this.habitsService.createHabit({
        name, type,
        unit: unit || undefined,
        targetValue: targetValue ?? undefined,
        dimensionPrimary: dimensionPrimary as DimensionId,
        dimensionSecondary: (dimensionSecondary as DimensionId) ?? null,
      })
    }
    await this.router.navigate(['/habits/list'])
  }
}
