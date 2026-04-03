import { Component, signal } from '@angular/core'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { HabitType, DimensionId } from '../../../core/models/habit.model'
import { DIMENSIONS } from '../../personality/constants/dimensions'
import { HabitTemplateService } from '../../habits/services/habit-template.service'
import { I18nService } from '../../../core/i18n/i18n.service'

@Component({
  selector: 'app-template-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-3">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-xs text-slate-400 uppercase tracking-[0.3em]">{{ i18n.t('habit_form.name_label') }}</label>
        <input formControlName="name" type="text"
          (blur)="autoDetectOnNameBlur()"
          [placeholder]="i18n.t('habit_form.name_placeholder')"
          class="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />

        <label class="text-xs text-slate-400 uppercase tracking-[0.3em]">{{ i18n.t('habit_form.type_label') }}</label>
        <select formControlName="type" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
          @for (t of habitTypes; track t) {
            <option [value]="t">{{ i18n.t('habit_form.type_' + t) || t }}</option>
          }
        </select>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-xs text-slate-400">{{ i18n.t('habit_form.unit_label_quantity') }}</label>
        <input formControlName="unit" type="text" placeholder="min / km / pages"
          class="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />

        <label class="text-xs text-slate-400">{{ i18n.t('habit_form.target_label') }}</label>
        <input formControlName="targetValue" type="number" min="1"
          [placeholder]="i18n.t('habit_form.target_placeholder')"
          class="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div class="flex items-center justify-between">
          <label class="text-xs text-slate-400">{{ i18n.t('habit_form.dimension_primary_label') }}</label>
          <button type="button" (click)="applySuggestedDimensions()"
            class="text-[11px] px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
            {{ i18n.t('settings_templates.auto_detect') }}
          </button>
        </div>
        <select formControlName="dimensionPrimary" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
          <option value="" disabled>{{ i18n.t('habit_form.dimension_primary_placeholder') }}</option>
          @for (d of dimensions; track d.id) {
            <option [value]="d.id">{{ i18n.t('dimensions.' + d.id + '.label') || d.label }}</option>
          }
        </select>

        <label class="text-xs text-slate-400">{{ i18n.t('habit_form.dimension_secondary_label') }}</label>
        <select formControlName="dimensionSecondary" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">—</option>
          @for (d of dimensions; track d.id) {
            <option [value]="d.id">{{ i18n.t('dimensions.' + d.id + '.label') || d.label }}</option>
          }
        </select>
      </div>

      <button type="submit" [disabled]="form.invalid"
        class="w-full text-sm font-semibold text-blue-400 border border-blue-500/50 rounded-xl py-2 hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        {{ i18n.t('settings_templates.save_template') }}
      </button>

      @if (suggestionMessage()) {
        <p class="text-xs text-slate-400">{{ suggestionMessage() }}</p>
      }

      @if (message()) {
        <p class="text-xs text-emerald-400">{{ message() }}</p>
      }
    </form>
  `,
})
export class TemplateFormComponent {
  habitTypes: HabitType[] = ['binary', 'quantity', 'time']
  dimensions = DIMENSIONS
  message = signal('')
  suggestionMessage = signal('')

  form: FormGroup

  constructor(
    private fb: FormBuilder,
    private habitTemplateService: HabitTemplateService,
    public i18n: I18nService,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['binary', Validators.required],
      unit: [''],
      targetValue: [null],
      dimensionPrimary: ['', Validators.required],
      dimensionSecondary: [''],
    })
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }
    const { name, type, unit, targetValue, dimensionPrimary, dimensionSecondary } = this.form.value as {
      name: string
      type: HabitType
      unit: string
      targetValue: number | null
      dimensionPrimary: DimensionId
      dimensionSecondary: DimensionId | ''
    }
    await this.habitTemplateService.addCustomTemplate({
      name,
      habit: {
        name,
        type,
        unit: unit?.trim() || undefined,
        targetValue: targetValue ?? undefined,
        dimensionPrimary,
        dimensionSecondary: (dimensionSecondary as DimensionId) || null,
      },
    })
    this.message.set(this.i18n.t('habit_form.template_saved') || 'Template saved!')
    this.suggestionMessage.set('')
    this.form.reset({ type: 'binary' })
    setTimeout(() => this.message.set(''), 3000)
  }

  applySuggestedDimensions(): void {
    this.applySuggestion(true)
  }

  autoDetectOnNameBlur(): void {
    const currentPrimary = String(this.form.get('dimensionPrimary')?.value ?? '').trim()
    if (currentPrimary) return
    this.applySuggestion(false)
  }

  private applySuggestion(showNoSuggestionMessage: boolean): void {
    const name = String(this.form.get('name')?.value ?? '')
    const suggestion = this.habitTemplateService.suggestDimensions(name)
    if (!suggestion) {
      if (showNoSuggestionMessage) {
        this.suggestionMessage.set(this.i18n.t('settings_templates.auto_detect_none'))
      }
      return
    }

    this.form.patchValue({
      dimensionPrimary: suggestion.dimensionPrimary,
      dimensionSecondary: suggestion.dimensionSecondary ?? '',
    })
    const primaryLabel = this.i18n.t(`dimensions.${suggestion.dimensionPrimary}.label`)
    const secondaryLabel = suggestion.dimensionSecondary
      ? this.i18n.t(`dimensions.${suggestion.dimensionSecondary}.label`)
      : this.i18n.t('settings_templates.auto_detect_no_secondary')
    this.suggestionMessage.set(
      this.i18n.t('settings_templates.auto_detect_applied', {
        primary: primaryLabel,
        secondary: secondaryLabel,
        confidence: suggestion.confidence,
      }),
    )
  }
}
