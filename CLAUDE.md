# Personality Suite — Project Reference

## Vision
Personality Suite pairs a compact habit tracker with an emergent personality profile. Every interaction stays offline (IndexedDB via Dexie), the UI ships as a single-page PWA, and the system rewards tagging habits with personality dimensions so the profile engine can surface meaningful strengths and gaps.

## Layout
```
src/
├── app/
│   ├── app.ts              — root shell + bottom nav
│   ├── app.routes.ts       — lazy routes for habits, personality, settings
│   ├── app.config.ts       — router + APP_INITIALIZERs + service worker
│   └── core/               — services, models, utils
│       ├── db/             — Dexie schema + migration helpers
│       ├── i18n/           — translation loader signal
│       ├── models/         — Habit & HabitEntry definitions
│       └── utils/           — date helpers
│   └── modules/
│       ├── habits/         — views, services, template helpers
│       ├── personality/    — profile engine, radar, narrative, onboarding
│       └── settings/        — template form + language selector
├── assets/i18n/            — `en.json`, `es.json`
├── public/                 — manifest + icons
└── postcss.config.json     — Tailwind v4 plugin
```

## Bootstrapping & routing
- `src/main.ts` bootstraps `App` with `appConfig`.
- `app.config.ts` wires `provideRouter(routes, withComponentInputBinding())`, registers `ngsw-worker.js` (PWA), and adds two `APP_INITIALIZER`s that await `I18nService.init()` and `HabitTemplateService.init()`.
- The router defaults to `/habits/today` and lazy-loads the three module routes (`habits`, `personality`, `settings`). `HABITS_ROUTES` exposes `/today`, `/week`, `/list`, `/new`, `/edit/:id`; `PERSONALITY_ROUTES` maps `/` to the profile view and `/onboarding` to the tagging lane.

## Habits module
### Views & UX
- `TodayViewComponent` (`habits/components/today-view`) builds a `rows` signal of `HabitRow` objects, renders a progress bar, tracks streaks (≥2 shows a badge), and computes `nextActions()` to highlight the top three unfinished habits sorted by streak risk. Binary habits toggle with `toggleBinary`, while quantity/time habits capture numeric input and persist via `HabitsService.upsertEntry`.
- `WeekViewComponent` pulls active habits, batches `getEntriesForHabitsInPeriod`, and populates each habit’s 7-cell row with `CellState` (`completed`, `partial`, `pending`, `nodata`). Navigation buttons move the `weekStart` signal backward or forward (forward disabled when already on the current week).
- `HabitsListComponent` lists active habits with dimension badges, archive/delete actions (delete confirms and removes entries), and an archived section that expands/collapses. Custom templates render above the list so you can jump to `/habits/new?template=custom-<id>`.
- `HabitFormComponent` handles new/edit forms: Reactive Forms control `name`, `type`, `unit`, `targetValue`, `dimensionPrimary`, `dimensionSecondary`, and `selectedType` toggles the view. Matching templates appear beneath the name input, templates are applied to prefill fields, and saving as a template persists via `HabitTemplateService`. Secondary dimension options exclude the primary selection via `availableSecondaryDimensions`.

### Services
- `HabitsService` (in `modules/habits/services`) exposes `getActiveHabits`, `getHabitById`, `createHabit`, `updateHabit`, `archiveHabit`, `deleteHabit`, `getTodayEntries`, `getEntriesForPeriod`, `getEntriesForHabitsInPeriod`, `upsertEntry`, `getStreaks`, and `getStreak`. `upsertEntry` uses the `[habitId+date]` compound index to avoid duplicates, and `getStreaks` builds a streak map by calling `calculateStreak`, which walks backward up to 365 days.
- `HabitTemplateService` stores custom templates in the Dexie `customTemplates` table, exposes `templates` as a computed signal, and provides `addCustomTemplate`, `deleteCustomTemplate`, and `suggestDimensions(name: string)` (normalized tokens + keyword priors) for auto-tagging hints.

### Models
- `Habit` (`core/models/habit.model.ts`): `id`, `name`, `type`, optional `unit`/`targetValue`, `dimensionPrimary`, `dimensionSecondary`, `createdAt`, `archivedAt`.
- `HabitEntry` (`core/models/habit-entry.model.ts`): `id`, `habitId`, `date` (`YYYY-MM-DD`), `completed`, optional `value`, `createdAt`.
- `HabitTemplate` / `StoredCustomTemplate` define the shape of template presets stored in Dexie.

## Personality module
### Constants
`dimensions.ts` enumerates eight dimensions with `cluster`, `label`, `description`, `color`, and `examples`. This list drives badges, legend colors, and keyword examples for template detection.

| Dimension | Cluster | Color | Examples |
|-----------|---------|-------|----------|
| vitality | body | #22c55e | exercise, steps, nutrition |
| recovery | body | #86efac | sleep, rest, stretch |
| focus | mind | #3b82f6 | study, deep work, coding |
| creativity | mind | #a78bfa | writing, design, music |
| discipline | production | #f59e0b | routine, plan, organize |
| execution | production | #f97316 | ship, deliver, publish |
| presence | inner | #ec4899 | journaling, meditation |
| autonomy | inner | #06b6d4 | personal projects, exploration |

