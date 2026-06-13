import 'zone.js';

import {
  bootstrapApplication,
  provideNativeScriptRouter,
  runNativeScriptAngularApp,
} from '@nativescript/angular';
import '@angular/compiler';
import { provideZoneChangeDetection } from '@angular/core';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

runNativeScriptAngularApp({
  appModuleBootstrap: () => {
    return bootstrapApplication(AppComponent, {
      providers: [
        provideNativeScriptRouter(routes),
        provideZoneChangeDetection({ eventCoalescing: true }),
      ],
    });
  },
});
