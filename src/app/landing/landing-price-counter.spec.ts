import { PRICE_COUNTER_DURATION_MS, formatEuro, interpolatePrice } from './landing-price-counter.component';

/**
 * Format français exact attendu par le pricing (§7/§2 du brief) : virgule décimale,
 * espace fine insécable tous les 3 chiffres — vérifié sur les tarifs réels.
 */
describe('formatEuro', () => {
  it('formate avec virgule décimale, toujours deux chiffres', () => {
    expect(formatEuro(29.99)).toBe('29,99');
    expect(formatEuro(99.9)).toBe('99,90');
  });

  it('insère une séparation des milliers au-delà de 999', () => {
    expect(formatEuro(1079.99)).toBe('1 079,99');
    expect(formatEuro(1199.99)).toBe('1 199,99');
  });

  it('ne sépare pas un nombre à 3 chiffres ou moins', () => {
    expect(formatEuro(719.99)).toBe('719,99');
    expect(formatEuro(59.99)).toBe('59,99');
  });
});

/**
 * Le compteur de prix (§12 du brief) doit partir de la valeur précédente, atteindre
 * exactement la cible en fin de durée, et suivre un ease-out (rapide au début, lent à
 * la fin) — jamais une progression linéaire ni un dépassement de la cible.
 */
describe('interpolatePrice', () => {
  it('vaut la valeur de départ à t=0', () => {
    expect(interpolatePrice(20, 30, 0)).toBe(20);
  });

  it('atteint exactement la cible à la fin de la durée', () => {
    expect(interpolatePrice(20, 30, PRICE_COUNTER_DURATION_MS)).toBe(30);
  });

  it('reste à la cible au-delà de la durée (jamais de dépassement)', () => {
    expect(interpolatePrice(20, 30, PRICE_COUNTER_DURATION_MS * 2)).toBe(30);
  });

  it('progresse dans le bon sens que le prix monte ou baisse', () => {
    const midUp = interpolatePrice(20, 30, PRICE_COUNTER_DURATION_MS / 2);
    expect(midUp).toBeGreaterThan(20);
    expect(midUp).toBeLessThan(30);

    const midDown = interpolatePrice(30, 20, PRICE_COUNTER_DURATION_MS / 2);
    expect(midDown).toBeLessThan(30);
    expect(midDown).toBeGreaterThan(20);
  });

  it('ease-out : progresse plus vite en début de course qu\'en fin (jamais linéaire)', () => {
    const quarter = interpolatePrice(0, 100, PRICE_COUNTER_DURATION_MS * 0.25);
    const half = interpolatePrice(0, 100, PRICE_COUNTER_DURATION_MS * 0.5);
    const threeQuarters = interpolatePrice(0, 100, PRICE_COUNTER_DURATION_MS * 0.75);
    // Une progression linéaire donnerait des écarts égaux (25/25/25) ; l'ease-out
    // cubique doit couvrir plus de distance sur le premier quart que sur le dernier.
    expect(quarter).toBeGreaterThan(25);
    expect(threeQuarters - half).toBeLessThan(quarter);
  });

  it('valeur identique : reste stable immédiatement', () => {
    expect(interpolatePrice(25, 25, 0)).toBe(25);
    expect(interpolatePrice(25, 25, PRICE_COUNTER_DURATION_MS)).toBe(25);
  });
});
