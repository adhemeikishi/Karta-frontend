import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QrCode } from '../models/qr-code.model';
import { QrCodeService } from '../services/qr-code.service';
import { OnboardingService } from './onboarding.service';

/**
 * Étape finale — la carte est en ligne, voici le QR qui y mène.
 *
 * Le QR affiché est le vrai : image produite par le backend, adresse réellement encodée
 * dedans. Rien n'est fabriqué côté navigateur — un QR inventé ici mènerait nulle part,
 * et c'est précisément l'objet qu'on va imprimer et coller sur des tables.
 *
 * Le QR existe depuis la création du restaurant et ne change jamais : republier une carte
 * ne le remplace pas. C'est ce qui permet de l'imprimer une fois pour toutes.
 */
@Component({
  selector: 'app-onboarding-success',
  template: `
    <div class="text-center">
      <span
        class="mx-auto grid h-12 w-12 place-items-center rounded-full"
        style="background-color: var(--k-success-soft); color: var(--k-success)"
        aria-hidden="true"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
        </svg>
      </span>

      <h1 class="page-title mt-5 text-[1.75rem] sm:text-[2rem]">Félicitations</h1>
      <p class="lead mx-auto mt-3 max-w-md">
        Votre menu digital est en ligne. Imprimez ce QR code et posez-le sur vos tables :
        il ne changera jamais, même quand vous modifierez votre carte.
      </p>
    </div>

    <section class="card card-pad mx-auto mt-8 max-w-sm text-center">
      @if (loading()) {
        <div class="skeleton mx-auto h-52 w-52"></div>
      } @else if (qrImage()) {
        <img
          [src]="qrImage()!"
          [alt]="'QR code de ' + (onboarding.restaurant()?.name || 'votre restaurant')"
          class="mx-auto h-52 w-52"
        />
      } @else {
        <p class="alert-error text-left">
          Le QR code n'a pas pu être chargé. Vous le retrouverez dans votre espace.
        </p>
      }

      @if (menuUrl()) {
        <p class="mt-4 text-xs text-ink-500">Scannez ce QR code, ou ouvrez</p>
        <p class="mono mt-1 break-all text-sm text-ink-900">{{ menuUrl() }}</p>
      }
    </section>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        class="btn btn-outline"
        [disabled]="!qrImage() || downloading()"
        (click)="download()"
      >
        @if (downloading()) {
          <span class="spinner"></span>
        }
        Télécharger le QR code
      </button>
      <button type="button" class="btn btn-outline" [disabled]="!menuUrl()" (click)="openMenu()">
        Voir mon menu
      </button>
    </div>

    <div class="mt-10 text-center">
      <button type="button" class="btn btn-primary" (click)="enterApp()">
        Accéder à mon espace
      </button>
    </div>
  `,
})
export class SuccessComponent implements OnInit {
  readonly onboarding = inject(OnboardingService);
  private readonly qrCodeService = inject(QrCodeService);
  private readonly router = inject(Router);

  readonly qr = signal<QrCode | null>(null);
  /** Image du QR en `data:` URL — les routes d'image exigent l'en-tête d'authentification. */
  readonly qrImage = signal<string | null>(null);
  readonly loading = signal(true);
  readonly downloading = signal(false);

  /** Adresse réellement encodée dans le QR, telle que le backend la construit. */
  readonly menuUrl = computed(() => this.qr()?.redirectUrl ?? null);

  ngOnInit(): void {
    const restaurantId = this.onboarding.restaurantId();
    if (!restaurantId) {
      this.loading.set(false);
      return;
    }

    this.qrCodeService.listByRestaurant(restaurantId).subscribe({
      next: (list) => this.qr.set(list.length > 0 ? list[0] : null),
      error: () => this.qr.set(null),
    });

    // Un `<img src>` direct échouerait : ces routes sont sous /api/admin/** et exigent
    // l'en-tête d'authentification, que seul HttpClient (via l'intercepteur) fournit.
    this.qrCodeService.restaurantImagePng(restaurantId).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.qrImage.set(reader.result as string);
          this.loading.set(false);
        };
        reader.onerror = () => this.loading.set(false);
        reader.readAsDataURL(blob);
      },
      error: () => this.loading.set(false),
    });
  }

  download(): void {
    const restaurantId = this.onboarding.restaurantId();
    if (!restaurantId || this.downloading()) {
      return;
    }
    this.downloading.set(true);
    this.qrCodeService.restaurantImagePng(restaurantId).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-${this.qr()?.code ?? 'karta'}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      },
      error: () => this.downloading.set(false),
    });
  }

  openMenu(): void {
    const url = this.menuUrl();
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  enterApp(): void {
    const restaurantId = this.onboarding.restaurantId();
    this.router.navigate(restaurantId ? ['/app', restaurantId, 'carte'] : ['/app']);
  }
}
