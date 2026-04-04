import { Component, inject } from '@angular/core'
import { AuthService } from '../../core/auth/auth.service'

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="min-h-screen bg-slate-900 flex flex-col">

      <div class="flex-1 flex flex-col items-center justify-center px-6 py-16">

        <!-- Icon -->
        <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30">
          <svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>

        <!-- Heading -->
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold text-white tracking-tight mb-3">Personality Suite</h1>
          <p class="text-slate-400 text-base max-w-xs leading-relaxed">
            Build habits. Track consistency.<br>Discover your strengths.
          </p>
        </div>

        <!-- CTA -->
        <div class="w-full max-w-xs space-y-4">
          <button (click)="auth.login()"
            class="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-medium px-6 py-3.5 rounded-2xl transition-colors shadow-lg shadow-black/20 cursor-pointer">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p class="text-center text-xs text-slate-500 leading-relaxed">
            Your habits sync securely across all your devices.
          </p>
        </div>

      </div>

      <p class="text-center text-xs text-slate-700 py-6">© {{ year }} Personality Suite</p>

    </div>
  `,
})
export class LoginComponent {
  auth = inject(AuthService)
  year = new Date().getFullYear()
}
