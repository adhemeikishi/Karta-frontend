import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, catchError, debounceTime, distinctUntilChanged, filter, of, skip, switchMap } from 'rxjs';
import {
  ACCEPTED_IMAGE_TYPES,
  DesignDraft,
  MAX_IMAGE_BYTES,
  MenuDesign,
  QrEyeStyle,
  QrModuleStyle,
  draftFrom,
  qrColorsScannable,
  qrDraftKey,
} from '../../menu/design/menu-design.model';
import { MenuDesignService } from '../../menu/design/menu-design.service';
import { QrCode } from '../../models/qr-code.model';
import { QrCodeService } from '../../services/qr-code.service';
import { PremiumLockComponent } from '../../shared/premium-lock.component';
import { can } from '../plan';
import { RestaurantContextService } from '../restaurant-context.service';

/**
 * « Mon QR code » — l'objet que le restaurateur imprime et pose sur ses tables.
 *
 * Le QR existe depuis la création du restaurant et ne change jamais : republier une
 * carte ne le remplace pas. C'est ce qui permet de l'imprimer une fois pour toutes, et
 * c'est la première chose que cette page doit dire.
 *
 * Rien n'est fabriqué côté navigateur : l'image vient de {@link QrCodeService}, par les
 * routes portant le restaurant dans l'URL — les seules ouvertes à un compte restaurateur
 * (voir `RestaurateurScopeFilter`). Un QR dessiné ici mènerait nulle part.
 *
 * <strong>Personnalisation (Premium).</strong> Couleurs, formes, logo et branding
 * vivent dans le même document que l'apparence de la carte (`PUT .../menu/design`) : un
 * seul enregistrement, un seul gate d'offre côté serveur. L'aperçu suit chaque réglage
 * sans rien écrire, exactement comme le studio de style — et ce qui est téléchargé est
 * ce qui est affiché.
 */
