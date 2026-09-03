import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  RESTAURANT_OFFERS,
  Restaurant,
  RestaurantOffer,
  RestaurantScanStats,
} from '../../models/restaurant.model';
import { QrCode } from '../../models/qr-code.model';
import { RestaurantService } from '../../services/restaurant.service';
import { QrCodeService } from '../../services/qr-code.service';
import { ShellService } from '../../layout/shell.service';
import { offerBadgeClass } from '../offer-badge';
import { MenuSectionComponent } from '../../menu/menu-section.component';

export type DetailTab = 'overview' | 'qr' | 'menu' | 'stats';

interface TabDef {
  id: DetailTab;
  label: string;
}

/**
 * Page /admin/restaurants/:id (« Détail client » dans l'UI).
 *
 * Règle métier Karta V1 : 1 client = 1 QR unique. Le backend expose une liste
 * (GET /api/admin/restaurants/{id}/qr-codes) mais l'interface ne manipule que le
 * premier élément - aucune logique multi-QR.
 */
@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MenuSectionComponent],
  templateUrl: './restaurant-detail.component.html',
})
export class RestaurantDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly restaurantService = inject(RestaurantService);
  private readonly qrCodeService = inject(QrCodeService);
  private readonly shell = inject(ShellService);

  readonly restaurantId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly offerBadgeClass = offerBadgeClass;
  readonly offers = RESTAURANT_OFFERS;

  readonly tabs: readonly TabDef[] = [
    { id: 'overview', label: "Vue d'ensemble" },
    { id: 'qr', label: 'QR' },
    { id: 'menu', label: 'Menu' },
    { id: 'stats', label: 'Statistiques' },
  ];
  readonly tab = signal<DetailTab>('overview');

  setTab(tab: DetailTab): void {
    this.tab.set(tab);
  }

  readonly restaurant = signal<Restaurant | null>(null);
  readonly qr = signal<QrCode | null>(null);
  readonly stats = signal<RestaurantScanStats | null>(null);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly qrImageDataUrl = signal<string | null>(null);
  readonly qrImageError = signal(false);

  readonly statsLoading = signal(false);
  readonly statsError = signal(false);

  /**
   * Série quotidienne prête à dessiner : une barre par jour de la fenêtre renvoyée par
   * le backend (30 jours, jours vides inclus).
   *
   * `ratio` est normalisé sur le maximum de la période — jamais sur un maximum inventé —
   * et un jour à 0 garde une hauteur nulle : aucune barre fantôme ne doit laisser croire
   * à un scan qui n'a pas eu lieu.
   */
  readonly chartBars = computed(() => {
    const daily = this.stats()?.daily ?? [];
    const max = Math.max(1, ...daily.map((d) => d.scans));
    return daily.map((d) => ({
      date: d.date,
      scans: d.scans,
      ratio: d.scans === 0 ? 0 : d.scans / max,
      label: `${this.formatDayLabel(d.date)} · ${d.scans} scan${d.scans > 1 ? 's' : ''}`,
    }));
  });

  /** Valeur haute de l'axe, affichée telle quelle (pas d'arrondi trompeur). */
  readonly chartMax = computed(() =>
    Math.max(...(this.stats()?.daily ?? []).map((d) => d.scans), 0),
  );

  readonly chartHasScans = computed(() => this.chartMax() > 0);

  /** `2026-09-02` -> `2 sept.` (libellé court, lisible sur 390 px). */
  formatDayLabel(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  // Renommage du client
  readonly renaming = signal(false);
  readonly renameLoading = signal(false);
  readonly renameError = signal<string | null>(null);
  renameValue = '';

  // Changement d'offre
  readonly changingOffer = signal(false);
  readonly changeOfferLoading = signal(false);
  readonly changeOfferError = signal<string | null>(null);
  offerValue: RestaurantOffer = 'BASIC';

  // Suppression du client
  readonly deleting = signal(false);
  readonly deleteLoading = signal(false);
  readonly deleteError = signal<string | null>(null);
  deleteConfirmText = '';

  // Modification de la destination du QR
  readonly editingDestination = signal(false);
  readonly destinationLoading = signal(false);
  readonly destinationError = signal<string | null>(null);
  destinationValue = '';

  // Activation / désactivation du QR
  readonly togglingActive = signal(false);
  readonly toggleError = signal<string | null>(null);

  // Création du QR unique (client sans QR)
  readonly creatingQr = signal(false);
  readonly createQrLoading = signal(false);
  readonly createQrError = signal<string | null>(null);
  newQrName = '';
  newQrDestination = '';

  ngOnInit(): void {
    this.shell.setBreadcrumbs([
      { label: 'Clients', link: '/admin/restaurants' },
      { label: 'Client' },
    ]);
    this.load();
  }

  private syncBreadcrumb(name: string): void {
    this.shell.setBreadcrumbs([
      { label: 'Clients', link: '/admin/restaurants' },
      { label: name },
    ]);
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    // Les statistiques sont celles du CLIENT : elles ne dépendent pas de l'existence
    // d'un QR et sont donc chargées indépendamment du reste.
    this.loadStats();

    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => {
        this.restaurant.set(restaurant);
        this.syncBreadcrumb(restaurant.name);
        this.loadQr();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.status === 404 ? 'Client introuvable.' : 'Impossible de charger le client.',
        );
      },
    });
  }

  private loadQr(): void {
    this.qrCodeService.listByRestaurant(this.restaurantId).subscribe({
      next: (list) => {
        const qr = list.length > 0 ? list[0] : null;
        this.qr.set(qr);
        this.loading.set(false);
        if (qr) {
          this.loadQrImage(qr.id);
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Impossible de charger le QR du client.');
      },
    });
  }

  private loadQrImage(qrId: string): void {
    this.qrImageDataUrl.set(null);
    this.qrImageError.set(false);
    this.qrCodeService.imagePng(qrId).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => this.qrImageDataUrl.set(reader.result as string);
        reader.onerror = () => this.qrImageError.set(true);
        reader.readAsDataURL(blob);
      },
      error: () => this.qrImageError.set(true),
    });
  }

  /**
   * Statistiques du CLIENT (et non d'un QR isolé) : c'est le périmètre attendu par
   * l'onglet, et il reste juste même si le QR est recréé un jour.
   */
  loadStats(): void {
    this.statsLoading.set(true);
    this.statsError.set(false);
    this.restaurantService.stats(this.restaurantId).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsError.set(true);
        this.statsLoading.set(false);
      },
    });
  }

  // --- Renommage ---

  openRename(): void {
    const current = this.restaurant();
    if (!current) {
      return;
    }
    this.renameValue = current.name;
    this.renameError.set(null);
    this.renaming.set(true);
  }

  closeRename(): void {
    if (this.renameLoading()) {
      return;
    }
    this.renaming.set(false);
  }

  submitRename(): void {
    const name = this.renameValue.trim();
    if (!name) {
      this.renameError.set('Le nom est requis.');
      return;
    }
    this.renameLoading.set(true);
    this.renameError.set(null);
    this.restaurantService.rename(this.restaurantId, name).subscribe({
      next: (restaurant) => {
        this.restaurant.set(restaurant);
        this.syncBreadcrumb(restaurant.name);
        this.renameLoading.set(false);
        this.renaming.set(false);
      },
      error: (err) => {
        this.renameLoading.set(false);
        this.renameError.set(err?.status === 400 ? 'Nom invalide.' : 'Le renommage a échoué.');
      },
    });
  }

  // --- Changement d'offre ---

  openChangeOffer(): void {
    const current = this.restaurant();
    if (!current) {
      return;
    }
    this.offerValue = current.offer;
    this.changeOfferError.set(null);
    this.changingOffer.set(true);
  }

  closeChangeOffer(): void {
    if (this.changeOfferLoading()) {
      return;
    }
    this.changingOffer.set(false);
  }

  submitChangeOffer(): void {
    const current = this.restaurant();
    if (!current || this.offerValue === current.offer) {
      this.changingOffer.set(false);
      return;
    }
    this.changeOfferLoading.set(true);
    this.changeOfferError.set(null);
    this.restaurantService.changeOffer(this.restaurantId, this.offerValue).subscribe({
      next: (restaurant) => {
        this.restaurant.set(restaurant);
        this.changeOfferLoading.set(false);
        this.changingOffer.set(false);
      },
      error: (err) => {
        this.changeOfferLoading.set(false);
        this.changeOfferError.set(
          err?.status === 400 ? 'Offre invalide.' : "Le changement d'offre a échoué.",
        );
      },
    });
  }

  // --- Suppression du client ---

  openDelete(): void {
    this.deleteConfirmText = '';
    this.deleteError.set(null);
    this.deleting.set(true);
  }

  closeDelete(): void {
    if (this.deleteLoading()) {
      return;
    }
    this.deleting.set(false);
  }

  /**
   * Vrai seulement si le nom saisi correspond exactement au client chargé.
   * Test explicite plutôt qu'une sentinelle : tant que le client n'est pas chargé,
   * aucune saisie ne peut valider la suppression.
   */
  get deleteConfirmed(): boolean {
    const expected = this.restaurant()?.name;
    return expected !== undefined && this.deleteConfirmText.trim() === expected;
  }

  submitDelete(): void {
    if (!this.deleteConfirmed) {
      return;
    }
    this.deleteLoading.set(true);
    this.deleteError.set(null);
    this.restaurantService.delete(this.restaurantId).subscribe({
      next: () => {
        this.router.navigate(['/admin/restaurants']);
      },
      error: () => {
        this.deleteLoading.set(false);
        this.deleteError.set('La suppression a échoué.');
      },
    });
  }

  // --- Destination du QR ---

  openEditDestination(): void {
    const qr = this.qr();
    if (!qr) {
      return;
    }
    this.destinationValue = qr.destinationUrl;
    this.destinationError.set(null);
    this.editingDestination.set(true);
  }

  closeEditDestination(): void {
    if (this.destinationLoading()) {
      return;
    }
    this.editingDestination.set(false);
  }

  submitDestination(): void {
    const qr = this.qr();
    if (!qr) {
      return;
    }
    const url = this.destinationValue.trim();
    if (!url) {
      this.destinationError.set('La destination est requise.');
      return;
    }
    this.destinationLoading.set(true);
    this.destinationError.set(null);
    this.qrCodeService.updateDestination(qr.id, url).subscribe({
      next: (updated) => {
        this.qr.set(updated);
        this.destinationLoading.set(false);
        this.editingDestination.set(false);
      },
      error: (err) => {
        this.destinationLoading.set(false);
        this.destinationError.set(
          err?.status === 400
            ? 'URL invalide (http:// ou https:// uniquement).'
            : 'La mise à jour a échoué.',
        );
      },
    });
  }

  // --- Activation / désactivation ---

  toggleActive(): void {
    const qr = this.qr();
    if (!qr || this.togglingActive()) {
      return;
    }
    this.togglingActive.set(true);
    this.toggleError.set(null);
    const request$ = qr.active
      ? this.qrCodeService.deactivate(qr.id)
      : this.qrCodeService.activate(qr.id);
    request$.subscribe({
      next: (updated) => {
        this.qr.set(updated);
        this.togglingActive.set(false);
      },
      error: () => {
        this.togglingActive.set(false);
        this.toggleError.set("Le changement d'état a échoué.");
      },
    });
  }

  // --- Téléchargements / impression ---

  downloadPng(): void {
    const qr = this.qr();
    if (!qr) {
      return;
    }
    this.qrCodeService.imagePng(qr.id).subscribe({
      next: (blob) => this.saveBlob(blob, `qr-${qr.code}.png`),
      error: () => this.qrImageError.set(true),
    });
  }

  downloadSvg(): void {
    const qr = this.qr();
    if (!qr) {
      return;
    }
    this.qrCodeService.imageSvg(qr.id).subscribe({
      next: (blob) => this.saveBlob(blob, `qr-${qr.code}.svg`),
      error: () => this.qrImageError.set(true),
    });
  }

  printQr(): void {
    const dataUrl = this.qrImageDataUrl();
    const qr = this.qr();
    if (!dataUrl || !qr) {
      return;
    }

    // iframe caché plutôt que window.open (pas de blocage popup, pas de document.write).
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      return;
    }

    const img = doc.createElement('img');
    img.alt = `QR ${qr.code}`;
    img.style.maxWidth = '100%';
    doc.body.style.margin = '0';
    doc.body.style.display = 'flex';
    doc.body.style.alignItems = 'center';
    doc.body.style.justifyContent = 'center';
    doc.body.appendChild(img);

    img.onload = () => {
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 1000);
    };
    img.onerror = () => iframe.remove();
    img.src = dataUrl;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- Création du QR unique ---

  openCreateQr(): void {
    this.newQrName = this.restaurant()?.name ?? '';
    this.newQrDestination = '';
    this.createQrError.set(null);
    this.creatingQr.set(true);
  }

  closeCreateQr(): void {
    if (this.createQrLoading()) {
      return;
    }
    this.creatingQr.set(false);
  }

  submitCreateQr(): void {
    const name = this.newQrName.trim();
    const destination = this.newQrDestination.trim();
    if (!name || !destination) {
      this.createQrError.set('Nom et destination sont requis.');
      return;
    }
    this.createQrLoading.set(true);
    this.createQrError.set(null);
    this.qrCodeService.create(this.restaurantId, name, destination).subscribe({
      next: (qr) => {
        this.qr.set(qr);
        this.createQrLoading.set(false);
        this.creatingQr.set(false);
        this.loadQrImage(qr.id);
      },
      error: (err) => {
        this.createQrLoading.set(false);
        this.createQrError.set(
          err?.status === 400
            ? 'Données invalides (destination en http:// ou https://).'
            : 'La création du QR a échoué.',
        );
      },
    });
  }
}
