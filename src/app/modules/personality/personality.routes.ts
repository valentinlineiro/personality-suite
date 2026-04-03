import { Routes } from '@angular/router'

export const PERSONALITY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/personality-view/personality-view.component').then(
        m => m.PersonalityViewComponent
      ),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./components/onboarding-tagging/onboarding-tagging.component').then(
        m => m.OnboardingTaggingComponent
      ),
  },
]
