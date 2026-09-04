import { Component, OnDestroy, computed, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../menu/design/menu-design.model';
import { PhoneFrameComponent } from '../menu/design/phone-frame.component';
import {
  LANDING_MENU_CONTENT,
  LANDING_MENU_PRESETS,
  LandingMenuPresetId,
  isHex,
  resolveLandingTheme,
} from './landing-menu-presets';
import { MenuRenderComponent } from './menu-render.component';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

/**
 * Configurateur PREMIUM de la landing (#premium) : preset → couleurs → nom → logo →
 * en-tête, avec prévisualisation temps réel dans le téléphone.
 *
 * Fidélité au produit — réutilise le rendu réel, pas une reconstruction :
 * <ul>
 *   <li>rendu du menu — {@link MenuRenderComponent}, port fidèle de `menu/menu.html` ;</li>
 *   <li>5 presets réels — {@link LANDING_MENU_PRESETS} (miroir de MenuPreset.java) ;</li>
 *   <li>résolution du thème — {@link resolveLandingTheme} (port de MenuThemeResolver) ;</li>
 *   <li>châssis — {@link PhoneFrameComponent} ;</li>
 *   <li>limites d'upload — ACCEPTED_IMAGE_TYPES / MAX_IMAGE_BYTES du back-office.</li>
 * </ul>
 *
 * Tout est en état local (signals) : aucune requête, aucun rechargement. Les images
 * sont des object URLs locales (aperçu immédiat, rien n'est envoyé), révoquées au
 * remplacement et à la destruction.
 */
@Component({
  selector: 'landing-premium-configurator',
  standalone: true,
  imports: [FormsModule, PhoneFrameComponent, MenuRenderComponent, RevealOnScrollDirective],
  templateUrl: './premium-configurator.component.html',
})
export class PremiumConfiguratorComponent implements OnDestroy {
  readonly presets = LANDING_MENU_PRESETS;
  readonly acceptAttr = ACCEPTED_IMAGE_TYPES.join(',');
  private readonly renderer = viewChild(MenuRenderComponent);

  // État local — pilote directement l'aperçu. Départ : preset par défaut, aucune
  // couleur imposée (changer de preset se voit tout de suite ; les couleurs
  // surchargent ensuite, exactement comme au back-office).
  readonly presetId = signal<LandingMenuPresetId>('modern');
  readonly brandName = signal('Le Petit Persil');
  readonly primaryColor = signal<string | null>(null);
  readonly secondaryColor = signal<string | null>(null);
  readonly logoUrl = signal<string | null>(null);
  readonly heroUrl = signal<string | null>(null);
  readonly switching = signal(false);
  readonly imageError = signal<string | null>(null);

  private readonly objectUrls: { logo: string | null; hero: string | null } = { logo: null, hero: null };
  private switchTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly basePreset = computed(
    () => this.presets.find((p) => p.id === this.presetId()) ?? this.presets[0],
  );

  /** Thème résolu (équivalent MenuTheme) = preset + couleurs + logo + en-tête PREMIUM. */
  readonly theme = computed(() =>
    resolveLandingTheme(
      this.basePreset(),
      this.primaryColor(),
      this.secondaryColor(),
      this.logoUrl(),
      this.heroUrl(),
    ),
  );

  /** Contenu de démo, nom du restaurant piloté par le champ « Nom affiché ». */
  readonly menu = computed(() => ({
    ...LANDING_MENU_CONTENT,
    restaurantName: this.brandName().trim() || LANDING_MENU_CONTENT.restaurantName,
  }));

  selectPreset(id: LandingMenuPresetId): void {
    if (id === this.presetId()) {
      return;
    }
    // Fondu bref : le téléphone ne bouge pas, seul son contenu change.
    this.switching.set(true);
    if (this.switchTimer) {
      clearTimeout(this.switchTimer);
    }
    this.switchTimer = setTimeout(() => {
      this.presetId.set(id);
      this.switching.set(false);
      this.renderer()?.scrollToTop(); // repartir en haut du menu sur le nouveau style
    }, 150);
  }

  /** Couleur affichée par le sélecteur : celle choisie, sinon celle du preset. */
  colorFor(field: 'primary' | 'secondary'): string {
    const chosen = field === 'primary' ? this.primaryColor() : this.secondaryColor();
    if (isHex(chosen)) {
      return chosen;
    }
    const base = this.basePreset();
    return field === 'primary' ? base.accent : base.background;
  }

  setPrimary(value: string): void {
    this.primaryColor.set(isHex(value) ? value.toUpperCase() : null);
  }

  setSecondary(value: string): void {
    this.secondaryColor.set(isHex(value) ? value.toUpperCase() : null);
  }

  resetPrimary(): void {
    this.primaryColor.set(null);
  }

  resetSecondary(): void {
    this.secondaryColor.set(null);
  }

  onImageSelected(event: Event, target: 'logo' | 'hero'): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0] ?? null;
    el.value = ''; // permet de re-sélectionner le même fichier
    if (!file) {
      return;
    }

    this.imageError.set(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.imageError.set('Formats acceptés : JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.imageError.set("L'image dépasse la taille maximale de 5 Mo.");
      return;
    }

    const url = URL.createObjectURL(file);
    this.revoke(target);
    this.objectUrls[target] = url;
    (target === 'logo' ? this.logoUrl : this.heroUrl).set(url);
  }

  clearLogo(): void {
    this.revoke('logo');
    this.logoUrl.set(null);
  }

  clearHero(): void {
    this.revoke('hero');
    this.heroUrl.set(null);
  }

  private revoke(target: 'logo' | 'hero'): void {
    const current = this.objectUrls[target];
    if (current) {
      URL.revokeObjectURL(current);
      this.objectUrls[target] = null;
    }
  }

  ngOnDestroy(): void {
    this.revoke('logo');
    this.revoke('hero');
    if (this.switchTimer) {
      clearTimeout(this.switchTimer);
    }
  }
}
