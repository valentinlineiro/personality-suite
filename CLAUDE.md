# Personality Suite — CLAUDE.md

## Project Vision

Offline-first personal utility suite. Two modules in v1:

- **Habits** — daily habit tracking (binary, quantity, time)
- **Personality** — emergent identity profile inferred from habit data

The personality module is not a static test. The system infers who the user is becoming based on their actual behavior recorded in the habit tracker.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components) |
| Language | TypeScript strict (`strict: true`) |
| Styles | Tailwind CSS v4 via `@tailwindcss/postcss` |
| Persistence | Dexie.js v4 (IndexedDB) |
| Reactive state | Angular Signals + RxJS where idiomatic |
| Charts | D3.js (radar chart SVG) |
| PWA | `@angular/pwa` |
| Build | Angular CLI + esbuild |
| Deploy | Cloudflare Pages |

**No NgModules.** Everything standalone. No `app.module.ts`.

**PostCSS integration note:** Angular 21 only reads `postcss.config.json` (not `.mjs` or `.js`). Tailwind v4's PostCSS plugin lives in `@tailwindcss/postcss`, not the main `tailwindcss` package. Both facts must hold for utilities to be generated.

---

## Project Structure

```
src/
├── app/
│   ├── app.config.ts           — providers: router, APP_INITIALIZER (i18n)
│   ├── app.routes.ts           — lazy routes for habits, personality, settings
│   ├── app.ts                  — shell: <router-outlet> + <app-bottom-nav>
│   ├── core/
│   │   ├── db/
│   │   │   └── database.service.ts
│   │   ├── i18n/
│   │   │   └── i18n.service.ts
│   │   ├── models/
│   │   │   ├── habit.model.ts
│   │   │   └── habit-entry.model.ts
│   │   └── utils/
│   │       └── date.utils.ts
│   ├── shared/
│   │   └── components/
│   │       ├── bottom-nav/
│   │       ├── language-selector/
│   │       └── page-header/
│   └── modules/
│       ├── habits/
│       │   ├── components/
│       │   │   ├── today-view/
│       │   │   ├── week-view/
│       │   │   ├── habits-list/
│       │   │   └── habit-form/
│       │   ├── services/
│       │   │   └── habits.service.ts
│       │   └── habits.routes.ts
│       ├── personality/
│       │   ├── constants/
│       │   │   └── dimensions.ts
│       │   ├── engine/
│       │   │   └── profile-engine.service.ts
│       │   ├── components/
│       │   │   ├── personality-view/
│       │   │   ├── radar-chart/
│       │   │   ├── narrative-phrase/
│       │   │   ├── dimension-list/
│       │   │   └── onboarding-tagging/
│       │   └── personality.routes.ts
│       └── settings/
│           └── components/
│               └── settings.component.ts
└── assets/
    └── i18n/
        ├── en.json
        └── es.json
```

---

## Data Models

### `habit.model.ts`

```ts
export type HabitType = 'binary' | 'quantity' | 'time'

export type DimensionId =
  | 'vitality' | 'recovery'
  | 'focus' | 'creativity'
  | 'discipline' | 'execution'
  | 'presence' | 'autonomy'

export interface Habit {
  id?: number
  name: string
  type: HabitType
  unit?: string
  targetValue?: number
  dimensionPrimary: DimensionId | null
  dimensionSecondary: DimensionId | null
  createdAt: Date
  archivedAt?: Date
}
```

### `habit-entry.model.ts`

```ts
export interface HabitEntry {
  id?: number
  habitId: number
  date: string       // 'YYYY-MM-DD'
  completed: boolean
  value?: number     // for quantity and time types
  createdAt: Date
}
```

---

## Database (`database.service.ts`)

```ts
@Injectable({ providedIn: 'root' })
export class DatabaseService extends Dexie {
  habits!: Table<Habit, number>
  entries!: Table<HabitEntry, number>

  constructor() {
    super('PersonalitySuiteDB')
    this.version(1).stores({
      habits: '++id, name, type, dimensionPrimary, dimensionSecondary, createdAt, archivedAt',
      entries: '++id, habitId, date, completed, createdAt',
    })
  }
}
```

Injected as a singleton via DI. Do not instantiate Dexie anywhere else.

**Schema evolution:** bump `version(N)` for any schema change. Dexie migrations are additive — no data loss if done correctly. A `[habitId+date]` compound index would improve `getEntriesForPeriod` at scale — plan it for v2.

---

## i18n System

### `I18nService`

- Loads `assets/i18n/{lang}.json` via `fetch` at startup (via `APP_INITIALIZER`)
- Stores translations in a Signal — language switches trigger automatic re-renders
- Persists chosen language in `localStorage`
- API: `t(key, params?)` for strings, `tArr(key)` for arrays (e.g., day names)
- Keys use dot notation: `'dimensions.vitality.label'`, `'today.progress'`
- Interpolation: `{{variable}}` placeholders replaced from the `params` object

### Adding a language

1. Create `src/assets/i18n/{code}.json` — mirror the structure of `en.json`
2. Add `{ code, label }` to the `AVAILABLE_LANGUAGES` array in `language-selector.component.ts`

No code changes elsewhere are needed.

### Key structure (top-level sections)

`nav` · `today` · `week` · `habit_list` · `habit_form` · `personality` (includes `narrative`) · `onboarding` · `settings` · `dimensions` (label + description per dimension ID)

---

## Habits Module

### Views

**TodayView** — main and default view of the app.
- Lists all active habits for today's date
- Each habit shows: name, type, today's status
- Interaction by type:
  - `binary` → tap to toggle completed/pending
  - `quantity` / `time` → numeric input + unit + confirm button
- Global progress bar: "X / Y habits completed today"
- Streak badge (🔥 N) shown when streak ≥ 2

