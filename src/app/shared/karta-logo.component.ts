import { Component, computed, input } from '@angular/core';

/**
 * Logo Karta — source unique (remplace les copies inline du pictogramme).
 *
 * Deux variantes de tuile, choisies selon le fond de l'emplacement :
 * - `dark`  : tuile sombre / K blanc  → fonds CLAIRS  (navbar, bandeau mobile login)
 * - `light` : tuile claire / K noir   → fonds SOMBRES (footer, sidebar admin, panneau login)
 *
 * Le mot « Karta » (toujours affiché, `wordmark`) suit la variante : blanc sur
 * `light`, encre sur `dark`. Sa taille est proportionnelle à `size` pour conserver
 * les proportions de chaque emplacement existant.
 *
 * Assets : `public/karta-logo-{dark,light}.png` — copiés tels quels dans
 * `dist/frontend/browser/` (voir angular.json → assets), donc servis à la racine
 * en dev comme en production.
 */
@Component({
  selector: 'karta-logo',
  standalone: true,
  // `:host` en `inline-flex` : sans display explicite, l'hôte est `inline` et le
  // `<span>` interne reste une boîte inline-level qui traîne le demi-interligne de
  // sa line-box — dans un conteneur flex (navbar, sidebar admin) le logo se
  // retrouve alors ~3px trop haut. En faisant de l'hôte le conteneur flex, le
  // `<span>` devient un simple flex-item et la boîte colle au dessin (32px = 32px).
  styles: [':host{display:inline-flex}'],
  template: `
    <span class="flex items-center gap-2.5">
      <img
        [src]="variant() === 'light' ? '/karta-logo-light.png' : '/karta-logo-dark.png'"
        alt=""
        class="block shrink-0"
        [style.width.px]="size()"
        [style.height.px]="size()"
      />
      @if (wordmark()) {
        <span
          class="font-extrabold tracking-[-0.01em]"
          [class.text-white]="variant() === 'light'"
          [class.text-ink-900]="variant() === 'dark'"
          [style.font-size.px]="wordmarkPx()"
        >Karta</span>
      }
    </span>
  `,
})
export class KartaLogoComponent {
  readonly variant = input<'light' | 'dark'>('dark');
  /** Côté de la tuile en px. Le mot « Karta » est dimensionné à ~0,47 × size. */
  readonly size = input(32);
  readonly wordmark = input(true);

  readonly wordmarkPx = computed(() => Math.round(this.size() * 0.47));
}
