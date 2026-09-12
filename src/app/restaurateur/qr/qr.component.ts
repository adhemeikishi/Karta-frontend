import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QrCode } from '../../models/qr-code.model';
import { QrCodeService } from '../../services/qr-code.service';
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
 */
@Component({
  selector: 'app-qr',
  templateUrl: './qr.component.html',
})
export class QrComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly qrCodeService = inject(QrCodeService);
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

    // Un `<img src>` direct échouerait : ces routes sont sous /api/admin/** et exigent
    // l'en-tête d'authentification, que seul HttpClient (via l'intercepteur) fournit.
    this.qrCodeService.restaurantImagePng(this.restaurantId).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.image.set(reader.result as string);
          this.loading.set(false);
        };
        reader.onerror = () => {
          this.loadError.set(true);
          this.loading.set(false);
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  /**
   * PNG pour l'impression courante, SVG pour un imprimeur : le vectoriel se met à
   * n'importe quelle taille sans perdre en netteté, ce qui compte pour un chevalet.
   */
  download(format: 'png' | 'svg'): void {
    if (this.downloading()) {
      return;
    }
    this.downloading.set(format);
    this.downloadError.set(null);

    const request$ =
      format === 'png'
        ? this.qrCodeService.restaurantImagePng(this.restaurantId)
        : this.qrCodeService.restaurantImageSvg(this.restaurantId);

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
