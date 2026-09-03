import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { RestaurantOffer } from '../models/restaurant.model';
import { offerBadgeClass } from '../restaurants/offer-badge';
import { MenuDesignStudioComponent } from './design/menu-design-studio.component';
import { MAX_PDF_BYTES, Menu, MenuStatus, formatPrice } from './menu.model';
import { MenuService } from './menu.service';

/**
 * Section « Menu » de la page détail client.
 *
 * - Offre BASIC : upload / aperçu / publication d'un PDF.
 * - Offres PRO / PREMIUM : studio de création du menu HTML — style, aperçu permanent,
 *   enregistrement et publication ({@link MenuDesignStudioComponent}).
 *
 * Ce composant ne garde que ce qui est commun aux deux formes : le chargement du menu,
 * son statut, et le résumé de la carte. Tout ce qui touche à l'apparence vit dans le
 * studio.
 */
@Component({
  selector: 'app-menu-section',
  standalone: true,
  imports: [CommonModule, MenuDesignStudioComponent],
  templateUrl: './menu-section.component.html',
})
export class MenuSectionComponent implements OnInit {
  private readonly menuService = inject(MenuService);

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

  /**
   * Carte PDF du client, quelle que soit l'offre.
   *
   * Pour PRO / PREMIUM, `menu.type` peut rester `PDF` : c'est le cas d'un client BASIC
   * passé à PRO. Se fier au type masquait alors sa carte et l'obligeait à tout
   * ressaisir. On se fonde donc sur le CONTENU réellement présent.
   */
  readonly sourcePdf = computed(() => this.menu()?.pdf ?? null);

  /** Une carte PDF existe, mais aucune catégorie n'a encore été produite. */
  readonly canTransformPdf = computed(
    () => this.categoryCount() === 0 && this.sourcePdf() !== null,
  );

  /**
   * Point d'entrée du futur workflow KartaAI (PDF source → extraction → Review).
   * KartaAI n'est pas codé : on n'invente aucun résultat et on ne simule aucune
   * extraction — le bouton annonce seulement que l'étape n'est pas encore active.
   */
  readonly transformNotice = signal(false);

  startKartaAiTransform(): void {
    this.transformNotice.set(true);
  }

  dismissTransformNotice(): void {
    this.transformNotice.set(false);
  }

  previewSourcePdf(): void {
    const url = this.sourcePdf()?.url;
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  readonly categoryCount = computed(() => this.menu()?.structure?.categories.length ?? 0);

  readonly itemCount = computed(() =>
    (this.menu()?.structure?.categories ?? []).reduce((total, c) => total + c.items.length, 0),
  );

  /** Détail de la carte : replié par défaut, le studio est le sujet de la page. */
  readonly cardOpen = signal(false);

  readonly formatPrice = formatPrice;
  readonly offerBadgeClass = offerBadgeClass;

  ngOnInit(): void {
    this.load();
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

  toggleCard(): void {
    this.cardOpen.set(!this.cardOpen());
  }

  /** Le studio publie et dépublie : il renvoie le menu à jour pour garder le statut juste. */
  onMenuChange(menu: Menu): void {
    this.menu.set(menu);
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
