import { Route, Routes } from '@angular/router';
import { routes } from './app.routes';
import { adminGuard } from './services/admin.guard';
import { authGuard } from './services/auth.guard';
import { onboardingEntryGuard, onboardingGuard } from './onboarding/onboarding.guard';
import { restaurantAccessGuard, restaurateurGuard } from './services/restaurateur.guard';

function find(list: Routes, path: string): Route {
  const route = list.find((r) => r.path === path);
  if (!route) {
    throw new Error(`route introuvable : ${path}`);
  }
  return route;
}

/**
 * L'Espace Restaurateur et le back-office partagent l'application mais jamais le
 * parcours : ces tests verrouillent la frontière (protection, redirection, absence de
 * fuite vers `/admin`) et l'intégrité des routes existantes.
 */
describe('routes — Espace Restaurateur', () => {
  it('protège `/app` : connecté, restaurateur, et propriétaire du restaurant visé', () => {
    // `restaurantAccessGuard` inclut la vérification de rôle : l'URL ne fait jamais foi.
    expect(find(routes, 'app').canActivate).toEqual([authGuard, restaurateurGuard]);
    expect(find(routes, 'app/:restaurantId').canActivate).toEqual([
      authGuard,
      restaurantAccessGuard,
      onboardingGuard,
    ]);
  });

  it('sépare les deux espaces par des gardes distinctes', () => {
    // Les deux espaces sont étanches dans les deux sens, mais chacun a sa règle :
    // `adminGuard` garde le back-office, `restaurateurGuard` garde l'Espace Restaurateur.
    // Les croiser dirait la bonne chose pour la mauvaise raison.
    expect(find(routes, 'app').canActivate).not.toContain(adminGuard);
    expect(find(routes, 'app/:restaurantId').canActivate).not.toContain(adminGuard);
    expect(find(routes, 'admin').canActivate).not.toContain(restaurateurGuard);
    expect(find(routes, 'admin').canActivate).toContain(adminGuard);
  });

  it('redirige `/app/:restaurantId` vers `carte`', () => {
    const children = find(routes, 'app/:restaurantId').children ?? [];
    const index = children.find((c) => c.path === '');
    expect(index?.pathMatch).toBe('full');
    expect(index?.redirectTo).toBe('carte');
  });

  it('expose les destinations du châssis restaurateur', () => {
    const children = find(routes, 'app/:restaurantId').children ?? [];
    expect(children.map((c) => c.path)).toEqual([
      '',
      'carte',
      'apparence',
      'qr',
      'statistiques',
      'carte/review',
    ]);
  });

  it('protège `apparence` par le châssis et les gardes du parent', () => {
    // Les gardes sont portées par la route parente : aucune page enfant n'y échappe.
    const parent = find(routes, 'app/:restaurantId');
    expect(parent.canActivate).toEqual([authGuard, restaurantAccessGuard, onboardingGuard]);
    const apparence = (parent.children ?? []).find((c) => c.path === 'apparence');
    expect(apparence?.loadComponent).toBeDefined();
  });

  it('marque la Review comme ouverte depuis l’espace restaurateur', () => {
    // C'est cette donnée — et elle seule — qui empêche l'écran de renvoyer vers /admin.
    const children = find(routes, 'app/:restaurantId').children ?? [];
    const review = children.find((c) => c.path === 'carte/review');
    expect(review?.data).toEqual({ space: 'restaurateur' });
  });

  it('ne fait apparaître aucune cible /admin dans la branche restaurateur', () => {
    const branch = JSON.stringify([find(routes, 'app'), find(routes, 'app/:restaurantId')]);
    expect(branch).not.toContain('/admin');
  });
});

