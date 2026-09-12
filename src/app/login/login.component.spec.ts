import { Identity } from '../services/auth.service';
import {
  DEFAULT_ADMIN_DESTINATION,
  destinationFor,
  isReachableBy,
  safeNextUrl,
} from './login.component';

const ADMIN: Identity = { username: 'admin', role: 'ADMIN', restaurantId: null };
const RESTAURATEUR: Identity = {
  username: 'resto@karta.local',
  role: 'RESTAURATEUR',
  restaurantId: '11111111-1111-4111-8111-111111111111',
};

/**
 * `next` vient de l'URL, donc de l'extérieur : c'est une frontière de confiance. Une
 * valeur non validée transformerait l'écran de connexion en redirection ouverte —
 * exactement le vecteur qu'on utilise pour envoyer un utilisateur authentifié vers un
 * faux Karta. Ces cas sont ceux qui, mal filtrés, sortent du domaine.
 */
describe('safeNextUrl', () => {
  it('accepte un chemin interne', () => {
    expect(safeNextUrl('/app/r-1/carte')).toBe('/app/r-1/carte');
    expect(safeNextUrl('/admin/restaurants/42')).toBe('/admin/restaurants/42');
    expect(safeNextUrl('/app/r-1/carte?x=1')).toBe('/app/r-1/carte?x=1');
  });

  it('rejette toute destination hors application', () => {
    for (const hostile of [
      '//evil.tld/phishing',
      'https://evil.tld',
      'http://evil.tld',
      'javascript:alert(1)',
      'evil.tld',
    ]) {
      expect(safeNextUrl(hostile)).toBeNull();
    }
  });

  it('rejette un retour vers /login (boucle)', () => {
    expect(safeNextUrl('/login')).toBeNull();
    expect(safeNextUrl('/login?next=/login')).toBeNull();
  });

  it('rend null quand aucune destination n’est demandée', () => {
    expect(safeNextUrl(null)).toBeNull();
    expect(safeNextUrl(undefined)).toBeNull();
    expect(safeNextUrl('')).toBeNull();
  });
});

/**
 * Où atterrit-on après connexion. C'est le rôle renvoyé par le backend
 * (`GET /api/admin/me`) qui décide — jamais une heuristique sur le nom d'utilisateur.
 */
describe('destinationFor', () => {
  it('envoie un restaurateur dans SON espace, pas dans le back-office', () => {
    expect(destinationFor(RESTAURATEUR, null)).toBe(
      '/app/11111111-1111-4111-8111-111111111111/carte',
    );
    expect(destinationFor(RESTAURATEUR, null)).not.toContain('/admin');
  });

  it('envoie un administrateur au back-office, comme avant', () => {
    expect(destinationFor(ADMIN, null)).toBe(DEFAULT_ADMIN_DESTINATION);
    expect(DEFAULT_ADMIN_DESTINATION).toBe('/admin/dashboard');
  });

  it('ramène vers l’écran demandé quand il est ouvert à ce compte', () => {
    // `/app/r-9/...` n'est PAS le restaurant de ce compte : voir isReachableBy.
    const own = `/app/${RESTAURATEUR.restaurantId}/apparence`;
    expect(destinationFor(RESTAURATEUR, own)).toBe(own);
    expect(destinationFor(ADMIN, '/admin/restaurants')).toBe('/admin/restaurants');
  });

  it('ignore une destination demandée hostile et retombe sur le rôle', () => {
    expect(destinationFor(RESTAURATEUR, '//evil.tld')).toBe(
      '/app/11111111-1111-4111-8111-111111111111/carte',
    );
    expect(destinationFor(ADMIN, 'https://evil.tld')).toBe(DEFAULT_ADMIN_DESTINATION);
  });

  it('n’envoie pas un restaurateur sans restaurant dans le back-office', () => {
    // Configuration serveur incomplète : `/app` l'explique, `/admin` lui est fermé.
    const orphan: Identity = { username: 'x', role: 'RESTAURATEUR', restaurantId: null };
    expect(destinationFor(orphan, null)).toBe('/app');
  });

  it('retombe sur le back-office quand l’identité est inconnue', () => {
    expect(destinationFor(null, null)).toBe(DEFAULT_ADMIN_DESTINATION);
  });
});

/**
 * Un `next` peut venir de la session précédente ou d'une URL fabriquée : il n'est
 * honoré que s'il désigne un écran réellement ouvert au compte qui vient d'entrer.
 */
describe('isReachableBy', () => {
  it('réserve le back-office à l’administrateur', () => {
    expect(isReachableBy(ADMIN, '/admin/dashboard')).toBeTrue();
    expect(isReachableBy(RESTAURATEUR, '/admin/dashboard')).toBeFalse();
    expect(isReachableBy(RESTAURATEUR, '/admin')).toBeFalse();
  });

  it('réserve l’Espace Restaurateur au restaurateur', () => {
    expect(isReachableBy(RESTAURATEUR, '/app')).toBeTrue();
    expect(isReachableBy(ADMIN, '/app')).toBeFalse();
    expect(isReachableBy(ADMIN, `/app/${RESTAURATEUR.restaurantId}/carte`)).toBeFalse();
  });

  it('n’ouvre que le restaurant du compte', () => {
    expect(isReachableBy(RESTAURATEUR, `/app/${RESTAURATEUR.restaurantId}/apparence`)).toBeTrue();
    expect(isReachableBy(RESTAURATEUR, '/app/22222222-2222-4222-8222-222222222222/carte')).toBeFalse();
  });

  it('laisse le site public ouvert à tous', () => {
    expect(isReachableBy(RESTAURATEUR, '/pricing')).toBeTrue();
    expect(isReachableBy(ADMIN, '/contact')).toBeTrue();
  });
});

/**
 * Scénario de bascule de compte : le `next` déposé par la session précédente ne doit
 * jamais décider où atterrit la suivante.
 */
describe('destinationFor — changement de compte', () => {
  it('ignore un next de back-office quand c’est un restaurateur qui se connecte', () => {
    expect(destinationFor(RESTAURATEUR, '/admin/dashboard')).toBe(
      `/app/${RESTAURATEUR.restaurantId}/carte`,
    );
  });

  it('ignore un next d’Espace Restaurateur quand c’est un administrateur qui se connecte', () => {
    expect(destinationFor(ADMIN, '/app/r-9/carte')).toBe(DEFAULT_ADMIN_DESTINATION);
  });

  it('ignore un next visant le restaurant d’un autre', () => {
    expect(destinationFor(RESTAURATEUR, '/app/22222222-2222-4222-8222-222222222222/carte')).toBe(
      `/app/${RESTAURATEUR.restaurantId}/carte`,
    );
  });
});
