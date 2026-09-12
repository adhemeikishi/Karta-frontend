import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { KartaLogoComponent } from '../shared/karta-logo.component';
import { ONBOARDING_STEPS, stepIndex } from './onboarding.model';
import { OnboardingService } from './onboarding.service';

/**
 * Châssis du parcours de configuration.
 *
 * Volontairement plus dépouillé que l'Espace Restaurateur : pas de navigation entre
 * sections, pas de destination secondaire. À ce stade le restaurateur n'a qu'une chose
 * à faire, et l'écran ne doit rien proposer d'autre.
 *
 * L'indicateur d'étapes ne sert pas à naviguer, il sert à répondre aux trois questions
 * qu'on se pose dans un parcours : où j'en suis, ce que je fais maintenant, ce qui reste.
 */
@Component({
  selector: 'app-onboarding-shell',
  imports: [RouterOutlet, KartaLogoComponent],
  templateUrl: './onboarding-shell.component.html',
})
export class OnboardingShellComponent {
  private readonly auth = inject(AuthService);
  private readonly onboarding = inject(OnboardingService);

  readonly steps = ONBOARDING_STEPS;
  readonly restaurant = this.onboarding.restaurant;

  readonly currentIndex = computed(() => stepIndex(this.onboarding.step()));

  /** L'accueil et l'écran final encadrent le parcours : ils n'y figurent pas. */
  readonly showProgress = computed(() => {
    const step = this.onboarding.step();
    return step !== 'welcome' && step !== 'success';
  });

  logout(): void {
    this.auth.logout();
  }
}
