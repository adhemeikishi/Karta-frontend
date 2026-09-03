import { formatPriceInput, parsePriceInput } from './menu-draft.model';

/**
 * Le champ prix de la Review affiche et modifie l'euro (`priceEuros`), jamais les
 * centimes envoyés au backend (`toSaveRequest` reste seul responsable de cette
 * conversion). Ces deux fonctions sont l'aller-retour affichage <-> saisie ; leurs
 * cas limites sont ceux qui, mal gérés, feraient perdre ou fausser un prix en silence.
 */
describe('formatPriceInput', () => {
  it('affiche toujours deux décimales, virgule française', () => {
    expect(formatPriceInput(8.9)).toBe('8,90');
    expect(formatPriceInput(12)).toBe('12,00');
    expect(formatPriceInput(19.5)).toBe('19,50');
    expect(formatPriceInput(0)).toBe('0,00');
  });

  it('rend une chaîne vide pour un prix introuvable, jamais 0,00', () => {
    // Afficher 0,00 laisserait croire qu'un prix a été lu alors qu'il ne l'a pas été.
    expect(formatPriceInput(null)).toBe('');
    expect(formatPriceInput(NaN)).toBe('');
  });
});

describe('parsePriceInput', () => {
  it('accepte la virgule et le point comme séparateur décimal', () => {
    expect(parsePriceInput('8,90')).toBe(8.9);
    expect(parsePriceInput('8.90')).toBe(8.9);
    expect(parsePriceInput('12')).toBe(12);
  });

  it('renvoie null pour un champ vide ou illisible, jamais 0', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('   ')).toBeNull();
    expect(parsePriceInput('abc')).toBeNull();
  });

  it('ignore les espaces superflus', () => {
    expect(parsePriceInput('  8,90  ')).toBe(8.9);
  });

  it('conserve un aller-retour affichage -> saisie -> affichage', () => {
    const cents = [890, 1200, 1950, 100];
    for (const c of cents) {
      const euros = c / 100;
      const displayed = formatPriceInput(euros);
      const reparsed = parsePriceInput(displayed);
      // Math.round(reparsed * 100) reproduit exactement ce que fait toSaveRequest.
      expect(Math.round((reparsed ?? 0) * 100)).toBe(c);
    }
  });
});
