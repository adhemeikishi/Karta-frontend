import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LANDING_MENU_PRESETS,
  LandingMenuPresetId,
  isHex,
  resolveLandingTheme,
} from '../landing/landing-menu-presets';
import { MenuRenderComponent } from '../landing/menu-render.component';
import { PhoneFrameComponent } from '../menu/design/phone-frame.component';
import { SeoService } from '../shared/seo.service';
import { CreationDraftService } from './creation-draft.service';

/**
 * `/create/design` — la carte prend le style du restaurant.
 *
 * Le téléphone est le sujet de l'écran : il reste visible pendant toute la
 * configuration, et c'est le **vrai rendu** ({@link MenuRenderComponent} dans
 * {@link PhoneFrameComponent}, mêmes composants que le studio du produit) appliqué au
 * brouillon en cours — pas une maquette.
 *
 * Les contrôles arrivent par paliers : le style d'abord, l'identité ensuite, les
 * couleurs en dernier. On ne montre pas quinze réglages à quelqu'un qui vient de
 * relire quarante plats.
 *
 * Aucune option inventée : les cinq presets sont ceux de `MenuPreset.java`, et les
 * couleurs sont celles que PREMIUM permet réellement (voir `landing-offers.ts`). Le
 * logo et l'image d'en-tête demandent un envoi de fichier : ils arrivent avec le
 * compte, et l'écran le dit plutôt que de faire semblant.
 */
@Component({
  selector: 'create-design',
  standalone: true,
  imports: [FormsModule, MenuRenderComponent, PhoneFrameComponent],
  templateUrl: './design.component.html',
})
export class DesignComponent {
  private readonly router = inject(Router);
  readonly drafts = inject(CreationDraftService);

  readonly presets = LANDING_MENU_PRESETS;
  readonly menu = this.drafts.previewMenu;
  readonly counts = this.drafts.counts;

  readonly presetId = computed<LandingMenuPresetId>(
    () => this.drafts.draft()?.presetId ?? 'modern',
  );

  private readonly basePreset = computed(
    () => this.presets.find((preset) => preset.id === this.presetId()) ?? this.presets[0],
  );

  /** Thème effectif — même résolveur que le rendu public (`MenuThemeResolver`). */
  readonly theme = computed(() =>
    resolveLandingTheme(
      this.basePreset(),
      this.drafts.draft()?.primaryColor ?? null,
      this.drafts.draft()?.secondaryColor ?? null,
    ),
  );

  readonly brandName = computed(() => this.drafts.draft()?.brandName ?? '');

  constructor() {
    inject(SeoService).apply({
      title: 'Donnez son style à votre carte',
      description: 'Choisissez le style de votre carte digitale Karta.',
      path: '/create/design',
    });
  }

  selectPreset(id: LandingMenuPresetId): void {
    this.drafts.setPreset(id);
  }

  setBrandName(value: string): void {
    this.drafts.setBrandName(value);
  }

  /** Couleur affichée par le sélecteur : celle choisie, sinon celle du preset. */
  colorFor(field: 'primary' | 'secondary'): string {
    const draft = this.drafts.draft();
    const chosen = field === 'primary' ? draft?.primaryColor : draft?.secondaryColor;
    if (isHex(chosen)) {
      return chosen;
    }
    const base = this.basePreset();
    return field === 'primary' ? base.accent : base.background;
  }

  setColor(field: 'primary' | 'secondary', value: string | null): void {
    const draft = this.drafts.draft();
    const normalized = isHex(value) ? value.toUpperCase() : null;
    this.drafts.setColors(
      field === 'primary' ? normalized : (draft?.primaryColor ?? null),
      field === 'secondary' ? normalized : (draft?.secondaryColor ?? null),
    );
  }

  /** Le moment de conversion : le visiteur veut son résultat, pas un abonnement. */
  getQrCode(): void {
    this.drafts.setStage('auth');
    this.router.navigate(['/create/compte']);
  }
}
