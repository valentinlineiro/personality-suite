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
| Framework | Angular 18+ (standalone components) |
| Language | TypeScript strict (`strict: true`) |
| Styles | Tailwind CSS |
| Persistence | Dexie.js (IndexedDB) |
| Reactive state | Angular Signals + RxJS where idiomatic |
| Charts | D3.js (radar chart SVG) |
| PWA | @angular/pwa |
| Build | Angular CLI |
| Deploy | Cloudflare Pages |

**No NgModules.** Everything standalone. No `app.module.ts`.

---

## Project Structure

```
src/
├── app/
│   ├── app.config.ts
│   ├── app.routes.ts
│   ├── core/
│   │   ├── db/
│   │   │   └── database.service.ts
│   │   └── models/
│   │       ├── habit.model.ts
│   │       └── habit-entry.model.ts
│   ├── shared/
│   │   └── components/
│   │       ├── bottom-nav/
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
│       └── personality/
│           ├── constants/
│           │   └── dimensions.ts
│           ├── engine/
│           │   └── profile-engine.service.ts
│           ├── components/
│           │   ├── personality-view/
│           │   ├── radar-chart/
│           │   ├── narrative-phrase/
│           │   ├── dimension-list/
│           │   └── onboarding-tagging/
│           └── personality.routes.ts
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
import Dexie, { Table } from 'dexie'
import { Injectable } from '@angular/core'
import { Habit } from '../models/habit.model'
import { HabitEntry } from '../models/habit-entry.model'

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

---

## Habits Module

### Views

**TodayView** — main and default view of the app.
- Lists all active habits for today's date
- Each habit shows: name, type, today's status
- Interaction by type:
  - `binary` → tap to toggle completed/pending
  - `quantity` → numeric input + unit + confirm button
  - `time` → minutes input + confirm button
- Global progress indicator: "X / Y habits completed today"
- Quick access to create a new habit

**WeekView**
- 7-column grid (Mon–Sun) × N rows (one habit per row)
- Cell states: completed (solid color) / partial (muted color, quantity/time only) / pending (empty) / no data (grey)
- Current week by default, with navigation to previous weeks
- Read-only — not editable from this view

**HabitsList**
- List of all active habits with name, type, and primary dimension
- Per-habit actions: edit, archive
- Separate section for archived habits (collapsed by default)
- Button to create a new habit

**HabitForm** (create / edit)
- Fields: name (required), type (required), unit (if quantity/time), target (if quantity/time)
- `dimensionPrimary` — select from 8 dimensions (required on creation, editable)
- `dimensionSecondary` — select from 8 dimensions + "None" (optional, cannot equal primary)
- On edit: pre-populate with current values

### Business Logic (`habits.service.ts`)

Required methods:

```ts
getActiveHabits(): Promise<Habit[]>
getArchivedHabits(): Promise<Habit[]>
createHabit(data: Omit<Habit, 'id' | 'createdAt'>): Promise<number>
updateHabit(id: number, data: Partial<Habit>): Promise<void>
archiveHabit(id: number): Promise<void>

getTodayEntries(date: string): Promise<HabitEntry[]>
getEntriesForPeriod(habitId: number, from: string, to: string): Promise<HabitEntry[]>
upsertEntry(habitId: number, date: string, data: Partial<HabitEntry>): Promise<void>
```

Rules:
- Never permanently delete habits — only archive (`archivedAt = now`)
- Entries are immutable once created; use upsert to update the same day
- `date` always in `'YYYY-MM-DD'` format

### Streak Logic

Calculate the current streak for each habit in TodayView:
- Streak = consecutive days completed up to yesterday (or today if already completed)
- For `quantity` and `time`: completed = `value >= targetValue`
- Only display if streak >= 2

---

## Personality Module

### The 8 Dimensions (`dimensions.ts`)

```ts
export interface Dimension {
  id: DimensionId
  cluster: 'body' | 'mind' | 'production' | 'inner'
  label: string
  description: string
  color: string
  examples: string[]
}

export const DIMENSIONS: Dimension[] = [
  { id: 'vitality',   cluster: 'body',       label: 'Vitality',    description: 'Active physical investment',          color: '#22c55e', examples: ['exercise', 'steps', 'nutrition'] },
  { id: 'recovery',   cluster: 'body',       label: 'Recovery',    description: 'Wear management',                     color: '#86efac', examples: ['sleep', 'active rest'] },
  { id: 'focus',      cluster: 'mind',       label: 'Focus',       description: 'Deep cognitive work',                 color: '#3b82f6', examples: ['technical reading', 'deep work'] },
  { id: 'creativity', cluster: 'mind',       label: 'Creativity',  description: 'Generative output',                   color: '#a78bfa', examples: ['writing', 'personal builds'] },
  { id: 'discipline', cluster: 'production', label: 'Discipline',  description: 'Systems consistency',                 color: '#f59e0b', examples: ['fixed routines'] },
  { id: 'execution',  cluster: 'production', label: 'Execution',   description: 'Progress on real projects',           color: '#f97316', examples: ['commits', 'deliverables'] },
  { id: 'presence',   cluster: 'inner',      label: 'Presence',    description: 'Deliberate self-observation',         color: '#ec4899', examples: ['journaling', 'meditation'] },
  { id: 'autonomy',   cluster: 'inner',      label: 'Autonomy',    description: 'Self-direction outside of work',      color: '#06b6d4', examples: ['personal projects'] },
]

