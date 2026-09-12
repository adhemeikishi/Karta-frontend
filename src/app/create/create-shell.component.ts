import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { KartaLogoComponent } from '../shared/karta-logo.component';
import { CreationDraftService } from './creation-draft.service';

interface FlowStep {
  path: string;
  label: string;
}

/** Les quatre étapes du parcours, dans l'ordre où on les traverse. */
const FLOW: readonly FlowStep[] = [
  { path: '/karta-ai', label: 'Analyse' },
  { path: '/create/review', label: 'Vérification' },
  { path: '/create/design', label: 'Style' },
  { path: '/create/compte', label: 'Compte' },
];

/**
 * Châssis du parcours de création.
 *
 * Volontairement dépouillé : le logo, les quatre repères d'étape, une sortie. Pas la
 * navigation marketing — quelqu'un qui construit sa carte n'a rien à faire dans la FAQ,
 * et lui proposer cinq portes de sortie serait un choix contre lui.
 *
 * Les repères d'étape ne sont pas cliquables : ils situent, ils ne permettent pas de
 * sauter une étape qu'on n'a pas faite. Le retour arrière du navigateur, lui, fonctionne
 * normalement — le brouillon survit à la navigation.
 */
@Component({
  selector: 'create-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, KartaLogoComponent],
  template: `
    <div class="cf-page">
      <header class="cf-head">
        <a routerLink="/" aria-label="Karta — accueil"><karta-logo variant="dark" [size]="28" /></a>

        <ol class="cf-steps" aria-label="Étapes de la création">
          @for (step of flow; track step.path; let i = $index) {
            <li
              class="cf-step"
              [class.cf-step-current]="i === currentIndex()"
              [class.cf-step-done]="i < currentIndex()"
              [attr.aria-current]="i === currentIndex() ? 'step' : null"
            >
              <span class="cf-step-num">0{{ i + 1 }}</span>
              <span>{{ step.label }}</span>
            </li>
          }
        </ol>

        <button type="button" class="cf-quit" (click)="quit()">Quitter</button>
      </header>

      <main class="container cf-body">
        <router-outlet />
      </main>
    </div>
  `,
})
export class CreateShellComponent {
  private readonly router = inject(Router);
  private readonly drafts = inject(CreationDraftService);

  readonly flow = FLOW;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly currentIndex = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    const index = FLOW.findIndex((step) => path.startsWith(step.path));
    return index === -1 ? 0 : index;
  });

  /** Quitter abandonne le brouillon : le garder ferait revenir un travail non voulu. */
  quit(): void {
    this.drafts.clear();
    this.router.navigate(['/']);
  }
}
