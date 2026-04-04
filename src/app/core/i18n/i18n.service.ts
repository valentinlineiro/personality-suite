import { Injectable, signal } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class I18nService {
  private _translations = signal<Record<string, unknown>>({})
  currentLang = signal<string>('en')

  async init(): Promise<void> {
    const saved = localStorage.getItem('lang') ?? 'en'
    await this.setLanguage(saved)
  }

  async setLanguage(lang: string): Promise<void> {
    const res = await fetch(`/assets/i18n/${lang}.json`)
    if (!res.ok) {
      if (lang !== 'en') {
        await this.setLanguage('en')
      }
      return
    }
    const data = await res.json()
    this._translations.set(data)
    this.currentLang.set(lang)
    localStorage.setItem('lang', lang)
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translations = this._translations()
    const value = this.resolve(translations, key)
    if (typeof value !== 'string') return key
    if (!params) return value
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''))
  }

  tArr(key: string): string[] {
    const translations = this._translations()
    const value = this.resolve(translations, key)
    return Array.isArray(value) ? value : []
  }

  private resolve(obj: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part]
      return undefined
    }, obj)
  }
}
