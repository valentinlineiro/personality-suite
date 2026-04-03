import { Component, signal } from '@angular/core'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { NgFor, NgIf } from '@angular/common'
import { HabitType, DimensionId } from '../../../core/models/habit.model'
import { DIMENSIONS } from '../../personality/constants/dimensions'
import { HabitTemplateService } from '../../habits/services/habit-template.service'

@Component({
  selector: 'app-template-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-3">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-xs text-slate-400 uppercase tracking-[0.3em]">ID (slug)</label>
        <input formControlName="id" type="text" placeholder="custom-breathing" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2" />
        <label class="text-xs text-slate-400 uppercase tracking-[0.3em]">Label key</label>
        <input formControlName="labelKey" type="text" placeholder="habit_template.custom.name" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2" />
        <label class="text-xs text-slate-400 uppercase tracking-[0.3em]">Description key</label>
        <input formControlName="descriptionKey" type="text" placeholder="habit_template.custom.description" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2" />
        <label class="text-xs text-slate-400 uppercase tracking-[0.3em]">Display name</label>
        <input formControlName="name" type="text" required class="w-full bg-slate-800 text-white rounded-xl px-3 py-2" />
        <label class="text-xs text-slate-400 uppercase tracking-[0.3em]">Type</label>
        <select formControlName="type" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2">
          <option *ngFor="let t of habitTypes" [value]="t">{{ t }}</option>
        </select>
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-xs text-slate-400">Unit</label>
        <input formControlName="unit" type="text" placeholder="min / km" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2" />
        <label class="text-xs text-slate-400">Target</label>
        <input formControlName="targetValue" type="number" min="1" placeholder="e.g. 30" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2" />
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <label class="text-xs text-slate-400">Primary dimension</label>
        <select formControlName="dimensionPrimary" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2">
          <option value="" disabled>Select</option>
          <option *ngFor="let d of dimensions" [value]="d.id">{{ d.label }}</option>
        </select>
        <label class="text-xs text-slate-400">Secondary dimension</label>
        <select formControlName="dimensionSecondary" class="w-full bg-slate-800 text-white rounded-xl px-3 py-2">
          <option value="">None</option>
          <option *ngFor="let d of dimensions" [value]="d.id">{{ d.label }}</option>
        </select>
      </div>
      <button type="submit" [disabled]="form.invalid" class="w-full text-sm font-semibold text-blue-400 border border-blue-500/50 rounded-xl py-2 hover:bg-blue-500/10">Save template</button>
      <p *ngIf="message()" class="text-xs text-emerald-400">{{ message() }}</p>
    </form>
  `,
})
export class TemplateFormComponent {
  habitTypes: HabitType[] = ['binary', 'quantity', 'time']
  dimensions = DIMENSIONS
  message = signal('')

  form: FormGroup

  constructor(private fb: FormBuilder, private habitTemplateService: HabitTemplateService) {
    this.form = this.fb.group({
      id: [''],
      labelKey: [''],
      descriptionKey: [''],
      name: ['', Validators.required],
      type: ['binary', Validators.required],
      unit: [''],
      targetValue: [null],
      dimensionPrimary: ['', Validators.required],
      dimensionSecondary: [''],
    })
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }
    const value = this.form.value as {
      id: string | null
      labelKey: string | null
      descriptionKey: string | null
      name: string | null
      type: HabitType | null
      unit: string | null
      targetValue: number | null
      dimensionPrimary: DimensionId | null
      dimensionSecondary: DimensionId | null
    }
    const { id, labelKey, descriptionKey, name, type, unit, targetValue, dimensionPrimary, dimensionSecondary } = value
    this.habitTemplateService.addTemplate({
      id: id?.trim(),
      name: name ?? '',
      labelKey: labelKey?.trim() || undefined,
      descriptionKey: descriptionKey?.trim() || undefined,
      habit: {
        name: name ?? '',
        type: (type ?? 'binary') as HabitType,
        unit: unit?.trim() || undefined,
        targetValue: targetValue ?? undefined,
        dimensionPrimary: dimensionPrimary as DimensionId,
        dimensionSecondary: (dimensionSecondary as DimensionId) ?? null,
      },
    })
    this.message.set('Template saved!')
    this.form.reset({ type: 'binary' })
  }
}
