import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { draftFrom } from '../../menu/design/menu-design.model';
import { MenuDesignService } from '../../menu/design/menu-design.service';
import { PhoneFrameComponent } from '../../menu/design/phone-frame.component';
import { MenuEditorComponent } from '../../menu/editor/menu-editor.component';
import { MAX_PDF_BYTES, Menu, MenuStatus, hasStructuredContent } from '../../menu/menu.model';
import { MenuService } from '../../menu/menu.service';
import { MenuDraftService } from '../../menu/review/menu-draft.service';
import { RestaurantContextService } from '../restaurant-context.service';

/**
 * « Ma carte » — l'écran principal de l'Espace Restaurateur.
 *
 * Reprend le parcours réel de Karta (PDF source → KartaIA → Review → carte structurée)
 * mais du point de vue du restaurateur : sa carte, pas une fiche client. Aucune action
 * commerciale (offre, suppression, renommage) n'y figure — elles restent au back-office.
 *
 * Aucune logique métier n'est réécrite ici : l'upload, l'analyse, l'écriture de la
 * structure et les règles de taille/format vivent dans {@link MenuService},
 * {@link MenuDraftService} et {@link MenuEditorComponent}, tous réutilisés tels quels.
 *
 * <strong>Le contenu est montré à côté de son rendu.</strong> Éditer une carte sans la
 * voir, c'est remplir un formulaire ; l'aperçu est le même HTML que la page publique,
 * produit par le renderer backend — jamais un menu reconstruit en Angular. Il est en
 * lecture seule ici : le style se choisit sur l'écran Apparence.
 *
 * Enregistrer n'est pas publier : cette phase s'arrête à « prêt à publier » (READY).
 * La mise en ligne arrivera avec l'écran Apparence — jamais en effet de bord d'un
 * enregistrement.
 */
