import { Component } from '@angular/core'
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component'
import { I18nService } from '../../../core/i18n/i18n.service'

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [LanguageSelectorComponent],
  template: `
    <div class="min-h-screen bg-slate-900 pb-24">
      <div class="px-4 pt-8 pb-4">
        <h1 class="text-xl font-semibold text-white">{{ i18n.t('settings.title') }}</h1>
        <p class="text-sm text-slate-500 mt-1">{{ i18n.t('settings.description') }}</p>
      </div>

      <div class="px-4 space-y-4">
        <div>
          <p class="text-sm text-slate-400 mb-2">{{ i18n.t('settings.language_label') }}</p>
          <div class="inline-flex gap-2">
            <app-language-selector />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  constructor(public i18n: I18nService) {}
}
