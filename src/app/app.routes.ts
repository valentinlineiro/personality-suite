import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: 'habits',
    loadChildren: () =>
      import('./modules/habits/habits.routes').then(m => m.HABITS_ROUTES),
  },
  {
    path: 'personality',
    loadChildren: () =>
      import('./modules/personality/personality.routes').then(m => m.PERSONALITY_ROUTES),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./modules/settings/components/settings.component').then(m => m.SettingsComponent),
    data: { title: 'Settings' },
  },
  { path: '', redirectTo: '/habits/today', pathMatch: 'full' },
]