export const getDimension = (id: DimensionId): Dimension =>
  DIMENSIONS.find(d => d.id === id)!
```

### Profile Engine (`profile-engine.service.ts`)

Pure service. No side effects. Deterministic logic.

**Scoring algorithm per dimension:**

```
1. Filter active habits where dimensionPrimary === D or dimensionSecondary === D
2. For each habit, calculate adherence over the period:
     adherence = (days completed / days in period) * 100
3. Weight: dimensionPrimary = 1.0, dimensionSecondary = 0.5
4. Score D = weighted average of adherences → value 0–100
5. If no habits are assigned to D → score = null
```

**Output:**

```ts
export interface DimensionScore {
  dimensionId: DimensionId
  score: number | null
  habitsCount: number
}

export interface PersonalityProfile {
  period: { days: number; from: Date; to: Date }
  scores: DimensionScore[]
  dominantDimension: DimensionId | null
  neglectedDimension: DimensionId | null
  totalHabitsTagged: number
  totalHabitsUntagged: number
}
```

Exposed method: `async computeProfile(days: number): Promise<PersonalityProfile>`

### Narrative Phrase

No LLM. Deterministic conditional templates. Priority top to bottom:

1. `totalHabitsTagged === 0` → *"Tag your habits to see your profile."*
2. `dominantScore > 85` → *"`{label}` at peak — consolidation zone."*
3. Base case → *"This week you've been primarily `{label}`."*
4. Suffix if `neglectedScore < 20` → append *"`{label}` has been at a low for weeks."*

Tone: observational. No motivation, no emojis, no exclamation marks.

### PersonalityView — Layout

```
├── Header ("Active Identity" + 7d / 30d / 90d selector)
├── RadarChart (SVG 8 axes — null axes rendered in grey)
├── NarrativePhrase (2–3 sentences)
├── DimensionList (sorted by score desc, nulls last)
└── OnboardingBanner (conditional — if totalHabitsUntagged > 0)
```

The period selector updates the profile reactively via Signal.

### RadarChart

Implement with D3.js on SVG. Use `ViewChild` + `ElementRef` for the container — let D3 operate within that element without Angular change detection interference. Axes with a `null` score are rendered in grey at 0.3 opacity. The filled area uses the dominant dimension's color at 0.2 opacity.

### OnboardingTagging

Flow for existing habits without `dimensionPrimary`. List of untagged habits with an inline dropdown per item. "Save all" button at the bottom. Not a blocking modal — accessible from the banner in PersonalityView.

---

## Navigation

Bottom nav with 3 items:

| Icon | Label | Route |
|---|---|---|
| ✓ | Today | `/habits/today` |
| ◻ | Week | `/habits/week` |
| ◉ | Profile | `/personality` |

Default route: `/habits/today`

---

## Project Rules

- **Offline-first.** Zero network calls. Everything in Dexie/IndexedDB.
- **Standalone components.** No NgModules.
- **Angular Signals** for UI state. RxJS only where idiomatic.
- **Strict TypeScript.** `strict: true`. No `any`.
- **Tailwind for styles.** No component CSS except for the radar SVG.
- **No new dependencies** without explicit justification.
- **One service per responsibility.**
- **Never delete data.** Archive habits. Entries are immutable.

---

## Implementation Order

1. Scaffold: `ng new personality-suite --routing --style=css --standalone`
2. `npm install dexie`
3. Configure Tailwind CSS
4. `DatabaseService` + models
5. `dimensions.ts`
6. `HabitsService`
7. `HabitForm` + `HabitsList` (full CRUD with dimension tagging)
8. `TodayView` with streak logic
9. `WeekView`
10. `BottomNav` + routing
11. `ProfileEngineService`
12. `RadarChart` (D3 + ViewChild)
13. `NarrativePhrase`
14. `PersonalityView`
15. `OnboardingTagging`
16. `ng add @angular/pwa`
17. Configure Cloudflare Pages: add `_redirects` file with `/* /index.html 200`

Do not skip steps. The engine produces garbage without clean data.
