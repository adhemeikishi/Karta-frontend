import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { RestaurantOffer } from '../../models/restaurant.model';
import { Menu } from '../menu.model';
import { MenuService } from '../menu.service';
import {
  ACCEPTED_IMAGE_TYPES,
  DesignDraft,
  MAX_IMAGE_BYTES,
  MenuDesign,
  MenuPresetId,
  draftFrom,
  draftKey,
} from './menu-design.model';
import { MenuDesignService } from './menu-design.service';
import { PhoneFrameComponent } from './phone-frame.component';

/**
 * Studio de création du menu HTML : contrôles à gauche, aperçu permanent à droite.
 *
 * Trois notions distinctes, et l'interface doit les garder distinctes :
 * <ul>
 *   <li><strong>Aperçu</strong> — l'état en cours d'édition, jamais enregistré ;</li>
 *   <li><strong>Enregistrer</strong> — la persistance en base ;</li>
 *   <li><strong>Publier</strong> — la mise en ligne, toujours une action séparée.</li>
 * </ul>
 * Choisir un style ne publie donc jamais rien.
 *
 * L'aperçu est le HTML du renderer backend, celui-là même qui sert la page publique :
 * pas de menu reconstruit en Angular, qui finirait fatalement par en diverger.
 */
@Component({
  selector: 'app-menu-design-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, PhoneFrameComponent],
  templateUrl: './menu-design-studio.component.html',
})
export class MenuDesignStudioComponent implements OnInit, OnDestroy {
  private readonly designService = inject(MenuDesignService);
  private readonly menuService = inject(MenuService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly restaurantId = input.required<string>();
  readonly offer = input.required<RestaurantOffer>();
  readonly menu = input.required<Menu>();

  /** Remonte le menu au parent après publication : le statut affiché reste juste. */
  readonly menuChange = output<Menu>();

  // ------------------------------------------------------------------ état

  /** Apparence enregistrée, telle que renvoyée par l'API. Référence du « non enregistré ». */
  readonly saved = signal<MenuDesign | null>(null);
  /** Ce que l'utilisateur essaie en ce moment. Alimente l'aperçu. */
  readonly draft = signal<DesignDraft | null>(null);

  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly justSaved = signal(false);

  readonly publishing = signal(false);
  readonly publishError = signal<string | null>(null);

  readonly uploading = signal<'logo' | 'hero' | null>(null);
  readonly uploadError = signal<string | null>(null);

  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewBusy = signal(false);
  readonly previewError = signal(false);
  private previewObjectUrl: string | null = null;

  readonly presets = computed(() => this.saved()?.presets ?? []);
  readonly customizable = computed(() => this.saved()?.customizable ?? false);

  readonly dirty = computed(() => {
    const saved = this.saved();
    const draft = this.draft();
    return saved !== null && draft !== null && draftKey(draftFrom(saved)) !== draftKey(draft);
  });

  readonly categoryCount = computed(() => this.menu().structure?.categories.length ?? 0);

  readonly itemCount = computed(() =>
    (this.menu().structure?.categories ?? []).reduce((total, c) => total + c.items.length, 0),
  );

  /**
   * Fond du menu tel qu'il sera rendu. Sert au bandeau de statut du châssis — la même
   * règle que côté serveur : la couleur PREMIUM l'emporte, sinon celle du preset.
   */
  readonly screenBackground = computed(() => {
    const draft = this.draft();
    if (!draft) {
      return '#FFFFFF';
    }
    if (this.customizable() && draft.secondaryColor) {
      return draft.secondaryColor;
    }
    return this.presets().find((p) => p.id === draft.preset)?.background ?? '#FFFFFF';
  });

  /** Une seule prochaine action mise en avant, pour ne jamais avoir à la chercher. */
  readonly nextAction = computed<'save' | 'publish' | 'add-content' | 'live'>(() => {
    if (this.dirty()) {
      return 'save';
    }
    if (this.categoryCount() === 0) {
      return 'add-content';
    }
    return this.menu().published ? 'live' : 'publish';
  });

  constructor() {
    // Aperçu live : le brouillon pilote directement l'iframe.
    // - `distinctUntilChanged` : re-cliquer le preset déjà actif ne relance rien ;
    // - `debounceTime` : une frappe au clavier ou un glissement de sélecteur de couleur
    //   ne déclenche qu'une requête ;
    // - `switchMap` : une réponse en retard ne peut pas écraser un choix plus récent.
    toObservable(this.draft)
      .pipe(
        debounceTime(160),
        distinctUntilChanged((a, b) => (a === null ? b === null : b !== null && draftKey(a) === draftKey(b))),
        switchMap((draft) => this.fetchPreview(draft)),
        takeUntilDestroyed(),
      )
      .subscribe((html) => {
        if (html !== null) {
          this.showPreview(html);
        }
        this.previewBusy.set(false);
      });
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.designService.getDesign(this.restaurantId()).subscribe({
      next: (design) => {
        this.saved.set(design);
        this.draft.set(draftFrom(design));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  // ------------------------------------------------------------------ édition

  selectPreset(preset: MenuPresetId): void {
    this.patch({ preset });
  }

  setBrandName(value: string): void {
    this.patch({ brandName: value.trim() === '' ? null : value });
  }

  setPrimaryColor(value: string): void {
    this.patch({ primaryColor: normalizeHex(value) });
  }

  setSecondaryColor(value: string): void {
    this.patch({ secondaryColor: normalizeHex(value) });
  }

  clearPrimaryColor(): void {
    this.patch({ primaryColor: null });
  }

  clearSecondaryColor(): void {
    this.patch({ secondaryColor: null });
  }

  clearLogo(): void {
    this.patch({ logoAssetId: null, logoUrl: null });
  }

  clearHero(): void {
    this.patch({ heroAssetId: null, heroUrl: null });
  }

  /** Couleur affichée par le sélecteur : celle du client, sinon celle du preset. */
  colorFor(field: 'primaryColor' | 'secondaryColor'): string {
    const draft = this.draft();
    if (!draft) {
      return '#000000';
    }
    const chosen = draft[field];
    if (chosen) {
      return chosen;
    }
    const preset = this.presets().find((p) => p.id === draft.preset);
    if (!preset) {
      return '#000000';
    }
    return field === 'primaryColor' ? preset.accent : preset.background;
  }

  onImageSelected(event: Event, target: 'logo' | 'hero'): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0] ?? null;
    el.value = ''; // permet de re-sélectionner le même fichier
    if (!file) {
      return;
    }

    this.uploadError.set(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.uploadError.set('Formats acceptés : JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.uploadError.set("L'image dépasse la taille maximale de 5 Mo.");
      return;
    }

    this.uploading.set(target);
    this.designService.uploadImage(this.restaurantId(), file).subscribe({
      next: (image) => {
        this.uploading.set(null);
        this.patch(
          target === 'logo'
            ? { logoAssetId: image.assetId, logoUrl: image.url }
            : { heroAssetId: image.assetId, heroUrl: image.url },
        );
      },
      error: (err) => {
        this.uploading.set(null);
        this.uploadError.set(err?.error?.message ?? "L'image n'a pas pu être envoyée.");
      },
    });
  }

  private patch(changes: Partial<DesignDraft>): void {
    const current = this.draft();
    if (!current) {
      return;
    }
    this.justSaved.set(false);
    this.draft.set({ ...current, ...changes });
  }

  // ------------------------------------------------------------------ enregistrer / publier

  save(): void {
    const draft = this.draft();
    if (!draft || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);

    this.designService.saveDesign(this.restaurantId(), draft).subscribe({
      next: (design) => {
        this.saved.set(design);
        // Le brouillon n'est pas remplacé : l'utilisateur a pu continuer à modifier
        // pendant l'enregistrement, et `dirty` recalculera l'écart tout seul.
        this.saving.set(false);
        this.justSaved.set(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message ?? "L'enregistrement a échoué.");
      },
    });
  }

  publish(): void {
    this.runPublication(this.menuService.publish(this.restaurantId()));
  }

  unpublish(): void {
    this.runPublication(this.menuService.unpublish(this.restaurantId()));
  }

  private runPublication(request$: Observable<Menu>): void {
    this.publishing.set(true);
    this.publishError.set(null);
    request$.subscribe({
      next: (menu) => {
        this.publishing.set(false);
        this.menuChange.emit(menu);
      },
      error: (err) => {
        this.publishing.set(false);
        this.publishError.set(err?.error?.message ?? "L'opération a échoué.");
      },
    });
  }

  // ------------------------------------------------------------------ aperçu

  private fetchPreview(draft: DesignDraft | null): Observable<string | null> {
    if (!draft) {
      return of(null);
    }
    this.previewBusy.set(true);
    this.previewError.set(false);
    return this.designService.previewHtml(this.restaurantId(), draft).pipe(
      catchError(() => {
        this.previewError.set(true);
        return of(null);
      }),
    );
  }

  /**
   * Le HTML est servi à l'iframe via un objet URL plutôt qu'en `srcdoc` : le document
   * garde ainsi sa propre origine opaque, et les URL relatives des images restent
   * inoffensives.
   */
  private showPreview(html: string): void {
    const next = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    // L'ancien document est déjà chargé dans l'iframe : révoquer son URL ne l'efface pas.
    this.releasePreview();
    this.previewObjectUrl = next;
    this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(next));
  }

  private releasePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }
}

/** Un `<input type="color">` renvoie toujours `#rrggbb` ; on se protège du reste. */
function normalizeHex(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(trimmed) ? trimmed : null;
}
