import { Injectable, signal, computed } from '@angular/core'

const TOKEN_KEY = 'ps_auth_token'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(this.readInitialToken())
  readonly isAuthenticated = computed(() => this._token() !== null)

  get token(): string | null {
    return this._token()
  }

  login(): void {
    window.location.href = '/api/auth/login'
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('ps_last_pull')
    localStorage.removeItem('ps_last_push')
    this._token.set(null)
  }

  private readInitialToken(): string | null {
    // Pick up token from OAuth redirect (?token=...)
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem(TOKEN_KEY, urlToken)
      window.history.replaceState({}, '', window.location.pathname)
      return urlToken
    }
    return localStorage.getItem(TOKEN_KEY)
  }
}
