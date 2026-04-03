import { Routes } from '@angular/router'

export const HABITS_ROUTES: Routes = [
  {
    path: 'today',
    loadComponent: () =>
      import('./components/today-view/today-view.component').then(m => m.TodayViewComponent),
  },
  {
    path: 'week',
    loadComponent: () =>
      import('./components/week-view/week-view.component').then(m => m.WeekViewComponent),
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./components/habits-list/habits-list.component').then(m => m.HabitsListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./components/habit-form/habit-form.component').then(m => m.HabitFormComponent),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./components/habit-form/habit-form.component').then(m => m.HabitFormComponent),
  },
  { path: '', redirectTo: 'today', pathMatch: 'full' },
]
