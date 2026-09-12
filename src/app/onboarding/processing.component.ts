import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MenuDraftService } from '../menu/review/menu-draft.service';
import { OnboardingService } from './onboarding.service';

/**
 * Étape 02 — Karta lit la carte importée.
 *
 * <strong>Aucune progression simulée.</strong> Le backend expose une seule opération,
 * `POST .../menu/ai/import`, qui rend la main quand tout est terminé : il n'existe pas
 * d'avancement intermédiaire à afficher. Les lignes ci-dessous décrivent donc ce qui est
 * en train de se faire, et ne se cochent qu'au retour réel du serveur — jamais sur un
 * minuteur. Une barre qui avance toute seule mentirait, et mentirait précisément au
 * moment où le restaurateur attend.
 *
 * L'analyse n'écrit rien dans la carte : elle produit un brouillon relu à l'étape
 * suivante. Une carte déjà publiée resterait intacte.
 */
@Component({
  selector: 'app-onboarding-processing',
  template: `
    <div class="text-center">
      <p class="eyebrow">02</p>
      <h1 class="page-title mt-2 text-[1.6rem] sm:text-[1.75rem]">
        @if (failed()) {
          La lecture n'a pas abouti
        } @else {
          Votre menu est en cours de préparation
        }
      </h1>
      <p class="lead mx-auto mt-3 max-w-md">
        @if (failed()) {
          {{ errorMessage() }}
        } @else {
          Karta lit votre carte. Cela peut prendre jusqu'à une minute — ne fermez pas cette page.
        }
      </p>
    </div>

    <section class="card card-pad mx-auto mt-8 max-w-md">
      <ul class="space-y-3">
        @for (task of tasks; track task) {
          <li class="flex items-center gap-3">
            @if (done()) {
              <span
                class="grid h-5 w-5 shrink-0 place-items-center rounded-full"
                style="background-color: var(--k-success-soft); color: var(--k-success)"
                aria-hidden="true"
              >
                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              </span>
            } @else if (failed()) {
              <span class="h-5 w-5 shrink-0 rounded-full bg-ink-100" aria-hidden="true"></span>
            } @else {
              <span class="grid h-5 w-5 shrink-0 place-items-center" aria-hidden="true">
                <span class="spinner"></span>
              </span>
            }
            <span class="text-sm" [class.text-ink-900]="done()" [class.text-ink-500]="!done()">
              {{ task }}
            </span>
          </li>
        }
      </ul>

      <p class="sr-only" aria-live="polite">
        @if (done()) {
          Lecture terminée.
        } @else if (failed()) {
          {{ errorMessage() }}
        } @else {
          Lecture de votre carte en cours.
        }
      </p>
    </section>

    @if (failed()) {
      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" class="btn btn-primary" (click)="start()">Réessayer</button>
        <button type="button" class="btn btn-outline" (click)="backToImport()">
          Changer de fichier
        </button>
      </div>
    }
  `,
})
export class ProcessingComponent implements OnInit {
  private readonly draftService = inject(MenuDraftService);
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);

  /** Ce que fait réellement l'extraction, dans l'ordre où le serveur l'exécute. */
  readonly tasks = [
    'Analyse du menu',
    'Création des catégories',
    'Récupération des plats',
    'Mise en forme',
  ];

  readonly done = signal(false);
  readonly failed = signal(false);
  readonly errorMessage = signal('');

  private running = false;

  ngOnInit(): void {
    this.start();
  }

  start(): void {
    const restaurantId = this.onboarding.restaurant()?.id;
    if (!restaurantId || this.running) {
      return;
    }
    this.running = true;
    this.failed.set(false);
    this.done.set(false);

    this.draftService.importFromPdf(restaurantId).subscribe({
      next: () => {
        this.running = false;
        this.done.set(true);
        this.onboarding.setHasDraft(true);
        this.router.navigate(['/onboarding', 'review']);
      },
      error: (err) => {
        this.running = false;
        this.failed.set(true);
        this.errorMessage.set(
          err?.error?.message ??
            "Karta n'a pas réussi à lire ce PDF. Vérifiez qu'il contient bien du texte, ou essayez un autre fichier.",
        );
      },
    });
  }

  backToImport(): void {
    this.router.navigate(['/onboarding', 'menu']);
  }
}
