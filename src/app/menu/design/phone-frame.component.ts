import { Component, input } from '@angular/core';

/**
 * Châssis de téléphone entourant l'aperçu.
 *
 * Équivalent Angular / CSS natif : aucune dépendance ajoutée, aucune image. Ce n'est
 * pas de la décoration — un menu se lit sur un téléphone, à table : présenter le rendu
 * à sa taille réelle est la seule façon de juger une carte avant de la publier.
 *
 * Volontairement générique (proportions modernes, encoche pilule, boutons latéraux)
 * sans reproduire une marque commerciale.
 */
@Component({
  selector: 'app-phone-frame',
  standalone: true,
  template: `
    <div class="phone" [attr.aria-busy]="busy() ? 'true' : null">
      <span class="phone-btn phone-btn-silence" aria-hidden="true"></span>
      <span class="phone-btn phone-btn-vol-up" aria-hidden="true"></span>
      <span class="phone-btn phone-btn-vol-down" aria-hidden="true"></span>
      <span class="phone-btn phone-btn-power" aria-hidden="true"></span>

      <div class="phone-body">
        <div class="phone-screen">
          <!-- Bandeau de statut peint à la couleur du menu : l'encoche se pose dessus
               au lieu de recouvrir le haut de la page, comme sur un vrai téléphone.
               edgeToEdge : le contenu (image d'en-tête) monte jusqu'au bord haut de
               l'écran et la barre de statut se superpose, transparente. -->
          <div
            class="phone-status"
            [class.phone-status-edge]="edgeToEdge()"
            [style.background-color]="edgeToEdge() ? null : screenColor()"
          >
            <span class="phone-island" aria-hidden="true"></span>
          </div>
          <ng-content />

          <!-- Indicateur discret : le téléphone reste affiché pendant le chargement,
               on ne fait jamais clignoter l'aperçu. -->
          @if (busy()) {
            <span class="phone-busy" aria-hidden="true"></span>
          }
        </div>
      </div>
    </div>
  `,
})
export class PhoneFrameComponent {
  /** Affiche l'indicateur de rafraîchissement sans masquer le contenu déjà rendu. */
  readonly busy = input(false);

  /** Fond du menu rendu : le bandeau de statut s'y fond au lieu de trancher. */
  readonly screenColor = input('#FFFFFF');

  /**
   * Illustration PREMIUM : le bandeau d'en-tête du menu occupe le haut de l'écran
   * (jusqu'aux coins arrondis), et la barre de statut — encoche comprise — se
   * superpose au lieu d'occuper une bande opaque au-dessus du contenu.
   */
  readonly edgeToEdge = input(false);
}
