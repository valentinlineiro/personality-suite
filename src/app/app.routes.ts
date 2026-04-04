import { Routes } from '@angular/router'
import { authGuard } from './core/auth/auth.guard'

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./modules/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'habits',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/habits/habits.routes').then(m => m.HABITS_ROUTES),
  },
  {
    path: 'personality',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./modules/personality/personality.routes').then(m => m.PERSONALITY_ROUTES),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/settings/components/settings.component').then(m => m.SettingsComponent),
  },
  { path: '', redirectTo: '/habits/today', pathMatch: 'full' },
]
