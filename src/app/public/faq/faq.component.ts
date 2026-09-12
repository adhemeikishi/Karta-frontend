import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../../landing/reveal-on-scroll.directive';
import { scrollToAnchor } from '../../landing/scroll-to-anchor';
import { FaqAccordionComponent } from '../faq-accordion.component';
import { FAQ_GROUPS } from '../public-content';
import { SeoService } from '../../shared/seo.service';

/**
 * Page `/faq` — questions dérivées de la landing (`FAQ_GROUPS`). Catégories
 * limitées aux fonctionnalités réellement présentes : pas de « Paiement » (hors
 * périmètre V1, jamais mentionné sur `/`).
 */
@Component({
  selector: 'app-faq',
  imports: [RouterLink, RevealOnScrollDirective, FaqAccordionComponent],
  templateUrl: './faq.component.html',
})
export class FaqComponent {
  readonly groups = FAQ_GROUPS;
  /** `<a href="#id">` brut → navigation Router involontaire (voir scroll-to-anchor). */
  readonly scrollToAnchor = scrollToAnchor;

  constructor() {
    inject(SeoService).apply({
      title: 'FAQ',
      description:
        'Questions fréquentes sur Karta : QR permanent, menu, import PDF avec KartaIA, personnalisation, statistiques et tarifs.',
      path: '/faq',
    });
  }
}
