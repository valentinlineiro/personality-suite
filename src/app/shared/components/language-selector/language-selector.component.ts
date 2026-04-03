import { Component } from '@angular/core'
import { I18nService } from '../../../core/i18n/i18n.service'

const AVAILABLE_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
]

@Component({
  selector: 'app-language-selector',
  standalone: true,
  template: `
    <div class="flex items-center gap-1">
      @for (lang of languages; track lang.code) {
        <button
          (click)="select(lang.code)"
          class="text-xs px-2 py-1 rounded-lg transition-colors"
          [class]="i18n.currentLang() === lang.code
            ? 'bg-slate-700 text-white font-semibold'
            : 'text-slate-500 hover:text-slate-300'">
          {{ lang.label }}
        </button>
      }
    </div>
  `,
})
export class LanguageSelectorComponent {
  languages = AVAILABLE_LANGUAGES

  constructor(public i18n: I18nService) {}

  select(code: string): void {
    this.i18n.setLanguage(code)
  }
}
