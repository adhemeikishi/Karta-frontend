import { Component, ElementRef, computed, inject, input } from '@angular/core';
import { LandingMenuContent, ResolvedMenuTheme } from './landing-menu-presets';

/**
 * Rendu du menu Karta — **port fidèle** de `templates/menu/menu.html` (backend).
 *
 * Le vrai renderer est du Thymeleaf : il ne peut pas s'exécuter dans un navigateur, et
 * le seul endpoint qui produit son HTML (`/api/admin/.../menu/preview`) exige Basic Auth
 * + un restaurant réel. Ce composant reprend **le même balisage et le même CSS**, pilotés
 * par le **même thème résolu** (`resolveLandingTheme` = port de `MenuThemeResolver`).
 *
 * Adaptations minimales, sans divergence de rendu :
 *  - `body` → `:host` (mêmes déclarations, mêmes variables `--t-*`, mêmes densités) ;
 *  - `.sheet { min-height: 100vh }` → `100%` (occupe l'écran du téléphone, pas la fenêtre) ;
 *  - le palier `@media (min-width: 768px)` du template est retiré : dans un mockup
 *    téléphone, on veut toujours le rendu **mobile** — celui que voit un client qui
 *    scanne le QR ;
 *  - pas de `.preview-bar` (réservée au studio).
 */
