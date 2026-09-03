import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RestaurantListComponent } from './restaurants/restaurant-list/restaurant-list.component';
import { RestaurantDetailComponent } from './restaurants/restaurant-detail/restaurant-detail.component';
import { MenuReviewComponent } from './menu/review/menu-review.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'admin/dashboard' },
  // Landing page publique — exploration de 5 directions visuelles (voir §6 du brief),
  // route ajoutée sans toucher aux routes existantes ni au comportement de `''`.
  // Lazy-loadée : 5 variantes ne doivent pas alourdir le bundle initial du back-office.
  {
    path: 'landing',
    loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
  },
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'restaurants', component: RestaurantListComponent },
      { path: 'restaurants/:id', component: RestaurantDetailComponent },
      // Relire une carte entière est un travail qu'on interrompt et reprend :
      // écran plein et adressable, pas une modale.
      { path: 'restaurants/:id/menu/review', component: MenuReviewComponent },
    ],
  },
  { path: '**', redirectTo: 'admin/dashboard' },
];
