import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

// Les dates du produit s'affichent en français (« 9 sept. 2026 »), comme le reste de
// l'interface. `formatPrice` utilisait déjà Intl en fr-FR : le pipe `date` s'aligne.
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    // `paramsInheritanceStrategy: 'always'` : sans cette option, une route enfant au
    // chemin non vide n'hérite pas des paramètres de son parent. `/app/:restaurantId`
    // porte un composant (le châssis restaurateur), donc `carte` et `carte/review` ne
    // verraient pas `restaurantId`. Aucun effet sur les routes existantes : ni `/admin`
    // ni le site public n'ont de paramètre de route parent.
    // `scrollPositionRestoration: 'enabled'` : par défaut le Router ne touche pas au
    // défilement, et le navigateur conserve la position — on arrivait donc en bas de
    // `/features` en y allant depuis le bas de `/`. « enabled » remet en haut à chaque
    // nouvelle navigation ET restaure la position mémorisée sur précédent/suivant.
    //
    // `anchorScrolling: 'enabled'` ne concerne que les liens profonds (`/faq#tarifs`
    // ouvert directement ou partagé) : les ancres internes passent par
    // `scrollToAnchor`, qui annule le comportement natif et défile lui-même — aucune
    // navigation Router n'y porte de fragment (voir scroll-to-anchor.ts). Sans cette
    // option, un lien profond serait ramené en haut par la règle ci-dessus.
    provideRouter(
      routes,
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])), provideClientHydration(withEventReplay()),
  ]
};