@Component({
  selector: 'menu-render',
  standalone: true,
  host: {
    '[style]': 'styleVars()',
    '[class]': "'density-' + theme().density",
    'aria-hidden': 'true',
  },
  template: `
    <div class="sheet">
      @if (theme().heroUrl) {
        <div class="hero"><img [src]="theme().heroUrl" alt="" decoding="async" /></div>
      }

      <header class="header">
        @if (theme().logoUrl) {
          <img class="logo" [src]="theme().logoUrl" alt="" decoding="async" />
        }
        <div class="header-rule"></div>
        <p class="eyebrow">Menu</p>
        <h1 class="restaurant-name k-wrap">{{ menu().restaurantName }}</h1>
      </header>

      <main>
        @if (menu().categories.length === 0) {
          <p class="empty">Le menu sera disponible très prochainement.</p>
        } @else {
          <div class="categories">
            @for (category of menu().categories; track category.name) {
              <section class="category">
                <h2 class="category-name k-wrap">{{ category.name }}</h2>
                @if (category.description) {
                  <p class="category-description k-wrap">{{ category.description }}</p>
                }
                <ul>
                  @for (item of category.items; track item.name) {
                    <li class="item" [class.is-unavailable]="!item.available">
                      @if (item.imageUrl) {
                        <img class="item-thumb" [src]="item.imageUrl" [alt]="item.name" loading="lazy" decoding="async" />
                      }
                      <div class="item-body">
                        <p class="item-name k-wrap">{{ item.name }}</p>
                        @if (item.description) {
                          <p class="item-description k-wrap">{{ item.description }}</p>
                        }
                        @if (!item.available) {
                          <span class="item-flag">Indisponible</span>
                        }
                      </div>
                      <p class="item-price k-tnum">{{ item.priceLabel }}</p>
                    </li>
                  }
                </ul>
              </section>
            }
          </div>
        }
      </main>

      <footer class="footer"><b>Karta</b></footer>
    </div>
  `,
  // CSS repris VERBATIM de templates/menu/menu.html + menu/base.html::reset.
  // Seules adaptations : body → :host, body.density-* → :host(.density-*),
  // .sheet min-height 100vh → 100%, palier @media(min-width:768px) retiré
  // (mockup téléphone = toujours le rendu mobile). Ne pas diverger de menu.html.
  styles: [
    `:host,:host *,:host *::before,:host *::after{box-sizing:border-box}
:host :where(h1,h2,p,ul){margin:0;padding:0}
:host ul{list-style:none}
:host img{display:block;max-width:100%}
.k-wrap{overflow-wrap:anywhere}
.k-tnum{font-variant-numeric:tabular-nums}
:host{display:block;background-color:var(--t-bg);color:var(--t-text);font-family:var(--t-font);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;--t-pad-x:1.25rem;--t-header-top:2.5rem;--t-header-bottom:2rem;--t-cat-gap:2.5rem;--t-item-pad:1.125rem;--t-title-size:1.75rem;--t-cat-size:0.75rem;--t-cat-spacing:0.12em;--t-align:left}
.sheet{max-width:34rem;margin:0 auto;min-height:100%;background-color:var(--t-bg)}
.hero{position:relative;aspect-ratio:16/9;overflow:hidden;background-color:var(--t-surface)}
.hero img{width:100%;height:100%;object-fit:cover}
.header{padding:var(--t-header-top) var(--t-pad-x) var(--t-header-bottom);border-bottom:1px solid var(--t-border);text-align:var(--t-align)}
.logo{max-height:3.5rem;width:auto;margin-bottom:1.25rem}
.header-rule{width:1.75rem;height:3px;background-color:var(--t-accent);margin-bottom:1rem}
.eyebrow{font-size:0.6875rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--t-accent)}
.restaurant-name{font-size:var(--t-title-size);line-height:1.12;font-weight:650;letter-spacing:-0.02em;margin-top:0.375rem}
.categories{padding:0 var(--t-pad-x) 3rem}
.category{padding-top:var(--t-cat-gap)}
.category-name{font-size:var(--t-cat-size);font-weight:700;letter-spacing:var(--t-cat-spacing);text-transform:uppercase;padding-bottom:0.625rem;border-bottom:1px solid var(--t-text)}
.category-description{margin-top:0.75rem;font-size:0.875rem;color:var(--t-muted)}
.item{display:flex;align-items:flex-start;gap:0.875rem;padding:var(--t-item-pad) 0;border-bottom:1px solid var(--t-border)}
.item:last-child{border-bottom:none}
.item-thumb{width:3.5rem;height:3.5rem;flex-shrink:0;border-radius:6px;object-fit:cover;background-color:var(--t-surface)}
.item-body{flex:1 1 auto;min-width:0}
.item-name{font-size:1rem;font-weight:600;line-height:1.35}
.item-description{margin-top:0.25rem;font-size:0.875rem;line-height:1.45;color:var(--t-muted)}
.item-price{flex-shrink:0;font-size:1rem;font-weight:650;white-space:nowrap;padding-top:0.0625rem;color:var(--t-accent)}
.item-flag{display:inline-block;margin-top:0.5rem;padding:0.125rem 0.4375rem;border-radius:3px;background-color:var(--t-surface);border:1px solid var(--t-border);color:var(--t-muted);font-size:0.625rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase}
.item.is-unavailable .item-name,.item.is-unavailable .item-description{color:var(--t-muted)}
.item.is-unavailable .item-price{color:var(--t-muted);text-decoration:line-through}
.item.is-unavailable .item-thumb{opacity:0.45}
.empty{padding:4rem var(--t-pad-x);text-align:center;color:var(--t-muted);font-size:0.9375rem}
.footer{padding:1.75rem var(--t-pad-x) 2.5rem;border-top:1px solid var(--t-border);text-align:center;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:var(--t-muted)}
.footer b{color:var(--t-text);font-weight:700}
:host(.density-compact){--t-header-top:1.75rem;--t-header-bottom:1.5rem;--t-cat-gap:1.75rem;--t-item-pad:0.75rem;--t-title-size:1.625rem;--t-cat-spacing:0.16em}
:host(.density-compact) .category-name{display:inline-block;background-color:var(--t-accent);color:var(--t-accent-text);border-bottom:none;padding:0.3125rem 0.625rem;border-radius:4px}
:host(.density-compact) .item-name{font-weight:700}
:host(.density-compact) .item-thumb{width:3rem;height:3rem}
:host(.density-airy){--t-header-top:4.5rem;--t-header-bottom:3rem;--t-cat-gap:4rem;--t-item-pad:1.5rem;--t-title-size:2rem;--t-cat-spacing:0.2em}
:host(.density-airy) .header,:host(.density-airy) .category-name{border-bottom-color:var(--t-border)}
:host(.density-airy) .header-rule,:host(.density-airy) .eyebrow{display:none}
:host(.density-airy) .item-name{font-weight:500}
:host(.density-airy) .item-price{color:var(--t-text);font-weight:500}
:host(.density-elegant){--t-header-top:3.5rem;--t-header-bottom:2.5rem;--t-cat-gap:3.25rem;--t-item-pad:1.25rem;--t-title-size:2rem;--t-cat-spacing:0.24em;--t-align:center}
:host(.density-elegant) .header-rule{margin-left:auto;margin-right:auto}
:host(.density-elegant) .restaurant-name{font-weight:500;letter-spacing:0.01em}
:host(.density-elegant) .logo{margin-left:auto;margin-right:auto}
:host(.density-elegant) .category-name{text-align:center;border-bottom:1px solid var(--t-accent);color:var(--t-accent);font-weight:600}
:host(.density-elegant) .category-description{text-align:center}
:host(.density-elegant) .item-name{font-weight:500}`,
  ],
})
export class MenuRenderComponent {
  readonly theme = input.required<ResolvedMenuTheme>();
  readonly menu = input.required<LandingMenuContent>();

  private readonly host = inject(ElementRef<HTMLElement>);

  /** Variables CSS du template `menu/menu.html` (posées par Thymeleaf sur <html>). */
  readonly styleVars = computed<Record<string, string>>(() => {
    const t = this.theme();
    return {
      '--t-bg': t.background,
      '--t-surface': t.surface,
      '--t-border': t.border,
      '--t-text': t.text,
      '--t-muted': t.muted,
      '--t-accent': t.accent,
      '--t-accent-text': t.accentText,
      '--t-font': t.fontStack,
    };
  });

  /** Remet le menu défilant en haut — appelé par le configurateur au changement de preset. */
  scrollToTop(): void {
    this.host.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
