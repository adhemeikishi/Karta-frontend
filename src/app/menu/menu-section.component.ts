import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { RestaurantOffer } from '../models/restaurant.model';
import { offerBadgeClass } from '../restaurants/offer-badge';
import { MenuDesignStudioComponent } from './design/menu-design-studio.component';
import { MenuEditorComponent } from './editor/menu-editor.component';
import { MAX_PDF_BYTES, Menu, MenuStatus, formatPrice } from './menu.model';
import { MenuService } from './menu.service';
import { MenuDraftService } from './review/menu-draft.service';

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
  imports: [CommonModule, MenuDesignStudioComponent, MenuEditorComponent],
  templateUrl: './menu-section.component.html',
})
export class MenuSectionComponent implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly draftService = inject(MenuDraftService);
  private readonly router = inject(Router);

  readonly restaurantId = input.required<string>();
  readonly offer = input.required<RestaurantOffer>();

  /** Pour rafraîchir l'aperçu du studio après un enregistrement de contenu depuis l'éditeur. */
  private readonly studio = viewChild<MenuDesignStudioComponent>('studio');

  readonly menu = signal<Menu | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly busy = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly isBasic = computed(() => this.offer() === 'BASIC');

  /**
   * Carte PDF du client, quelle que soit l'offre.
   *
   * Pour PRO / PREMIUM, `menu.type` peut rester `PDF` : c'est le cas d'un client BASIC
   * passé à PRO. Se fier au type masquait alors sa carte et l'obligeait à tout
   * ressaisir. On se fonde donc sur le CONTENU réellement présent.
   */
  readonly sourcePdf = computed(() => this.menu()?.pdf ?? null);

  /**
   * Un contenu structuré a réellement été enregistré au moins une fois pour ce client
   * (édition manuelle ou validation KartaAI) — qu'il soit aujourd'hui vide ou non.
   *
   * Le seuil est `version > 1`, PAS `version > 0` : une ligne `menus` peut exister sans
   * qu'aucun contenu n'ait jamais été écrit — le studio de style (`PUT .../menu/design`)
   * crée la ligne dès le premier choix de preset, à `version = 1`, sans jamais
   * l'incrémenter (vérifié : `Menu.bumpVersion()` n'a qu'un seul appelant dans tout le
   * backend, `MenuService.saveStructure()`). Le tout premier enregistrement de contenu
   * réel — via l'éditeur ou via la Review KartaAI validée, les deux passant par le même
   * `PUT .../menu` — crée la ligne à `version = 1` PUIS l'incrémente dans le même appel,
   * donc `version = 2` dès ce premier enregistrement. `version = 1` seul ne prouve donc
   * qu'une chose : quelqu'un a choisi un style, jamais qu'un menu a été créé.
   *
   * Volontairement PAS déduit du nombre de catégories/plats non plus : un menu structuré
   * peut exister et être vide après une édition qui a tout supprimé — il doit alors
   * continuer à afficher l'éditeur, pas repasser par l'état initial.
   */
  readonly hasStructuredMenu = computed(() => {
    const menu = this.menu();
    return menu !== null && menu.type === 'STRUCTURED' && menu.version > 1;
  });

  /**
   * Le client a explicitement choisi de créer son menu à la main, sans passer par
   * KartaAI. Purement local : dès le premier enregistrement, `hasStructuredMenu`
   * devient vrai et prend le relais — ce signal n'a alors plus d'effet.
   */
  readonly manualCreationStarted = signal(false);

  startManualCreation(): void {
    this.manualCreationStarted.set(true);
  }

  /** Éditeur affiché : menu déjà créé (KartaAI ou manuel), ou création manuelle en cours. */
  readonly showEditor = computed(() => this.hasStructuredMenu() || this.manualCreationStarted());

  /** Une carte PDF existe, mais le menu structuré n'a pas encore été créé. */
  readonly canTransformPdf = computed(
    () => !this.hasStructuredMenu() && this.sourcePdf() !== null,
  );

  /**
   * Point d'entrée du parcours KartaAI (PDF source → extraction → Review).
   *
   * L'analyse n'écrit rien dans le menu : elle produit un brouillon que le restaurateur
   * relit sur un écran dédié. La carte publiée, s'il y en a une, reste intacte.
   *
   * L'analyse peut prendre plusieurs dizaines de secondes (voir DEPLOYMENT.md) : le
   * bouton doit rester désactivé pendant l'appel, et un échec (PDF illisible, service
   * indisponible) doit rester visible plutôt que silencieux.
   */
  readonly transforming = signal(false);
  readonly transformError = signal<string | null>(null);

  startKartaAiTransform(): void {
    if (this.transforming()) {
      return;
    }
    this.transforming.set(true);
    this.transformError.set(null);

    this.draftService.importFromPdf(this.restaurantId()).subscribe({
      next: () => {
        this.transforming.set(false);
        this.router.navigate(['/admin/restaurants', this.restaurantId(), 'menu', 'review']);
      },
      error: (err) => {
        this.transforming.set(false);
        this.transformError.set(
          err?.error?.message ?? "L'analyse n'a pas pu aboutir. Réessayez.",
        );
      },
    });
  }

  dismissTransformError(): void {
    this.transformError.set(null);
  }

  previewSourcePdf(): void {
    const url = this.sourcePdf()?.url;
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

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

  /** Le studio publie et dépublie : il renvoie le menu à jour pour garder le statut juste. */
  onMenuChange(menu: Menu): void {
    this.menu.set(menu);
  }

  /**
   * L'éditeur de contenu vient d'enregistrer. Même mise à jour que `onMenuChange`, plus
   * un rafraîchissement de l'aperçu du studio : celui-ci ne réagit qu'aux changements de
   * style, jamais aux changements de contenu — sans ce coup de pouce, l'aperçu resterait
   * sur la version d'avant l'enregistrement tant qu'aucun style n'est retouché.
   */
  onEditorSaved(menu: Menu): void {
    this.menu.set(menu);
    this.studio()?.refreshPreview();
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
