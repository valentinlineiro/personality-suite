import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { I18nService } from './core/i18n/i18n.service';
import { HabitTemplateService } from './modules/habits/services/habit-template.service';
import { SyncService } from './core/sync/sync.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => inject(I18nService).init()),
    provideAppInitializer(() => inject(HabitTemplateService).init()),
    provideAppInitializer(() => { inject(SyncService).pull(); }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
