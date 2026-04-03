# Personality Suite

Offline-first Angular 21 PWA that lets a single user track habits, tag them with personality context, and observe an emergent identity profile without any backend or account. Everything lives in IndexedDB, the UI is served as a single page, and the experience ships as a progressive web app with a service worker.

## Modules

### Habits
- **Today view** (`src/app/modules/habits/components/today-view/today-view.component.ts`) lists every active habit, shows a streak badge when appropriate, renders a progress bar, and surfaces the top three unfinished habits as “next actions.” Binary habits toggle by tapping the check, while quantity/time habits use inline inputs that store entries via `HabitsService.upsertEntry`.
- **Week view** (`week-view.component.ts`) renders a 7×N grid with four cell states (`completed`, `partial`, `pending`, `nodata`), derives weekday headers from the i18n bundle, and blocks forward navigation past the current week.
- **Habits list & form**: `HabitsListComponent` provides archive/delete actions, archived sections, and quick links into custom templates. `HabitFormComponent` covers create/edit flows, type toggles, dimension selection, template suggestions, and a “save as template” helper that stores presets through `HabitTemplateService`.

### Personality
- **Profile engine** (`ProfileEngineService`) batches Dexie queries for the selected 7/30/90‑day window, weights primary tags as 1.0 and secondary as 0.5, pulls sparse data toward neutral, and computes `dominantDimension`, `neglectedDimension (<20)`, and confidence per dimension.
- **Personality view** (`personality-view.component.ts`) renders a period selector, feeds the profile into the radar chart, narrative phrase, and dimension list, and calculates deltas versus the previous period for trend badges.
- **Radar chart** (`radar-chart.component.ts`) uses D3 outside Angular (`NgZone.runOutsideAngular()`), draws concentric circles, axes, and a filled polygon tinted by the dominant dimension.
- **Narrative phrase & dimension list** surface i18n-driven copy (`personality.narrative.*`), show scores/deltas/confidence, and highlight nulls in the list.
- **Onboarding tagging** (`onboarding-tagging.component.ts`) forces untagged habits to pick a primary dimension before the profile can be meaningful.

### Settings & Templates
- **Language selector** (`shared/components/language-selector`) switches between `assets/i18n/en.json` and `es.json`, persists the choice to `localStorage`, and is initialized before the app renders (see `app.config.ts`).
- **Template management** (`modules/settings/components/template-form.component.ts`) lets you save habit presets, auto-detect dimensions from the name (using a keyword and token-overlap heuristic), and shows the resulting suggestion message.
- **Custom templates list** appears both here and in the habits list so you can reuse presets when creating a habit.

## Architecture & stack
- Angular 21 standalone components + `provideRouter` in `src/app/app.config.ts` (no NgModules).
- TypeScript `strict: true` across the workspace, Tailwind CSS v4 utilities via `@tailwindcss/postcss` (`postcss.config.json`), and a small global `app.css` for fonts and background.
- IndexedDB persistence through Dexie.js v4 (`core/db/database.service.ts`) with tables for `habits`, `entries`, and `customTemplates` plus the `[habitId+date]` compound index introduced in version 3.
- D3.js for the radar chart, Angular Signals for UI state (`signal`, `computed`, `effect`), and RxJS only when idiomatic.
- Progressive Web App via `@angular/pwa` (service worker registered with `registerWhenStable:30000`) and `public/manifest.webmanifest` plus icon assets.
- Deployment targets Cloudflare Pages through Wrangler (`wrangler.jsonc` points at `dist/personality-suite/browser` with SPA `not_found_handling`).

## Data & persistence
`Habit` records track `name`, `type` (`binary|quantity|time`), `unit`/`targetValue` (when relevant), `dimensionPrimary`, `dimensionSecondary`, and optional timestamps. `HabitEntry` rows store `habitId`, `date` (YYYY‑MM‑DD from `core/utils/date.utils.ts`), `completed`, `value`, and `createdAt`. `StoredCustomTemplate` holds a `habit` preview and is mirrored into `HabitTemplate` objects once loaded into the `HabitTemplateService` signal. `DatabaseService` migrates entries cleanly by keeping the newest row per `[habitId|date]` and removing duplicates on upgrade to version 3.

