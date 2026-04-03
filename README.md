# Personality Suite

Offline-first personal utility suite. Tracks daily habits and infers an emergent identity profile from them — no backend, no account, no network.

## Modules

### Habits
Log binary, quantity, and time-based habits. Each habit is tagged to one or two of eight personality dimensions. The tracker stores entries in IndexedDB, computes streaks, and renders a weekly grid view.

### Personality
A deterministic profile engine scores each of the eight dimensions based on habit adherence over a selected period (7 / 30 / 90 days). Output: a D3 radar chart, a one-sentence narrative, and a ranked dimension list.

## Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone, no NgModules) |
| Language | TypeScript (`strict: true`) |
| Styles | Tailwind CSS v4 |
| Persistence | Dexie.js v4 (IndexedDB) |
| Charts | D3.js |
| PWA | `@angular/pwa` |
| Deploy | Cloudflare Pages |

## Getting Started

```bash
npm install
npm start          # ng serve — opens http://localhost:4200
npm run build      # production build → dist/personality-suite/browser
```

## Project Layout

```
src/
├── app/
│   ├── core/
│   │   ├── db/          — DatabaseService (Dexie singleton)
│   │   ├── i18n/        — I18nService (signal-based, JSON-backed)
│   │   ├── models/      — Habit, HabitEntry types
│   │   └── utils/       — date helpers
│   ├── shared/
│   │   └── components/  — BottomNav, LanguageSelector
│   └── modules/
│       ├── habits/      — Today, Week, List, Form views + HabitsService
│       ├── personality/ — ProfileEngine, RadarChart, NarrativePhrase, DimensionList
│       └── settings/    — language switcher
└── assets/
    └── i18n/            — en.json, es.json
```

## Internationalization

The UI is fully localized. All user-visible strings live in `src/assets/i18n/{lang}.json`. To add a language:

1. Copy `en.json` → `{code}.json` and translate the values.
2. Add `{ code: '{code}', label: '...' }` to `AVAILABLE_LANGUAGES` in `language-selector.component.ts`.

The language selector is in Settings. Choice persists in `localStorage`.

## Deployment

Cloudflare Pages build settings:

- **Build command:** `npm run build`
- **Output directory:** `dist/personality-suite/browser`

The `public/_redirects` file handles SPA routing (`/* /index.html 200`).

## Architecture Notes

- **State:** Angular Signals throughout. `effect()` drives async loads from signal changes. No async inside `computed()`.
- **Data:** All reads/writes go through `HabitsService`. `DatabaseService` is the only place Dexie is instantiated.
- **Profile engine:** Pure function — no side effects. Batch-loads all entries for the period in one query to avoid N+1.
- **Radar chart:** `ChangeDetectionStrategy.OnPush` + `runOutsideAngular()` — Angular never touches the SVG subtree.
- **PostCSS:** Angular 21 reads only `postcss.config.json`. Tailwind v4 utilities require `@tailwindcss/postcss` (separate from the main `tailwindcss` package).
