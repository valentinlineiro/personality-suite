import { Component, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component'
import { HabitTemplateService } from '../../habits/services/habit-template.service'
import { HabitTemplate } from '../../habits/models/habit-template.model'
import { I18nService } from '../../../core/i18n/i18n.service'
import { TemplateFormComponent } from './template-form.component'
import { AuthService } from '../../../core/auth/auth.service'

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LanguageSelectorComponent, TemplateFormComponent, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <div class="px-4 pt-8 pb-4 space-y-3">
        <h1 class="text-xl font-semibold text-white">{{ i18n.t('settings.title') }}</h1>
        <p class="text-sm text-slate-500">{{ i18n.t('settings.description') }}</p>
      </div>
      <div class="px-4 space-y-6">
        <section class="bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-4">
          @if (auth.isAuthenticated()) {
            <div class="min-w-0">
              <p class="text-sm font-medium text-white">{{ i18n.t('settings.account_signed_in') }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ i18n.t('settings.account_sync_active') }}</p>
            </div>
            <button (click)="auth.logout()"
              class="shrink-0 text-sm text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
              {{ i18n.t('settings.account_sign_out') }}
            </button>
          } @else {
            <div class="min-w-0">
              <p class="text-sm font-medium text-white">{{ i18n.t('settings.account_signed_out') }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ i18n.t('settings.account_sync_hint') }}</p>
            </div>
            <button (click)="auth.login()"
              class="shrink-0 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors">
              {{ i18n.t('settings.account_sign_in_google') }}
            </button>
          }
        </section>

        <section>
          <p class="text-sm text-slate-400 mb-2">{{ i18n.t('settings.language_label') }}</p>
          <app-language-selector />
        </section>

        <section id="templates" class="space-y-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">{{ i18n.t('settings_templates.templates_title') }}</p>
            <p class="text-sm text-slate-500 mt-1">{{ i18n.t('settings_templates.templates_description') }}</p>
          </div>

          <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <app-template-form />
          </div>

          <div class="space-y-2">
            @for (template of customTemplates(); track template.key) {
              <div class="bg-slate-800/50 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-medium text-white truncate">{{ template.name }}</p>
                  @if (template.description) {
                    <p class="text-xs text-slate-500 mt-0.5">{{ template.description }}</p>
                  }
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-600 mt-1">{{ i18n.t('habit_form.type_' + template.habit.type) || template.habit.type }}</p>
                </div>
                <div class="shrink-0 flex items-center gap-1">
                  <a [routerLink]="['/habits/new']" [queryParams]="{ template: template.key }"
                    class="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-700 transition-colors">
                    {{ i18n.t('settings_templates.use_template') }}
                  </a>
                  <button (click)="deleteTemplate(template)"
                    class="text-slate-500 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-slate-700 transition-colors">
                    {{ i18n.t('habit_list.delete') }}
                  </button>
                </div>
              </div>
            }
            @if (customTemplates().length === 0) {
              <p class="text-sm text-slate-500">{{ i18n.t('settings_templates.templates_empty') }}</p>
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  customTemplates = computed(() => this.habitTemplateService.templates())

  constructor(
    public i18n: I18nService,
    public auth: AuthService,
    private habitTemplateService: HabitTemplateService,
  ) {}

  async deleteTemplate(template: HabitTemplate): Promise<void> {
    if (template.dbId == null) return
    await this.habitTemplateService.deleteCustomTemplate(template.dbId)
  }
}
