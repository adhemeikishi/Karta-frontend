import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RestaurantListComponent } from './restaurants/restaurant-list/restaurant-list.component';
import { RestaurantDetailComponent } from './restaurants/restaurant-detail/restaurant-detail.component';
import { MenuReviewComponent } from './menu/review/menu-review.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  // Site public de Karta : navbar + footer communs (PublicShellComponent), une page
  // par route. Karta est le produit → `/` affiche la landing directement (pas de
  // redirection vers l'espace privé). Tout est lazy-loadé : le site public ne doit
  // pas alourdir le bundle de l'espace d'administration, et inversement.
  {
    path: '',
    loadComponent: () =>
      import('./public/public-shell.component').then((m) => m.PublicShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
      },
      // `/landing` conservée en alias pour ne casser aucun lien existant.
      {
        path: 'landing',
        loadComponent: () => import('./landing/landing.component').then((m) => m.LandingComponent),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./public/pricing/pricing.component').then((m) => m.PricingComponent),
      },
      {
        path: 'features',
        loadComponent: () =>
          import('./public/features/features.component').then((m) => m.FeaturesComponent),
      },
      {
        path: 'faq',
        loadComponent: () => import('./public/faq/faq.component').then((m) => m.FaqComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./public/contact/contact.component').then((m) => m.ContactComponent),
      },
    ],
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
  // Une URL inconnue reste un visiteur public : on ne le pousse jamais vers
  // l'espace privé (voir §2/§3 du brief).
  { path: '**', redirectTo: '' },
];
