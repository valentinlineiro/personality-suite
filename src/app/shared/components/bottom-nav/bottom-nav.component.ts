import { Component } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { I18nService } from '../../../core/i18n/i18n.service'

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex items-stretch h-16 z-50">
      <a routerLink="/habits/today" routerLinkActive="text-blue-400" class="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
        </svg>
        <span class="text-xs">{{ i18n.t('nav.today') }}</span>
      </a>
      <a routerLink="/habits/week" routerLinkActive="text-blue-400" class="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span class="text-xs">{{ i18n.t('nav.week') }}</span>
      </a>
      <a routerLink="/personality" routerLinkActive="text-blue-400" class="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <span class="text-xs">{{ i18n.t('nav.profile') }}</span>
      </a>
      <a routerLink="/settings" routerLinkActive="text-blue-400" class="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0 0v-2m0 14V18m-6.364-2.636l-1.414 1.414M20.778 6.636l-1.414 1.414M6 12H4m16 0h-2m-2.636-6.364l1.414 1.414M4.636 17.364l1.414-1.414"/>
        </svg>
        <span class="text-xs">{{ i18n.t('nav.settings') }}</span>
      </a>
    </nav>
  `,
})
export class BottomNavComponent {
  constructor(public i18n: I18nService) {}
}