@Component({
  selector: 'app-qr',
  imports: [FormsModule, PremiumLockComponent],
  templateUrl: './qr.component.html',
})
export class QrComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly qrCodeService = inject(QrCodeService);
  private readonly designService = inject(MenuDesignService);
  private readonly context = inject(RestaurantContextService);

  readonly restaurantId = this.route.snapshot.paramMap.get('restaurantId') ?? '';
  readonly restaurant = this.context.restaurant;

  readonly qr = signal<QrCode | null>(null);
  /** Image en `data:` URL — ces routes exigent l'en-tête d'authentification. */
  readonly image = signal<string | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly downloading = signal<'png' | 'svg' | null>(null);
  readonly downloadError = signal<string | null>(null);

  /** Adresse réellement encodée dans le QR, telle que le backend la construit. */
  readonly menuUrl = computed(() => this.qr()?.redirectUrl ?? null);

  // ------------------------------------------------------------------ personnalisation

  readonly canDesign = computed(() => can(this.restaurant()?.offer, 'qrDesign'));

  /** Apparence enregistrée (document complet) ; référence du « non enregistré ». */
  readonly saved = signal<MenuDesign | null>(null);
  readonly draft = signal<DesignDraft | null>(null);
  readonly previewBusy = signal(false);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly justSaved = signal(false);

  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);

  readonly dirty = computed(() => {
    const saved = this.saved();
    const draft = this.draft();
    return saved !== null && draft !== null && qrDraftKey(draftFrom(saved)) !== qrDraftKey(draft);
  });

  readonly fgColor = computed(() => this.draft()?.qrFgColor ?? '#000000');
  readonly bgColor = computed(() => this.draft()?.qrBgColor ?? '#FFFFFF');

  /** Même règle que le serveur : prévenir avant, plutôt qu'échouer à l'enregistrement. */
  readonly scannable = computed(() => qrColorsScannable(this.fgColor(), this.bgColor()));

  readonly moduleStyles: readonly { id: QrModuleStyle; label: string }[] = [
    { id: 'SQUARE', label: 'Carrés' },
    { id: 'ROUNDED', label: 'Arrondis' },
    { id: 'DOTS', label: 'Points' },
  ];

  readonly eyeStyles: readonly { id: QrEyeStyle; label: string }[] = [
    { id: 'SQUARE', label: 'Carrés' },
    { id: 'ROUNDED', label: 'Arrondis' },
    { id: 'CIRCLE', label: 'Ronds' },
  ];

  private designLoaded = false;

  constructor() {
    // Les contrôles n'ont de sens qu'en Premium : le design n'est chargé que dans ce cas,
    // dès que le châssis a fourni le restaurant (il arrive après le premier rendu).
    effect(() => {
      if (this.canDesign() && !this.designLoaded) {
        this.designLoaded = true;
        this.loadDesign();
      }
    });

    // Aperçu live : chaque réglage repasse par le serveur, avec les mêmes garde-fous que
    // le studio (debounce, pas de requête si rien n'a changé, réponse en retard ignorée).
    // Le premier brouillon (l'état enregistré) est sauté : l'image initiale, chargée sans
    // surcharge, le montre déjà.
    toObservable(this.draft)
      .pipe(
        filter((draft): draft is DesignDraft => draft !== null),
        skip(1),
        debounceTime(160),
        distinctUntilChanged((a, b) => qrDraftKey(a) === qrDraftKey(b)),
        switchMap(() => this.fetchPreview()),
        takeUntilDestroyed(),
      )
      .subscribe((dataUrl) => {
        if (dataUrl !== null) {
          this.image.set(dataUrl);
        }
        this.previewBusy.set(false);
      });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.image.set(null);

    this.qrCodeService.listByRestaurant(this.restaurantId).subscribe({
      next: (list) => this.qr.set(list.length > 0 ? list[0] : null),
      error: () => this.loadError.set(true),
    });

    // L'image enregistrée, sans surcharge : le serveur applique lui-même le design.
    this.fetchPreview().subscribe((dataUrl) => {
      if (dataUrl !== null) {
        this.image.set(dataUrl);
      }
      this.previewBusy.set(false);
      this.loading.set(false);
    });
  }

  private loadDesign(): void {
    this.designService.getDesign(this.restaurantId).subscribe({
      next: (design) => {
        this.saved.set(design);
        this.draft.set(draftFrom(design));
      },
      error: () => this.saveError.set("Les réglages du QR n'ont pas pu être chargés."),
    });
  }

  // ------------------------------------------------------------------ édition

  setFgColor(value: string): void {
    this.patch({ qrFgColor: normalizeHex(value) });
  }

  setBgColor(value: string): void {
    this.patch({ qrBgColor: normalizeHex(value) });
  }

  resetColors(): void {
    this.patch({ qrFgColor: null, qrBgColor: null });
  }

  setModuleStyle(value: QrModuleStyle): void {
    this.patch({ qrModuleStyle: value });
  }

  setEyeStyle(value: QrEyeStyle): void {
    this.patch({ qrEyeStyle: value });
  }

  setHideBranding(hidden: boolean): void {
    this.patch({ hideBranding: hidden });
  }

  clearLogo(): void {
    this.patch({ qrLogoAssetId: null, qrLogoUrl: null });
  }

  onLogoSelected(event: Event): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0] ?? null;
    el.value = '';
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
    this.uploading.set(true);
    this.designService.uploadImage(this.restaurantId, file).subscribe({
      next: (image) => {
        this.uploading.set(false);
        this.patch({ qrLogoAssetId: image.assetId, qrLogoUrl: image.url });
      },
      error: (err) => {
        this.uploading.set(false);
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

  save(): void {
    const draft = this.draft();
    if (!draft || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.designService.saveDesign(this.restaurantId, draft).subscribe({
      next: (design) => {
        this.saved.set(design);
        this.saving.set(false);
        this.justSaved.set(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message ?? "L'enregistrement a échoué.");
      },
    });
  }

  // ------------------------------------------------------------------ aperçu

  /** Surcharges envoyées au serveur : uniquement ce que l'offre permet d'appliquer. */
  private previewParams(): Record<string, string> {
    const d = this.draft();
    if (!d || !this.canDesign() || !this.dirty()) {
      return {};
    }
    // Valeurs explicites, jamais absentes : une surcharge absente signifie « garder
    // l'enregistré », alors qu'un réglage remis à zéro doit se voir avant d'être enregistré.
    const params: Record<string, string> = {
      fgColor: d.qrFgColor ?? '#000000',
      bgColor: d.qrBgColor ?? '#FFFFFF',
      moduleStyle: d.qrModuleStyle ?? 'SQUARE',
      eyeStyle: d.qrEyeStyle ?? 'SQUARE',
      hideBranding: d.hideBranding ? 'true' : 'false',
    };
    // ponytail: un logo retiré reste visible dans l'aperçu jusqu'à l'enregistrement
    // (une surcharge ne sait pas dire « aucun ») — ajouter un paramètre dédié si ça gêne.
    if (d.qrLogoAssetId) {
      params['logoAssetId'] = d.qrLogoAssetId;
    }
    return params;
  }

  private fetchPreview(): Observable<string | null> {
    this.previewBusy.set(true);
    // Un `<img src>` direct échouerait : ces routes sont sous /api/admin/** et exigent
    // l'en-tête d'authentification, que seul HttpClient (via l'intercepteur) fournit.
    return this.qrCodeService.restaurantImagePng(this.restaurantId, this.previewParams()).pipe(
      switchMap((blob) => toDataUrl(blob)),
      catchError(() => {
        this.loadError.set(true);
        return of(null);
      }),
    );
  }

  // ------------------------------------------------------------------ export

  /**
   * PNG pour l'impression courante, SVG pour un imprimeur : le vectoriel se met à
   * n'importe quelle taille sans perdre en netteté, ce qui compte pour un chevalet.
   * Toujours l'apparence affichée à l'écran — jamais une autre.
   */
  download(format: 'png' | 'svg'): void {
    if (this.downloading()) {
      return;
    }
    this.downloading.set(format);
    this.downloadError.set(null);

    const request$ =
      format === 'png'
        ? this.qrCodeService.restaurantImagePng(this.restaurantId, this.previewParams())
        : this.qrCodeService.restaurantImageSvg(this.restaurantId, this.previewParams());

    request$.subscribe({
      next: (blob) => {
        this.downloading.set(null);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-${this.qr()?.code ?? 'karta'}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading.set(null);
        this.downloadError.set("Le téléchargement n'a pas abouti. Réessayez.");
      },
    });
  }

  /**
   * Impression via une iframe cachée plutôt que `window.open` : pas de blocage de
   * pop-up, et la page courante n'est jamais remplacée.
   */
  print(): void {
    const dataUrl = this.image();
    if (!dataUrl) {
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      return;
    }

    const img = doc.createElement('img');
    img.alt = `QR code ${this.qr()?.code ?? ''}`;
    img.style.maxWidth = '100%';
    doc.body.style.cssText =
      'margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh';
    doc.body.appendChild(img);

    img.onload = () => {
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 1000);
    };
    img.onerror = () => iframe.remove();
    img.src = dataUrl;
  }

  openMenu(): void {
    const url = this.menuUrl();
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }
}

/** Un `<input type="color">` renvoie toujours `#rrggbb` ; on se protège du reste. */
function normalizeHex(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(trimmed) ? trimmed : null;
}

function toDataUrl(blob: Blob): Observable<string> {
  return new Observable<string>((subscriber) => {
    const reader = new FileReader();
    reader.onload = () => {
      subscriber.next(reader.result as string);
      subscriber.complete();
    };
    reader.onerror = () => subscriber.error(reader.error);
    reader.readAsDataURL(blob);
  });
}
