import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface PageSeo {
  /** Sans le suffixe « — Karta ». */
  title: string;
  description: string;
  /** Chemin absolu depuis la racine, ex. `/pricing`. */
  path: string;
}

const SITE = 'https://kartaqr.fr';
const SUFFIX = ' — Karta';

/**
 * Métadonnées SEO par page publique : `<title>`, description, canonical, Open Graph.
 * Appelé dans le constructeur de chaque page publique. Compatible prerendering
 * (Title/Meta d'Angular fonctionnent au rendu serveur) — l'OG image et le reste des
 * balises statiques vivent dans `index.html`.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  apply(seo: PageSeo): void {
    const fullTitle = seo.title + SUFFIX;
    const url = SITE + seo.path;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.setCanonical(url);
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
