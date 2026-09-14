import { can, requiredOfferFor } from './plan';

/**
 * Une seule table décide de ce que chaque offre ouvre, et elle doit rester le miroir
 * exact du backend : une capacité annoncée ici mais refusée par le serveur produirait un
 * bouton qui échoue au clic, ce qui est pire que de ne pas l'afficher.
 */
describe('can — capacités par offre', () => {
  it('BASIC diffuse une carte PDF, rien de plus', () => {
    expect(can('BASIC', 'pdfMenu')).toBeTrue();
    // MenuDesignService.requireStructuredOffer refuse BASIC.
    expect(can('BASIC', 'structuredMenu')).toBeFalse();
    expect(can('BASIC', 'presets')).toBeFalse();
    expect(can('BASIC', 'branding')).toBeFalse();
  });

  it('PRO ouvre la carte numérique et les cinq styles', () => {
    expect(can('PRO', 'structuredMenu')).toBeTrue();
    expect(can('PRO', 'presets')).toBeTrue();
    // DesignResponse.customizable n'est vrai que pour PREMIUM.
    expect(can('PRO', 'branding')).toBeFalse();
  });

  it('PREMIUM ajoute l’identité de marque et la personnalisation avancée', () => {
    expect(can('PREMIUM', 'structuredMenu')).toBeTrue();
    expect(can('PREMIUM', 'presets')).toBeTrue();
    expect(can('PREMIUM', 'branding')).toBeTrue();
    expect(can('PREMIUM', 'noBranding')).toBeTrue();
    expect(can('PREMIUM', 'fonts')).toBeTrue();
    expect(can('PREMIUM', 'qrDesign')).toBeTrue();
    expect(can('PREMIUM', 'itemPhotos')).toBeTrue();
    expect(can('PREMIUM', 'translations')).toBeTrue();
  });

  it('la personnalisation avancée est fermée à BASIC et PRO', () => {
    for (const feature of ['noBranding', 'fonts', 'qrDesign', 'itemPhotos', 'translations'] as const) {
      expect(can('PRO', feature)).withContext(feature).toBeFalse();
      expect(can('BASIC', feature)).withContext(feature).toBeFalse();
    }
  });

  it('n’ouvre rien sans offre connue', () => {
    expect(can(null, 'presets')).toBeFalse();
    expect(can(undefined, 'pdfMenu')).toBeFalse();
  });
});

describe('requiredOfferFor — ce qu’il faut pour débloquer', () => {
  it('annonce l’offre exacte, jamais une promesse vague', () => {
    expect(requiredOfferFor('branding')).toBe('PREMIUM');
    expect(requiredOfferFor('itemPhotos')).toBe('PREMIUM');
    expect(requiredOfferFor('translations')).toBe('PREMIUM');
    expect(requiredOfferFor('presets')).toBe('PRO');
    expect(requiredOfferFor('structuredMenu')).toBe('PRO');
    expect(requiredOfferFor('pdfMenu')).toBe('BASIC');
  });
});
