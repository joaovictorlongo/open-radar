import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/map', pathMatch: 'full' },
  { path: 'map', loadComponent: () => import('./map/map.component').then(m => m.MapComponent) },
];
