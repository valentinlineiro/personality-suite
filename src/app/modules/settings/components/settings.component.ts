import { Component, computed } from '@angular/core'
import { NgFor, NgIf } from '@angular/common'
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component'
import { HabitTemplateService } from '../../habits/services/habit-template.service'
import { HabitTemplate } from '../../habits/models/habit-template.model'
import { I18nService } from '../../../core/i18n/i18n.service'
import { TemplateFormComponent } from './template-form.component'

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LanguageSelectorComponent, TemplateFormComponent, NgIf, NgFor],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <div class="px-4 pt-8 pb-4 space-y-3">
        <h1 class="text-xl font-semibold text-white">{{ i18n.t('settings.title') }}</h1>
        <p class="text-sm text-slate-500">{{ i18n.t('settings.description') }}</p>
      </div>
      <div class="px-4 space-y-6">
        <section>
          <p class="text-sm text-slate-400 mb-2">{{ i18n.t('settings.language_label') }}</p>
          <app-language-selector />
        </section>
        <section id="templates" class="space-y-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ i18n.t('settings_templates.templates_title') }}</p>
            <p class="text-sm text-slate-500">{{ i18n.t('settings_templates.templates_description') }}</p>
          </div>
          <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <app-template-form />
          </div>
          <div class="space-y-3">
            <div *ngFor="let template of templates()" class="bg-slate-800/50 rounded-xl px-4 py-3">
              <p class="font-semibold text-white">{{ templateLabel(template) }}</p>
              <p class="text-xs text-slate-500">{{ templateDescription(template) }}</p>
              <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ template.habit.type }}</p>
            </div>
            <p *ngIf="templates().length === 0" class="text-sm text-slate-500">{{ i18n.t('settings_templates.templates_empty') }}</p>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  templates = computed(() => this.habitTemplateService.templates())

  constructor(public i18n: I18nService, private habitTemplateService: HabitTemplateService) {}

  templateLabel(template: HabitTemplate): string {
    if (template.labelKey) {
      const translated = this.i18n.t(template.labelKey)
      if (translated !== template.labelKey) return translated
    }
    return template.name
  }

  templateDescription(template: HabitTemplate): string {
    if (template.descriptionKey) {
      const translated = this.i18n.t(template.descriptionKey)
      if (translated !== template.descriptionKey) return translated
    }
    return template.description ?? ''
  }
}