## Services & flows
- `HabitsService` is the gatekeeper for CRUD, archives, `deleteHabit`, `getTodayEntries`, `getEntriesForPeriod`, `upsertEntry`, and streak calculations (including `calculateStreak` that walks backward up to 365 days).
- `HabitTemplateService` caches custom templates, persists them in Dexie, exposes `addCustomTemplate`/`deleteCustomTemplate`, and suggests dimensions via normalized name tokens + keyword priors (`KEYWORDS` mapped to each `DimensionId`).
- `ProfileEngineService` computes weighted adherence per dimension, applies a confidence factor that pulls sparse scores toward 50%, and returns `PersonalityProfile` records consumed by the radar chart and narrative components.
- `I18nService` fetches `assets/i18n/{lang}.json`, stores translations in a signal, interpolates `{{variable}}` placeholders, and exposes `t()`/`tArr()` helpers. Both it and `HabitTemplateService` run inside `APP_INITIALIZER` so the rest of the app renders only after they finished.
- `core/utils/date.utils.ts` keeps dates normalized with `toDateString`, `addDays`, and a Monday‑based `startOfWeek` helper used by the week view and profile engine.

## Localization
All user-facing strings live in `src/assets/i18n/en.json` and `es.json`. Keys cover navigation (`nav.*`), habit views, personality narratives, settings copy, and the dimension labels/descriptions (`dimensions.{id}`) that the UI reads at runtime. Changing languages updates the `currentLang` signal and persists to `localStorage`, while the language selector and settings screen both call `I18nService.setLanguage`.

## Running locally
1. `npm install`
2. `npm start` (aliases `ng serve --watch`) for a dev server at `http://localhost:4200`.
3. `npm run watch` keeps a rebuild loop running for faster feedback.
4. `npm test` runs the Angular tests configured in this workspace.

## D1 sync backend
- Worker entrypoint is [`worker/index.ts`](/home/valentin/Code/Repositories/personality-suite/worker/index.ts) and serves:
  - `GET /api/health`
  - `POST /api/sync/pull`
  - `POST /api/sync/push`
- D1 schema is in [`migrations/0001_init.sql`](/home/valentin/Code/Repositories/personality-suite/migrations/0001_init.sql) with `users`, `habits`, `habit_entries`, and `custom_templates` tables.
- Sync strategy uses last-write-wins (`updated_at`) plus tombstones (`deleted_at`) so deletes replicate safely.
- Current auth placeholder uses the `x-user-id` header. Replace this with verified identity (for example JWT/session) before production.

### Setup
1. Create the D1 database:
```bash
wrangler d1 create personality-suite
```
2. Copy the generated `database_id` into [`wrangler.jsonc`](/home/valentin/Code/Repositories/personality-suite/wrangler.jsonc) under `d1_databases[0].database_id`.
3. Apply migrations locally:
```bash
npm run d1:migrate:local
```
4. Apply migrations remotely:
```bash
npm run d1:migrate:remote
```
5. Run the Worker locally:
```bash
npm run worker:dev
```

### Sync payloads
Pull:
```json
{
  "since": "2026-04-03T00:00:00.000Z"
}
```

Push:
```json
{
  "habits": [],
  "entries": [],
  "templates": []
}
```

## Build & deploy
- `npm run build` produces `dist/personality-suite/browser` via the Angular build pipeline (esbuild + CLI).
- `npm run deploy` builds and then runs `wrangler deploy` (see `wrangler.jsonc` for `compatibility_date: "2026-04-03"`).
- `npm run preview` builds and runs `wrangler dev` for a local preview of the production bundle.

## Notes
- The bottom navigation (`shared/components/bottom-nav`) keeps the five routes (`/habits/today`, `/habits/week`, `/habits/list`, `/personality`, `/settings`) in sync with the router and highlights the active tab.
- Templates can be reused across flows: `HabitFormComponent` inspects `?template=custom-<id>` query params, shows matching buttons under the name input, and allows saving the current form as a new custom template.
- The personality narrative is deterministic: `personality.narrative.no_habits`, `dominant_peak`, `dominant_base`, and `neglected_suffix` cover every combination without LLMs or motivational language.
- Tailwind v4 utilities run through `@tailwindcss/postcss`, so keep `postcss.config.json` in sync and avoid other PostCSS loaders.
- Offline-first means zero outgoing network calls except the initial fetch for translations and the service worker manifest. The service worker is configured via `ngsw-config.json` and activated only in production builds.
