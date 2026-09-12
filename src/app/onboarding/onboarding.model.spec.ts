import { Menu } from '../menu/menu.model';
import { Restaurant, RestaurantOffer } from '../models/restaurant.model';
import { ONBOARDING_STEPS, stepFor, stepIndex } from './onboarding.model';

function restaurant(offer: RestaurantOffer, completed = false): Restaurant {
  return {
    id: 'r-1',
    name: 'Chez Karta',
    offer,
    onboardingCompletedAt: completed ? '2026-02-01T10:00:00Z' : null,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  };
}

function menu(overrides: Partial<Menu> = {}): Menu {
  return {
    offer: 'PRO',
    type: 'STRUCTURED',
    status: 'DRAFT',
    version: 1,
    published: false,
    publishedAt: null,
    pdf: null,
    structure: null,
    ...overrides,
  };
}

const PDF = {
  assetId: 'a-1',
  url: 'https://api.kartaqr.fr/media/a-1',
  originalFilename: 'carte.pdf',
  sizeBytes: 1024,
  uploadedAt: '2026-02-01T09:00:00Z',
};

/**
 * L'étape courante est <em>déduite</em> de ce que le serveur contient — jamais mémorisée
 * dans le navigateur. C'est ce qui rend la reprise gratuite : fermer l'onglet au milieu
 * du parcours et revenir d'un autre appareil doit rouvrir la même étape.
 */
describe('stepFor — reprise du parcours', () => {
  it('commence par l’accueil quand rien n’a encore été fait', () => {
    expect(stepFor(restaurant('PRO'), menu(), false)).toBe('welcome');
  });

  it('attend le chargement du menu avant de décider', () => {
    expect(stepFor(restaurant('PRO'), null, false)).toBe('welcome');
  });

  it('reprend à l’import quand un PDF est là mais n’a pas encore été lu', () => {
    expect(stepFor(restaurant('PRO'), menu({ pdf: PDF }), false)).toBe('menu');
  });

  it('reprend à la vérification quand une analyse attend d’être relue', () => {
    // Le brouillon vit en base : fermer l'onglet pendant la vérification ne le perd pas.
    expect(stepFor(restaurant('PRO'), menu({ pdf: PDF }), true)).toBe('review');
  });

  it('reprend au style quand la carte est enregistrée mais pas en ligne', () => {
    expect(stepFor(restaurant('PRO'), menu({ version: 2, status: 'READY' }), false)).toBe('style');
  });

  it('termine sur l’écran final dès que la carte est publiée', () => {
    expect(stepFor(restaurant('PRO'), menu({ version: 2, published: true }), false)).toBe('success');
  });

  it('privilégie la vérification sur le style quand les deux sont possibles', () => {
    // Une nouvelle analyse relancée sur une carte existante : c'est elle qu'on relit.
    expect(stepFor(restaurant('PRO'), menu({ version: 2, pdf: PDF }), true)).toBe('review');
  });

  // ---------------------------------------------------------------- offre BASIC

  it('mène une carte PDF de l’import à la publication, sans analyse ni style', () => {
    // Une carte BASIC EST le PDF : il n'y a rien à extraire, rien à habiller.
    const basic = restaurant('BASIC');
    expect(stepFor(basic, menu({ offer: 'BASIC', type: 'PDF' }), false)).toBe('menu');
    expect(stepFor(basic, menu({ offer: 'BASIC', type: 'PDF', pdf: PDF }), false)).toBe('publish');
  });

  it('ignore un brouillon pour une offre BASIC', () => {
    const basic = restaurant('BASIC');
    expect(stepFor(basic, menu({ offer: 'BASIC', type: 'PDF', pdf: PDF }), true)).toBe('publish');
  });

  // ---------------------------------------------------------------- offre PREMIUM

  it('traite PREMIUM comme PRO : carte numérique complète', () => {
    const premium = restaurant('PREMIUM');
    expect(stepFor(premium, menu({ offer: 'PREMIUM', pdf: PDF }), true)).toBe('review');
    expect(stepFor(premium, menu({ offer: 'PREMIUM', version: 2 }), false)).toBe('style');
  });
});

describe('stepIndex — indicateur de progression', () => {
  it('place les quatre étapes visibles dans l’ordre', () => {
    expect(ONBOARDING_STEPS.map((s) => s.id)).toEqual(['menu', 'review', 'style', 'publish']);
    expect(stepIndex('menu')).toBe(0);
    expect(stepIndex('publish')).toBe(3);
  });

  it('montre le traitement au rang de l’import — c’est la même étape pour l’utilisateur', () => {
    expect(stepIndex('processing')).toBe(stepIndex('menu'));
  });

  it('place l’écran final après la dernière étape', () => {
    expect(stepIndex('success')).toBe(ONBOARDING_STEPS.length);
  });
});
