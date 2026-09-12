import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OnboardingService } from './onboarding.service';

/**
 * Premier écran : dire où l'on est, ce qui va se passer, et combien de temps ça prend.
 *
 * Un seul bouton. Rien d'autre à décider ici — le restaurateur n'a pas à comprendre
 * l'architecture de Karta pour mettre sa carte en ligne.
 */
@Component({
  selector: 'app-onboarding-welcome',
  imports: [RouterLink],
  template: `
    <div class="text-center">
      <p class="eyebrow">Bienvenue sur Karta</p>
      <h1 class="page-title mt-3 text-[1.75rem] sm:text-[2rem]">
        Créons votre menu digital{{ firstName() }}.
      </h1>
      <p class="lead mx-auto mt-4 max-w-md">
        Vous importez votre carte, Karta la met en forme, vous vérifiez, vous publiez.
        Cela prend quelques minutes — et vous pourrez tout modifier ensuite.
      </p>

      <ol class="mx-auto mt-10 max-w-sm space-y-4 text-left">
        @for (item of plan; track item.title; let i = $index) {
          <li class="flex gap-3">
            <span
              class="mono mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-100 text-[0.6875rem] font-semibold text-ink-600"
              aria-hidden="true"
              >{{ i + 1 }}</span
            >
            <span>
              <span class="block text-sm font-medium text-ink-900">{{ item.title }}</span>
              <span class="block text-sm text-ink-500">{{ item.detail }}</span>
            </span>
          </li>
        }
      </ol>

      <a routerLink="../menu" class="btn btn-primary mt-10">Commencer</a>
    </div>
  `,
})
export class WelcomeComponent {
  private readonly onboarding = inject(OnboardingService);

  readonly plan = [
    { title: 'Importez votre carte', detail: 'Un PDF suffit, celui que vous avez déjà.' },
    { title: 'Vérifiez', detail: 'Vos catégories, vos plats, vos prix — vous gardez la main.' },
    { title: 'Choisissez votre style', detail: 'Cinq habillages, un aperçu à taille réelle.' },
    { title: 'Publiez', detail: 'Votre QR code est prêt à être scanné.' },
  ];

  /** « Créons votre menu digital, Chez Karta. » — le nom seulement s'il est connu. */
  firstName(): string {
    const name = this.onboarding.restaurant()?.name;
    return name ? `, ${name}` : '';
  }
}