@Component({
  selector: 'app-carte',
  imports: [CommonModule, RouterLink, MenuEditorComponent, PhoneFrameComponent],
  templateUrl: './carte.component.html',
})
export class CarteComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);
  private readonly draftService = inject(MenuDraftService);
  private readonly designService = inject(MenuDesignService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly context = inject(RestaurantContextService);

  readonly restaurantId = this.route.snapshot.paramMap.get('restaurantId') ?? '';
  readonly restaurant = this.context.restaurant;

  readonly menu = signal<Menu | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  /** Upload / suppression du PDF source. */
  readonly pdfBusy = signal(false);
  readonly pdfError = signal<string | null>(null);

  /** Analyse KartaIA — peut durer plusieurs dizaines de secondes. */
  readonly analyzing = signal(false);
  readonly analyzeError = signal<string | null>(null);

  readonly pdf = computed(() => this.menu()?.pdf ?? null);

  readonly hasStructure = computed(() => hasStructuredContent(this.menu()));

  /**
   * Le restaurateur a choisi de saisir sa carte à la main, sans PDF ni KartaIA.
   * Purement local : dès le premier enregistrement, `hasStructure` prend le relais.
   */
  readonly manualStarted = signal(false);

  readonly showEditor = computed(() => this.hasStructure() || this.manualStarted());

  /** Une carte PDF existe et n'a pas encore été transformée en carte structurée. */
  readonly canAnalyze = computed(() => this.pdf() !== null && !this.hasStructure());

  readonly categoryCount = computed(() => this.menu()?.structure?.categories.length ?? 0);

  readonly itemCount = computed(() =>
    (this.menu()?.structure?.categories ?? []).reduce((total, c) => total + c.items.length, 0),
  );

  /** Carte figée et complète, en attente de mise en ligne. */
  readonly isReady = computed(() => this.menu()?.status === 'READY');

  // ------------------------------------------------------------------ aperçu

  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewBusy = signal(false);
  readonly previewError = signal(false);
  private previewObjectUrl: string | null = null;

  /** Vrai dès qu'il y a quelque chose à montrer : sinon l'aperçu resterait vide. */
  readonly showPreview = computed(() => this.hasStructure() && this.categoryCount() > 0);

  /**
   * Deux colonnes seulement quand il y a un aperçu à poser à côté, et seulement à partir
   * de `xl` : en dessous, l'éditeur a besoin de toute la largeur. Classes construites ici
   * plutôt qu'en `[class.…]` — une classe Tailwind à crochets n'y survit pas.
   */
  readonly layoutClass = computed(() =>
    this.showPreview()
      ? 'grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-12'
      : 'grid items-start gap-8',
  );

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.menuService.getMenu(this.restaurantId).subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.loading.set(false);
        this.refreshPreview();
      },
      error: () => {
        this.loadError.set('Impossible de charger votre carte.');
        this.loading.set(false);
      },
    });
  }

  // ------------------------------------------------------------------ PDF source

  onFileSelected(event: Event): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0] ?? null;
    el.value = ''; // permet de re-sélectionner le même fichier
    if (!file) {
      return;
    }

    this.pdfError.set(null);
    if (file.type !== 'application/pdf') {
      this.pdfError.set('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      this.pdfError.set('Votre PDF dépasse la taille maximale de 10 Mo.');
      return;
    }

    this.runPdfAction(this.menuService.uploadPdf(this.restaurantId, file));
  }

  deletePdf(): void {
    this.runPdfAction(this.menuService.deletePdf(this.restaurantId));
  }

  openPdf(): void {
    const url = this.pdf()?.url;
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  private runPdfAction(request$: Observable<Menu>): void {
    this.pdfBusy.set(true);
    this.pdfError.set(null);
    request$.subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.pdfBusy.set(false);
      },
      error: (err) => {
        this.pdfBusy.set(false);
        this.pdfError.set(err?.error?.message ?? "L'opération a échoué.");
      },
    });
  }

  // ------------------------------------------------------------------ KartaIA

  /**
   * Lance l'analyse du PDF déjà importé. N'écrit rien dans la carte : le résultat est
   * un brouillon relu sur l'écran de Review. Une carte publiée reste intacte.
   */
  analyze(): void {
    if (this.analyzing()) {
      return;
    }
    this.analyzing.set(true);
    this.analyzeError.set(null);

    this.draftService.importFromPdf(this.restaurantId).subscribe({
      next: () => {
        this.analyzing.set(false);
        this.router.navigate(['/app', this.restaurantId, 'carte', 'review']);
      },
      error: (err) => {
        this.analyzing.set(false);
        this.analyzeError.set(err?.error?.message ?? "L'analyse n'a pas pu aboutir. Réessayez.");
      },
    });
  }

  // ------------------------------------------------------------------ éditeur

  startManual(): void {
    this.manualStarted.set(true);
  }

  onEditorSaved(menu: Menu): void {
    this.menu.set(menu);
    // Le contenu vient de changer : l'aperçu doit le refléter, sans quoi il montrerait
    // la version d'avant l'enregistrement.
    this.refreshPreview();
  }

  // ------------------------------------------------------------------ aperçu

  /**
   * Recharge l'aperçu avec le style ENREGISTRÉ du restaurant.
   *
   * Deux requêtes existantes : l'apparence en base, puis le HTML rendu par le backend —
   * celui-là même qui sert la page publique. Aucun nouvel endpoint, aucun rendu Angular
   * parallèle qui finirait par diverger (voir DESIGN.md §12).
   */
  refreshPreview(): void {
    if (!this.showPreview()) {
      return;
    }
    this.previewBusy.set(true);
    this.previewError.set(false);

    this.designService
      .getDesign(this.restaurantId)
      .pipe(
        switchMap((design) => this.designService.previewHtml(this.restaurantId, draftFrom(design))),
        catchError(() => {
          this.previewError.set(true);
          return of(null);
        }),
      )
      .subscribe((html) => {
        this.previewBusy.set(false);
        if (html !== null) {
          this.showPreviewHtml(html);
        }
      });
  }

  /**
   * Objet URL plutôt que `srcdoc` : le document garde une origine opaque, et les URL
   * relatives des images restent inoffensives.
   */
  private showPreviewHtml(html: string): void {
    const next = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
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

  // ------------------------------------------------------------------ affichage

  statusLabel(status: MenuStatus): string {
    switch (status) {
      case 'PUBLISHED':
        return 'En ligne';
      case 'READY':
        return 'Prête à publier';
      default:
        return 'Brouillon';
    }
  }

  /** Modificateur de `.app-status` : la couleur du point suit l'état réel. */
  statusClass(status: MenuStatus): string {
    switch (status) {
      case 'PUBLISHED':
        return 'app-status app-status-live';
      case 'READY':
        return 'app-status app-status-ready';
      default:
        return 'app-status';
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

  /** « 1 catégorie » / « 4 catégories » — jamais « 4 catégorie(s) ». */
  plural(count: number, singular: string, plural: string): string {
    return `${count} ${count > 1 ? plural : singular}`;
  }
}
