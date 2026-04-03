import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { I18nService } from './core/i18n/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    {
      provide: APP_INITIALIZER,
      useFactory: (i18n: I18nService) => () => i18n.init(),
      deps: [I18nService],
      multi: true,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
