import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LANDING_MENU_PRESETS, resolveLandingTheme } from '../landing/landing-menu-presets';
import { MenuRenderComponent } from '../landing/menu-render.component';
import { PhoneFrameComponent } from '../menu/design/phone-frame.component';
import { KartaLogoComponent } from '../shared/karta-logo.component';
import { SeoService } from '../shared/seo.service';
import { CreationDraftService } from './creation-draft.service';
import { countDraft } from './creation-draft.model';
import { formatFileSize } from './file-size';

interface AnalysisStep {
  /** Début de l'étape, en ms depuis le lancement. */
  at: number;
  label: string;
}

/** Vocabulaire d'un moteur de traitement documentaire, pas d'un assistant. */
const STEPS: readonly AnalysisStep[] = [
  { at: 0, label: 'Lecture du document' },
  { at: 2_000, label: 'Extraction des plats' },
  { at: 5_000, label: 'Structuration du menu' },
  { at: 8_000, label: 'Normalisation des informations' },
  { at: 11_000, label: 'Construction de votre carte' },
];

const TOTAL_MS = 14_000;
/** Fenêtre pendant laquelle la carte se construit dans le téléphone. */
const BUILD_FROM = 11_000;
const TICK_MS = 80;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * `/karta-ai` — le document devient une carte.
 *
 * Une étape à part entière du parcours, pas une attente : le visiteur voit son document
 * lu, vidé de son contenu, restructuré, puis reconstruit dans le téléphone. Quatorze
 * secondes, cinq étapes, un état visuel qui avance en continu.
 *
 * <strong>C'est une démonstration, et elle le dit.</strong> Le fichier déposé n'est ni
 * lu ni envoyé : aucun appel réseau, rien ne quitte l'appareil. L'extraction réelle
 * (Gemini) n'est pas branchée ; le jour où elle le sera, c'est ce même écran qui
 * affichera sa progression. Seuls le nom et la taille du fichier sont réels ; tout le
 * reste vient de la carte d'exemple et **les compteurs sont comptés dessus**.
 *
 * Un seul intervalle porte l'animation : l'état dérive de `elapsed` par des `computed`.
 * Il est nettoyé à la destruction, y compris si le visiteur quitte en cours de route.
 */
@Component({
  selector: 'karta-ai-page',
  standalone: true,
  imports: [RouterLink, MenuRenderComponent, PhoneFrameComponent, KartaLogoComponent],
  templateUrl: './karta-ai.component.html',
})
export class KartaAiComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly drafts = inject(CreationDraftService);

  readonly steps = STEPS;
  readonly elapsed = signal(0);
  readonly done = signal(false);

  private ticker: ReturnType<typeof setInterval> | null = null;

  /** Aperçu réel : preset `Modern`, résolu par le résolveur du rendu public. */
  readonly theme = computed(() =>
    resolveLandingTheme(
      LANDING_MENU_PRESETS.find((preset) => preset.id === this.drafts.draft()?.presetId) ??
        LANDING_MENU_PRESETS[0],
      null,
      null,
    ),
  );

  readonly menu = this.drafts.previewMenu;
  readonly fileName = computed(() => this.drafts.draft()?.fileName ?? '');
  readonly fileSize = computed(() => formatFileSize(this.drafts.draft()?.fileSizeBytes ?? 0));

  /** Ce que contient la carte d'exemple — compté, jamais annoncé. */
  private readonly totals = computed(() => {
    const draft = this.drafts.draft();
    return draft ? countDraft(draft) : { categories: 0, items: 0, prices: 0, descriptions: 0, needsReview: 0 };
  });

  readonly progress = computed(() =>
    this.done() ? 100 : Math.min(100, Math.round((this.elapsed() / TOTAL_MS) * 100)),
  );

  readonly stepIndex = computed(() => {
    if (this.done()) {
      return STEPS.length - 1;
    }
    const now = this.elapsed();
    let index = 0;
    for (let i = 0; i < STEPS.length; i++) {
      if (now >= STEPS[i].at) {
        index = i;
      }
    }
    return index;
  });

  /** Étape 02 — les compteurs montent vers leur valeur réelle. */
  readonly detected = computed(() => {
    const ratio = this.done()
      ? 1
      : clamp01((this.elapsed() - STEPS[1].at) / (STEPS[2].at - STEPS[1].at));
    const totals = this.totals();
    return {
      categories: Math.round(totals.categories * ratio),
      items: Math.round(totals.items * ratio),
      prices: Math.round(totals.prices * ratio),
      descriptions: Math.round(totals.descriptions * ratio),
    };
  });

  /** Étape 03 — les catégories apparaissent une à une. */
  readonly visibleCategories = computed(() => {
    const names = this.drafts.draft()?.categories.map((category) => category.name) ?? [];
    if (this.done()) {
      return names;
    }
    const ratio = clamp01((this.elapsed() - STEPS[2].at) / (STEPS[3].at - STEPS[2].at));
    return names.slice(0, Math.round(names.length * ratio));
  });

  /** Étape 04 — les quatre contrôles passent à OK. */
  readonly checks = ['Noms', 'Prix', 'Descriptions', 'Catégories'] as const;
  readonly checksDone = computed(() => {
    if (this.done()) {
      return this.checks.length;
    }
    const ratio = clamp01((this.elapsed() - STEPS[3].at) / (STEPS[4].at - STEPS[3].at));
    return Math.floor(this.checks.length * ratio);
  });

  /** Étape 05 — hauteur de carte déjà construite dans le téléphone, en %. */
  readonly buildPercent = computed(() =>
    this.done()
      ? 100
      : Math.round(clamp01((this.elapsed() - BUILD_FROM) / (TOTAL_MS - BUILD_FROM)) * 100),
  );

  /** Le téléphone remplace le document dès que la construction commence. */
  readonly showPreview = computed(() => this.done() || this.elapsed() >= BUILD_FROM);

  constructor() {
    inject(SeoService).apply({
      title: 'Karta AI',
      description: 'Votre menu est en cours de transformation.',
      path: '/karta-ai',
    });
  }

  ngOnInit(): void {
    const draft = this.drafts.draft();
    if (!draft) {
      this.router.navigate(['/']);
      return;
    }
    // Revenir en arrière sur une carte déjà analysée ne rejoue pas quatorze secondes.
    if (draft.stage !== 'analyzing') {
      this.elapsed.set(TOTAL_MS);
      this.done.set(true);
      return;
    }

    // Horloge réelle plutôt qu'un compteur de battements : un onglet mis en arrière-plan
    // ralentit les intervalles, la séquence resterait figée au retour.
    const startedAt = Date.now();
    this.ticker = setInterval(() => {
      const now = Date.now() - startedAt;
      this.elapsed.set(Math.min(now, TOTAL_MS));
      if (now >= TOTAL_MS) {
        this.finish();
      }
    }, TICK_MS);
  }

  private finish(): void {
    this.stop();
    this.elapsed.set(TOTAL_MS);
    this.done.set(true);
    this.drafts.setStage('review');
  }

  private stop(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
