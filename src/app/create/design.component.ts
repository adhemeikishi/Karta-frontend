import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LANDING_MENU_PRESETS,
  LandingMenuPresetId,
  isHex,
  resolveLandingTheme,
} from '../landing/landing-menu-presets';
import { MenuRenderComponent } from '../landing/menu-render.component';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MenuFontId } from '../menu/design/menu-design.model';
import { PhoneFrameComponent } from '../menu/design/phone-frame.component';
import { SeoService } from '../shared/seo.service';
import { CreationDraftService } from './creation-draft.service';
import { PREMIUM_DEMO_FONTS, ensureFontLoaded, findPremiumFont } from './premium-fonts';

/**
 * `/create/design` — la carte prend le style du restaurant, puis découvre Premium.
 *
 * Le téléphone est le sujet de l'écran : il reste visible pendant toute la
 * configuration, et c'est le **vrai rendu** ({@link MenuRenderComponent} dans
 * {@link PhoneFrameComponent}, mêmes composants que le studio du produit) appliqué au
 * brouillon en cours — pas une maquette.
 *
 * Les contrôles arrivent par paliers : le style d'abord, puis un seul palier Premium
 * (identité, médias, typographie, branding) — c'est le cœur de cet écran : faire
 * *sentir* ce que Premium change, pas le cacher derrière un repli.
 *
 * Aucune option inventée : les cinq presets sont ceux de `MenuPreset.java`, les
 * typographies celles de `MenuFont.java` (voir `premium-fonts.ts`), et `hideBranding`
 * le même champ que `MenuDesign.hideBranding`. Logo et image d'en-tête restent
 * strictement locaux (`URL.createObjectURL`) : aucun envoi réseau, aucune persistance —
 * cet écran reste une démonstration, jamais un éditeur de menu réel.
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
  readonly fonts = PREMIUM_DEMO_FONTS;
  readonly menu = this.drafts.previewMenu;
  readonly counts = this.drafts.counts;

  readonly mediaError = signal<string | null>(null);

  readonly presetId = computed<LandingMenuPresetId>(
    () => this.drafts.draft()?.presetId ?? 'modern',
  );

  private readonly basePreset = computed(
    () => this.presets.find((preset) => preset.id === this.presetId()) ?? this.presets[0],
  );

  /** Registre du preset actif : pilote le libellé « Celle du style (…) » de la typographie. */
  readonly presetTypeface = computed(() => this.basePreset().typeface);

  readonly logoUrl = computed(() => this.drafts.draft()?.logoUrl ?? null);
  readonly heroUrl = computed(() => this.drafts.draft()?.heroUrl ?? null);
  readonly fontId = computed(() => this.drafts.draft()?.fontId ?? null);
  readonly hideBranding = computed(() => this.drafts.draft()?.hideBranding ?? false);

  /** Thème effectif — même résolveur que le rendu public (`MenuThemeResolver`). */
  readonly theme = computed(() => {
    const base = resolveLandingTheme(
      this.basePreset(),
      this.drafts.draft()?.primaryColor ?? null,
      this.drafts.draft()?.secondaryColor ?? null,
      this.logoUrl(),
      this.heroUrl(),
    );
    const font = findPremiumFont(this.fontId());
    return font ? { ...base, fontStack: font.stack } : base;
  });

  readonly brandName = computed(() => this.drafts.draft()?.brandName ?? '');
  readonly sourceKind = computed(() => this.drafts.draft()?.sourceKind ?? 'demo');

  constructor() {
    inject(SeoService).apply({
      title: 'Donnez son style à votre carte',
      description: 'Choisissez le style de votre carte digitale Karta.',
      path: '/create/design',
    });

    // Police Premium choisie : on ne charge sa feuille Google Fonts qu'à ce moment,
    // jamais par défaut (voir MenuFont côté backend).
    effect(() => {
      const font = findPremiumFont(this.fontId());
      if (font) {
        ensureFontLoaded(font);
      }
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

  setFont(value: string): void {
    this.drafts.setFont(value === '' ? null : (value as MenuFontId));
  }

  setHideBranding(hidden: boolean): void {
    this.drafts.setHideBranding(hidden);
  }

  /** Sélection locale d'une image (logo ou en-tête) : jamais envoyée à un serveur. */
  onImageSelected(event: Event, target: 'logo' | 'hero'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = ''; // permet de re-sélectionner le même fichier
    if (!file) {
      return;
    }

    this.mediaError.set(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.mediaError.set('Formats acceptés : JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.mediaError.set("L'image dépasse la taille maximale de 5 Mo.");
      return;
    }

    const url = URL.createObjectURL(file);
    if (target === 'logo') {
      this.revokeIfBlob(this.logoUrl());
      this.drafts.setLogo(url);
    } else {
      this.revokeIfBlob(this.heroUrl());
      this.drafts.setHero(url);
    }
  }

  clearLogo(): void {
    this.revokeIfBlob(this.logoUrl());
    this.drafts.setLogo(null);
  }

  clearHero(): void {
    this.revokeIfBlob(this.heroUrl());
    this.drafts.setHero(null);
  }

  private revokeIfBlob(url: string | null): void {
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /** Le moment de conversion : le visiteur veut son résultat, pas un abonnement. */
  getQrCode(): void {
    this.drafts.setStage('auth');
    this.router.navigate(['/create/compte']);
  }
}
