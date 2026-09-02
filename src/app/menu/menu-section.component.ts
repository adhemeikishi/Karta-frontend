import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { RestaurantOffer } from '../models/restaurant.model';
import { offerBadgeClass } from '../restaurants/offer-badge';
import { MAX_PDF_BYTES, Menu, MenuStatus, formatPrice } from './menu.model';
import { MenuService } from './menu.service';

/**
 * Section « Menu » de la page détail client.
 *
 * - Offre BASIC : upload / aperçu / publication d'un PDF (flux complet).
 * - Offres PRO / PREMIUM : lecture du menu structuré (fondation). L'éditeur visuel
 *   et le rendu HTML arrivent à l'étape suivante.
 */
@Component({
  selector: 'app-menu-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-section.component.html',
})
export class MenuSectionComponent implements OnInit, OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly restaurantId = input.required<string>();
  readonly offer = input.required<RestaurantOffer>();

  readonly menu = signal<Menu | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly busy = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly isBasic = computed(() => this.offer() === 'BASIC');

  /** Un menu structuré existe réellement en base (version 0 = aucune ligne menus). */
  readonly hasStructuredMenu = computed(() => {
    const menu = this.menu();
    return menu !== null && menu.type === 'STRUCTURED' && menu.version > 0;
  });

  readonly categoryCount = computed(() => this.menu()?.structure?.categories.length ?? 0);

  readonly itemCount = computed(() =>
    (this.menu()?.structure?.categories ?? []).reduce((total, c) => total + c.items.length, 0),
  );

  readonly formatPrice = formatPrice;
  readonly offerBadgeClass = offerBadgeClass;

  // Aperçu : le HTML est rendu par le backend, jamais reconstruit ici — une seule
  // source de rendu partagée avec la page publique.
  readonly previewOpen = signal(false);
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  private previewObjectUrl: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.menuService.getMenu(this.restaurantId()).subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger le menu.');
        this.loading.set(false);
      },
    });
  }

  statusLabel(status: MenuStatus): string {
    switch (status) {
      case 'PUBLISHED':
        return 'Publié';
      case 'READY':
        return 'Prêt à publier';
      default:
        return 'Brouillon';
    }
  }

  statusBadgeClass(status: MenuStatus): string {
    switch (status) {
      case 'PUBLISHED':
        return 'badge badge-published badge-dot';
      // Contour et non vert : prêt n'est pas diffusé — la nuance doit rester lisible.
      case 'READY':
        return 'badge badge-ready badge-dot';
      default:
        return 'badge badge-draft badge-dot';
    }
  }

  // ------------------------------------------------------------ menu structuré

  createStructuredMenu(): void {
    this.runAction(this.menuService.createMenu(this.restaurantId()));
  }

  // ------------------------------------------------------------ aperçu

  openPreview(): void {
    this.previewOpen.set(true);
    this.previewLoading.set(true);
    this.previewError.set(null);

    this.menuService.previewHtml(this.restaurantId()).subscribe({
      next: (html) => {
        this.releasePreview();
        this.previewObjectUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl));
        this.previewLoading.set(false);
      },
      error: () => {
        this.previewError.set("L'aperçu n'a pas pu être chargé.");
        this.previewLoading.set(false);
      },
    });
  }

  closePreview(): void {
    this.previewOpen.set(false);
    this.releasePreview();
  }

  private releasePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewUrl.set(null);
  }

  // ------------------------------------------------------------ menu PDF (BASIC)

  onFileSelected(event: Event): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0] ?? null;
    el.value = ''; // permet de re-sélectionner le même fichier
    if (!file) {
      return;
    }
    this.uploadPdf(file);
  }

  private uploadPdf(file: File): void {
    this.actionError.set(null);
    if (file.type !== 'application/pdf') {
      this.actionError.set('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      this.actionError.set('Le PDF dépasse la taille maximale de 10 Mo.');
      return;
    }
    this.runAction(this.menuService.uploadPdf(this.restaurantId(), file));
  }

  publish(): void {
    this.runAction(this.menuService.publish(this.restaurantId()));
  }

  unpublish(): void {
    this.runAction(this.menuService.unpublish(this.restaurantId()));
  }

  deletePdf(): void {
    this.runAction(this.menuService.deletePdf(this.restaurantId()));
  }

  preview(): void {
    const url = this.menu()?.pdf?.url;
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} o`;
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  private runAction(request$: Observable<Menu>): void {
    this.busy.set(true);
    this.actionError.set(null);
    request$.subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.busy.set(false);
      },
      error: (err) => {
        this.busy.set(false);
        this.actionError.set(err?.error?.message ?? "L'opération a échoué.");
      },
    });
  }
}
