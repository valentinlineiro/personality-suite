# PersonalitySuite

Offline-first personal utility suite with habit tracking and an emergent personality profile.

## Vision & Modules

- **Habits** — track binary, quantity, and time-based habits with units, targets, and dimension tagging. Includes daily progress, archives, and an edit/create form.
- **Personality** — infer the user’s active identity from tagged habit data via a deterministic profile engine, radar chart, and narrative phrasing.
- **Settings** — access language preferences (EN/ES) and other config-level controls from a dedicated screen linked in the bottom navigation.

## Key Features

- Offline-first persistence via Dexie (IndexedDB) with no network dependencies.
- Standalone Angular components powered by Signals for reactive state.
- Tailwind CSS utility styling plus D3.js for the radar visualization.
- Fully localized UI through the custom `I18nService` and JSON dictionaries per language.
- Bottom navigation that surfaces Today / Week / Personality / Settings routes.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Angular 21+ (standalone components, no NgModules) |
| Language | TypeScript with `strict: true` |
| Styles | Tailwind CSS (via `@tailwindcss/cli`) |
| Persistence | Dexie.js (IndexedDB) |
| Reactive State | Angular Signals (+ RxJS where idiomatic) |
| Charts | D3.js radar chart |
| PWA | `@angular/service-worker` |
| Build | Angular CLI |

## Project Layout

- `src/app/app.ts` – shell with router outlet and bottom navigation.
- `src/app/app.routes.ts` – lazy routes for Habits, Personality, and Settings modules.
- `src/app/core/` – models, utilities, and `I18nService`.
- `src/app/shared/components/` – reusable UI (BottomNav, LanguageSelector, etc.).
- `src/app/modules/` – Habits and Personality submodules plus the Settings page with language controls.
- `src/assets/i18n/` – JSON translations (`en.json`, `es.json`).

## Getting Started

### Development server

```bash
npm install
ng serve
```

Open `http://localhost:4200/`; the app automatically reloads on source changes.

### Building

```bash
ng build
```

Outputs optimized bundles in `dist/personality-suite` and copies `public` plus `src/assets` (including localization files).

### Testing

- Unit tests: `ng test`
- (Future) End-to-end: add your preferred framework (`ng e2e` placeholder).

## Additional Notes

- Navigation links are persisted via the bottom nav for Today, Week, List, Personality, and Settings.
- Language preferences are stored in `localStorage` and applied via an `APP_INITIALIZER`.
- Follow the implementation order in `CLAUDE.md` for consistent upgrades and feature sequencing.
- Habit creation exposes curated templates so you can tap a preset to populate the form before tweaking values (`src/app/modules/habits/data/habit-templates.ts`). Matching suggestions appear as you type.
- Template management moved to Settings (Habit templates section) where you can add new entries via a dedicated template form and see the list of saved templates.
- Active habits can be archived or deleted from the list view; deleting removes the habit and all its entries after a confirmation prompt.
