import { Routes } from '@angular/router';
import { adminGuard } from './services/admin.guard';
import { authGuard } from './services/auth.guard';
import { onboardingEntryGuard, onboardingGuard } from './onboarding/onboarding.guard';
import { restaurantAccessGuard, restaurateurGuard } from './services/restaurateur.guard';

export const routes: Routes = [
  // Site public de Karta : navbar + footer communs (PublicShellComponent), une page
  // par route. Karta est le produit → `/` affiche la landing directement (pas de
  // redirection vers l'espace privé). Tout est lazy-loadé : le site public ne doit
  // pas alourdir le bundle de l'espace d'administration, et inversement. La même règle
// vaut pour le back-office et la connexion : rien n'est chargé avant d'être demandé.
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
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  // Parcours de création, avant tout compte : la carte se construit d'abord, le
  // compte vient quand le restaurateur veut son QR.
  //
  // Tout est chargé à la demande, garde comprise (voir create.routes.ts) : rien de ce
  // parcours ne doit peser sur le démarrage du produit.
  //
  // `/karta-ai` est hors du châssis : écran plein, sans navigation. Sans brouillon,
  // le composant renvoie lui-même à l'accueil.
  {
    path: 'karta-ai',
    loadComponent: () => import('./create/karta-ai.component').then((m) => m.KartaAiComponent),
  },
  {
    path: 'create',
    loadChildren: () => import('./create/create.routes').then((m) => m.CREATE_ROUTES),
  },
  {
    path: 'admin',
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    // `authGuard` : être connecté. `adminGuard` : être Karta, pas un restaurateur —
    // le backend le refuse déjà, ceci évite un écran couvert d'erreurs 403.
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'restaurants',
        loadComponent: () =>
          import('./restaurants/restaurant-list/restaurant-list.component').then(
            (m) => m.RestaurantListComponent,
          ),
      },
      {
        path: 'restaurants/:id',
        loadComponent: () =>
          import('./restaurants/restaurant-detail/restaurant-detail.component').then(
            (m) => m.RestaurantDetailComponent,
          ),
      },
      // Relire une carte entière est un travail qu'on interrompt et reprend :
      // écran plein et adressable, pas une modale.
      {
        path: 'restaurants/:id/menu/review',
        loadComponent: () =>
          import('./menu/review/menu-review.component').then((m) => m.MenuReviewComponent),
      },
    ],
  },
  // Espace Restaurateur : le restaurateur gère SA carte, il ne voit jamais le
  // back-office. Le restaurant courant est porté par l'URL (`:restaurantId`), mais
  // l'URL ne fait jamais autorité : `restaurantAccessGuard` la confronte à l'identité
  // renvoyée par `/api/admin/me`, et le backend refuse de son côté (RestaurateurScopeFilter).
  {
    path: 'app',
    canActivate: [authGuard, restaurateurGuard],
    loadComponent: () =>
      import('./restaurateur/restaurant-picker.component').then((m) => m.RestaurantPickerComponent),
  },
  // Parcours de configuration d'un nouveau restaurant. Le restaurant vient de l'identité
  // du compte, jamais de l'URL : il n'y a donc rien à falsifier dans la barre d'adresse.
  // L'étape courante est déduite de l'état réel du serveur (voir OnboardingService), ce
  // qui rend la reprise gratuite — y compris depuis un autre appareil.
  {
    path: 'onboarding',
    canActivate: [authGuard, restaurateurGuard],
    loadComponent: () =>
      import('./onboarding/onboarding-shell.component').then((m) => m.OnboardingShellComponent),
    children: [
      // `''` ne rend rien : la garde renvoie vers l'étape où en est le restaurateur.
      { path: '', pathMatch: 'full', canActivate: [onboardingEntryGuard], children: [] },
      {
        path: 'welcome',
        loadComponent: () => import('./onboarding/welcome.component').then((m) => m.WelcomeComponent),
      },
      {
        path: 'menu',
        loadComponent: () => import('./onboarding/import.component').then((m) => m.ImportComponent),
      },
      {
        path: 'processing',
        loadComponent: () =>
          import('./onboarding/processing.component').then((m) => m.ProcessingComponent),
      },
      // Le même écran de Review que le back-office et l'Espace Restaurateur.
      {
        path: 'review',
        data: { space: 'onboarding' },
        loadComponent: () =>
          import('./menu/review/menu-review.component').then((m) => m.MenuReviewComponent),
      },
      {
        path: 'style',
        loadComponent: () => import('./onboarding/style.component').then((m) => m.StyleComponent),
      },
      {
        path: 'publish',
        loadComponent: () => import('./onboarding/publish.component').then((m) => m.PublishComponent),
      },
      {
        path: 'success',
        loadComponent: () => import('./onboarding/success.component').then((m) => m.SuccessComponent),
      },
      { path: '**', redirectTo: '' },
    ],
  },
  {
    path: 'app/:restaurantId',
    // `onboardingGuard` : tant que le restaurant n'a jamais été publié, son propriétaire
    // est conduit au parcours de configuration plutôt que sur un espace vide.
    canActivate: [authGuard, restaurantAccessGuard, onboardingGuard],
    loadComponent: () =>
      import('./restaurateur/restaurateur-shell.component').then(
        (m) => m.RestaurateurShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'carte' },
      {
        path: 'carte',
        loadComponent: () =>
          import('./restaurateur/carte/carte.component').then((m) => m.CarteComponent),
      },
      {
        path: 'apparence',
        loadComponent: () =>
          import('./restaurateur/apparence/apparence.component').then((m) => m.ApparenceComponent),
      },
      {
        path: 'qr',
        loadComponent: () => import('./restaurateur/qr/qr.component').then((m) => m.QrComponent),
      },
      {
        path: 'statistiques',
        loadComponent: () =>
          import('./restaurateur/stats/stats.component').then((m) => m.StatsComponent),
      },
      // Même composant que le back-office — jamais un second écran de Review. Seul
      // `data.space` change le lien de retour et le vocabulaire (voir MenuReviewComponent).
      {
        path: 'carte/review',
        data: { space: 'restaurateur' },
        loadComponent: () =>
          import('./menu/review/menu-review.component').then((m) => m.MenuReviewComponent),
      },
    ],
  },
  // Une URL inconnue reste un visiteur public : on ne le pousse jamais vers
  // l'espace privé (voir §2/§3 du brief).
  { path: '**', redirectTo: '' },
];
