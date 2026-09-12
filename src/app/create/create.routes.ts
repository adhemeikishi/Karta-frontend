import { Routes } from '@angular/router';
import { creationDraftGuard } from './creation-draft.guard';
import { CreateShellComponent } from './create-shell.component';

/**
 * Routes du parcours de création, chargées en un seul morceau.
 *
 * Elles vivent dans ce fichier plutôt que dans `app.routes.ts` pour une raison
 * mesurable : `app.routes.ts` est chargé au démarrage, et y importer la garde y
 * entraînait le service, le modèle de brouillon et la carte d'exemple — dix kilo-octets
 * dans le bundle initial de tout le produit, pour un parcours que la plupart des
 * visiteurs n'ouvrent jamais.
 */
export const CREATE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [creationDraftGuard],
    component: CreateShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'review' },
      {
        path: 'review',
        loadComponent: () => import('./review.component').then((m) => m.ReviewComponent),
      },
      {
        path: 'design',
        loadComponent: () => import('./design.component').then((m) => m.DesignComponent),
      },
      {
        path: 'compte',
        loadComponent: () => import('./compte.component').then((m) => m.CompteComponent),
      },
      { path: '**', redirectTo: 'review' },
    ],
  },
];
