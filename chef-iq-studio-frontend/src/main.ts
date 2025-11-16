// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\frontend\src\main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http'; // <-- Import provideHttpClient

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// NEW: Import and register Swiper custom elements globally
import { register as registerSwiperElements } from 'swiper/element/bundle';
registerSwiperElements(); // Call it ONCE at app startup to register the <ion-slides> and <ion-slide> web components
// END NEW

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient() // <-- Add provideHttpClient here
  ],
});