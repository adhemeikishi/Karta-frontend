import { Component } from '@angular/core';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

interface KartaPayStep {
  readonly order: string;
  readonly label: string;
}

/**
 * Teaser Karta Pay — purement visuel : aucune commande, aucun paiement, aucun
 * appel réseau. Karta Pay n'existe pas encore (voir CLAUDE.md § Périmètre) : ce
 * chapitre annonce une direction future, jamais une fonctionnalité livrée — le
 * badge "Bientôt disponible" reste visible en permanence.
 */
@Component({
  selector: 'landing-karta-pay-teaser',
  imports: [RevealOnScrollDirective],
  templateUrl: './karta-pay-teaser.component.html',
})
export class KartaPayTeaserComponent {
  readonly steps: readonly KartaPayStep[] = [
    { order: '01', label: 'Menu' },
    { order: '02', label: 'Sélection des plats' },
    { order: '03', label: 'Panier' },
    { order: '04', label: 'Commande' },
    { order: '05', label: 'Paiement' },
    { order: '06', label: 'Confirmation' },
  ];
}