**WeekView**
- 7-column grid (Mon–Sun) × N rows (one habit per row)
- Day labels come from `i18n.tArr('week.days')` — locale-aware
- Cell states: completed (solid green) / partial (muted green, quantity/time only) / pending (empty) / no data (grey)
- Current week by default, navigate backwards; forward navigation disabled on current week
- Read-only

**HabitsList**
- Active habits with name, type, primary dimension badge
- Per-habit actions: edit, archive, delete (delete requires confirmation and removes all entries)
- Archived section collapsed by default

**HabitForm** (create / edit)
- Fields: name, type, unit + target (if quantity/time), primary dimension (required), secondary dimension (optional)
- Secondary dimension excludes the selected primary — computed via `availableSecondaryDimensions` Signal
- Edit mode pre-populates via `ActivatedRoute` param + `HabitsService.getHabitById`

### Business Logic (`habits.service.ts`)

```ts
getActiveHabits(): Promise<Habit[]>
getArchivedHabits(): Promise<Habit[]>
getHabitById(id: number): Promise<Habit | undefined>
createHabit(data: Omit<Habit, 'id' | 'createdAt'>): Promise<number>
updateHabit(id: number, data: Partial<Habit>): Promise<void>
archiveHabit(id: number): Promise<void>
deleteHabit(id: number): Promise<void>          // removes habit + all entries

getTodayEntries(date: string): Promise<HabitEntry[]>
getEntriesForPeriod(habitId: number, from: string, to: string): Promise<HabitEntry[]>
upsertEntry(habitId: number, date: string, data: Partial<HabitEntry>): Promise<void>
getStreak(habit: Habit): Promise<number>
```

Rules:
- Prefer archiving over deleting. `deleteHabit` is for emergency cleanup only.
- `upsertEntry`: query existing entry first, preserve `id` on update.
- `date` always in `'YYYY-MM-DD'` format.
- `getStreak`: walk backwards from yesterday (or today if already completed), count consecutive completed days.

---

## Personality Module

### The 8 Dimensions (`dimensions.ts`)

| ID | Cluster | Color |
|---|---|---|
| `vitality` | body | `#22c55e` |
| `recovery` | body | `#86efac` |
| `focus` | mind | `#3b82f6` |
| `creativity` | mind | `#a78bfa` |
| `discipline` | production | `#f59e0b` |
| `execution` | production | `#f97316` |
| `presence` | inner | `#ec4899` |
| `autonomy` | inner | `#06b6d4` |

Labels and descriptions are defined in `i18n` JSON, not hardcoded in `dimensions.ts`. Use `i18n.t('dimensions.{id}.label')` wherever a label is displayed.

### Profile Engine (`profile-engine.service.ts`)

Pure service. No side effects. Deterministic logic.

**Scoring algorithm per dimension:**

```
1. Filter active habits where dimensionPrimary === D or dimensionSecondary === D
2. Batch-load all entries for the period in one Dexie query (avoids N+1)
3. For each habit, adherence = (days completed / days in period) * 100
4. Weight: dimensionPrimary = 1.0, dimensionSecondary = 0.5
5. Score D = weighted average → value 0–100
6. If no habits assigned to D → score = null
```

`dominantDimension`: highest non-null score.
`neglectedDimension`: lowest non-null score below 20 (can be null).

### Narrative Phrase

No LLM. Deterministic templates from `i18n`. Priority:

1. `totalHabitsTagged === 0` → `personality.narrative.no_habits`
2. `dominantScore > 85` → `personality.narrative.dominant_peak` (`{{label}}`)
3. Base case → `personality.narrative.dominant_base` (`{{label}}`)
4. If `neglectedDimension` → append `personality.narrative.neglected_suffix` (`{{label}}`)

Tone: observational. No motivation, no emojis, no exclamation marks.

### PersonalityView — Layout

```
├── Header (i18n title + 7d / 30d / 90d period selector)
├── RadarChart (SVG — null axes in grey at 0.3 opacity)
├── NarrativePhrase
├── DimensionList (score desc, nulls last)
└── OnboardingBanner (if totalHabitsUntagged > 0)
```

Period selector updates profile via `effect()` reacting to a `signal<7 | 30 | 90>`.

### RadarChart

D3.js on SVG. Key contracts:
- `ChangeDetectionStrategy.OnPush` — Angular does not touch the SVG
- All D3 code runs inside `ngZone.runOutsideAngular()`
- Render triggered by `ngAfterViewInit` (first) and `ngOnChanges` (updates)
- Null scores plot at 0, axis rendered in `#334155` at 0.3 opacity
- Filled polygon uses `dominantDimension` color at 0.15 fill opacity

---

## Navigation

Bottom nav with 5 items:

| Label | Route |
|---|---|
| Today | `/habits/today` |
| Week | `/habits/week` |
| List | `/habits/list` |
| Profile | `/personality` |
| Settings | `/settings` |

Default route: `/habits/today`

### Settings

`SettingsComponent` at `/settings` embeds `LanguageSelectorComponent`. Language choice persists in `localStorage` and is restored via `APP_INITIALIZER` before first render.

---

## Project Rules

- **Offline-first.** Zero network calls. Everything in Dexie/IndexedDB.
- **Standalone components.** No NgModules.
- **Angular Signals** for UI state. RxJS only where idiomatic.
- **Strict TypeScript.** `strict: true`. No `any`.
- **Tailwind for styles.** No component CSS except the radar SVG.
- **No new dependencies** without explicit justification.
- **One service per responsibility.**
- **i18n all user-visible strings.** No hardcoded UI text in templates. Keys live in `assets/i18n/*.json`.
- **Prefer archiving over deleting.** `deleteHabit` exists but is destructive — confirm before use.