### Profile engine
`ProfileEngineService` computes a `PersonalityProfile` for a sliding window (7/30/90 days). Steps:
1. Load active habits (a habit counts only if it still exists).
2. Batch-load entries for the entire period via Dexie once and group by `habitId`.
3. For each dimension, merge primary habits (weight 1.0) and secondary habits (weight 0.5).
4. For each habit, calculate `adherence = (completedDays / days) * 100`, derive `confidence` from how many days were tracked (capped at 14), and pull the score toward 50% by multiplying `(adherence - 50) * confidence`.
5. Aggregate weighted adherence/confidence, round, and include `habitsCount`.
6. `dominantDimension` is the highest non-null score; `neglectedDimension` is the lowest score below 20.
7. `computeProfileForEndDate` lets the UI compare the current and previous windows to compute deltas per dimension.

### Components
- **PersonalityView** (`personality-view.component.ts`) manages `selectedDays`, triggers the engine via `effect`, shows a loading spinner, and passes the profile to the radar, narrative, dimension list, and onboarding banner (if any habits lack a primary dimension).
- **RadarChartComponent** draws the polar grid with D3, uses `ChangeDetectionStrategy.OnPush`, runs outside Angular, and highlights the dominant dimension’s color for the filled polygon plus the outer stroke.
- **NarrativePhraseComponent** picks from four i18n templates: `no_habits`, `no_data`, `dominant_peak`/`dominant_base`, and optionally appends `neglected_suffix` when a weak dimension exists.
- **DimensionListComponent** sorts scores descending (null scores last), renders percentage bars, shows deltas (`trend_up`, `trend_down`, `trend_flat`) relative to the previous window, and prints confidence as a short label.
- **OnboardingTaggingComponent** (`/personality/onboarding`) gathers habits missing `dimensionPrimary` and updates them in batch before returning to the profile view.

## Settings module
- `SettingsComponent` groups language settings and the template form, lists saved templates with “use template” + delete actions, and anchors the template form with `#templates` so the habits list can link into it.
- `TemplateFormComponent` duplicates the habit form fields, has an `autoDetectOnNameBlur` hook that only runs when the primary dimension is blank, and shows `suggestionMessage`/`message` signals after applying suggestions or saving.
- `LanguageSelectorComponent` iterates over `[{ code: 'en', label: 'EN' }, { code: 'es', label: 'ES' }]` and toggles `I18nService.currentLang`.

## Shared UI
- `BottomNavComponent` fixes a five-tab bar at the screen bottom, highlights the active route, and uses inline SVG icons with i18n labels (`nav.today`, `nav.week`, `nav.list`, `nav.profile`, `nav.settings`).

## Database & migration
`DatabaseService` extends Dexie and defines three versions:
1. Version 1: `habits` and `entries` (no custom templates).
2. Version 2: adds `customTemplates` table.
3. Version 3: adds the compound `[habitId+date]` index on `entries` and runs an upgrade that keeps only the latest entry per habit/day via `getEntryIdsToKeepForUniqueHabitDate`.

## Services & heuristics
- `HabitTemplateService`’s `suggestDimensions` normalizes the habit name, checks for exact template matches, scores overlaps with existing templates, and falls back to the `KEYWORDS` map for each `DimensionId` (e.g., `vitality` keywords include `run`, `gym`, `steps`; `creativity` includes `write`, `drawing`, `music`). Suggestions return `DimensionSuggestion` with `primary`, optional secondary, and a `confidence` 25‑95.
- `ProfileEngineService.getConfidence` limits required samples to `min(days, 14)` so that extremely sparse logging yields lower confidence.
- `HabitsService.calculateStreak` walks backward from today (or yesterday if today is incomplete) and stops once a day is missed.

## Scripts & deployment
- `npm start`: `ng serve --watch`.
- `npm run watch`: watch build (`ng build --watch --configuration development`).
- `npm run build`: production build via Angular CLI (outputs to `dist/personality-suite/browser`).
- `npm run test`: runs `ng test`.
- `npm run deploy`: builds and runs `wrangler deploy` (see `wrangler.jsonc` compatibility date `2026-04-03` and `assets.directory`).
- `npm run preview`: builds and runs `wrangler dev` for local Cloudflare previews.

## Localization assets & workflow
`I18nService.init()` runs before the app renders, loads `assets/i18n/{lang}.json` by fetching, stores the translation table in a signal, and writes the chosen language to `localStorage`. Templates use dot notation for sections (`today.*`, `week.*`, `personality.*`, `settings.*`, `dimensions.{id}.{label|description|examples}`). `LanguageSelectorComponent` calls `setLanguage` and the selector buttons rerender via the `currentLang` signal.

## Infrastructure notes
- `postcss.config.json` only references `@tailwindcss/postcss`, which is how Tailwind v4 ships utilities for Angular 21.
- `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })` ensures the worker registers once the app is stable.
- `public/manifest.webmanifest`, `public/icons/*`, and `ngsw-config.json` keep the PWA installable.
- `wrangler.jsonc`’s `assets.not_found_handling: "single-page-application"` mirrors Angular’s client-side routing fallbacks.