describe('routes — non-régression', () => {
  it('conserve `/login`, `/admin` et le repli public', () => {
    // `/login` et le back-office sont chargés à la demande : rien de privé ne pèse
    // sur le démarrage d'un visiteur qui ne fait que lire la landing.
    expect(find(routes, 'login').loadComponent).toBeDefined();

    const admin = find(routes, 'admin');
    // `authGuard` (connecté) puis `adminGuard` (Karta, pas un restaurateur).
    expect(admin.canActivate).toEqual([authGuard, adminGuard]);
    expect((admin.children ?? []).map((c) => c.path)).toEqual([
      '',
      'dashboard',
      'restaurants',
      'restaurants/:id',
      'restaurants/:id/menu/review',
    ]);

    expect(find(routes, '**').redirectTo).toBe('');
  });

  it('ne charge aucun écran privé au démarrage', () => {
    // Une route eager (`component:`) embarque son composant dans le bundle initial.
    // Seules les routes qui n'en ont pas besoin peuvent s'en passer : ici, aucune.
    const eager = routes.filter((route) => route.component);
    expect(eager).toEqual([]);
  });

  it('conserve les 6 routes publiques prérendues', () => {
    const publicChildren = (find(routes, '').children ?? []).map((c) => c.path);
    expect(publicChildren).toEqual(['', 'landing', 'pricing', 'features', 'faq', 'contact']);
  });

  it('déclare `app` avant `app/:restaurantId` (le sélecteur ne doit pas être masqué)', () => {
    expect(routes.indexOf(find(routes, 'app'))).toBeLessThan(
      routes.indexOf(find(routes, 'app/:restaurantId')),
    );
  });
});

/**
 * Parcours de création public : il précède le compte, il n'a donc aucune garde
 * d'authentification — mais il ne doit pas non plus peser sur le démarrage.
 */
describe('routes — parcours de création', () => {
  it('expose `/karta-ai` et `/create`, chargés à la demande', () => {
    expect(find(routes, 'karta-ai').loadComponent).toBeDefined();
    expect(find(routes, 'create').loadChildren).toBeDefined();
  });

  it('n’exige jamais d’être connecté : le compte vient après la carte', () => {
    expect(find(routes, 'karta-ai').canActivate).toBeUndefined();
    expect(find(routes, 'create').canActivate).toBeUndefined();
  });

  it('reste avant le repli public', () => {
    expect(routes.indexOf(find(routes, 'create'))).toBeLessThan(
      routes.indexOf(find(routes, '**')),
    );
  });
});

/**
 * Le parcours de configuration est un espace à part : protégé comme l'Espace
 * Restaurateur, mais sans identifiant dans l'URL — le restaurant vient de l'identité du
 * compte, il n'y a donc rien à falsifier dans la barre d'adresse.
 */
describe('routes — parcours de configuration', () => {
  it('exige d’être connecté ET restaurateur', () => {
    expect(find(routes, 'onboarding').canActivate).toEqual([authGuard, restaurateurGuard]);
  });

  it('ne porte aucun identifiant de restaurant dans son chemin', () => {
    expect(find(routes, 'onboarding').path).toBe('onboarding');
    expect(JSON.stringify(find(routes, 'onboarding'))).not.toContain(':restaurantId');
  });

  it('expose les sept étapes du parcours, dans l’ordre', () => {
    const children = (find(routes, 'onboarding').children ?? []).map((c) => c.path);
    expect(children).toEqual([
      '',
      'welcome',
      'menu',
      'processing',
      'review',
      'style',
      'publish',
      'success',
      '**',
    ]);
  });

  it('redirige l’entrée vers l’étape réellement atteinte', () => {
    const entry = (find(routes, 'onboarding').children ?? []).find((c) => c.path === '');
    expect(entry?.canActivate).toEqual([onboardingEntryGuard]);
    expect(entry?.pathMatch).toBe('full');
  });

  it('réutilise l’écran de Review existant, marqué « onboarding »', () => {
    // Jamais un second éditeur : c'est le même composant que /admin et /app.
    const review = (find(routes, 'onboarding').children ?? []).find((c) => c.path === 'review');
    expect(review?.data).toEqual({ space: 'onboarding' });
  });

  it('ne fait apparaître aucune cible /admin dans le parcours', () => {
    expect(JSON.stringify(find(routes, 'onboarding'))).not.toContain('/admin');
  });
});
