import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

export interface PasswordCriterion {
  readonly label: string;
  readonly met: boolean;
}

/**
 * Indicateur de robustesse d'un mot de passe : 4 barres + liste de critères.
 *
 * Un seul critère est réellement exigé par le backend (`min 8 caractères`, voir
 * `SignupDtos.SignupRequest`) — les trois autres (majuscule/minuscule, chiffre,
 * symbole) sont des repères visuels qui influencent le score affiché, mais
 * <strong>ne bloquent jamais la soumission</strong> : ajouter une exigence que le
 * backend n'impose pas tromperait l'utilisateur sur ce qui est réellement requis.
 */
@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (password().length > 0) {
      <div class="pw-strength mt-2" aria-live="polite">
        <div class="pw-strength-bars">
          @for (bar of bars; track bar) {
            <span class="pw-strength-bar" [class]="barClass(bar)"></span>
          }
        </div>
        <p class="pw-strength-label" [class]="labelClass()">{{ label() }}</p>

        <ul class="pw-strength-checks">
          @for (criterion of criteria(); track criterion.label) {
            <li class="pw-strength-check" [class.pw-strength-check-met]="criterion.met">
              <span class="pw-strength-check-icon" aria-hidden="true">
                @if (criterion.met) {
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.5 8.5l3 3 6-7" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="8" cy="8" r="5.5" />
                  </svg>
                }
              </span>
              <span>{{ criterion.label }}</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class PasswordStrengthComponent {
  @Input() set value(v: string | null | undefined) {
    this.password.set(v ?? '');
  }

  readonly password = signal('');
  readonly bars = [0, 1, 2, 3] as const;

  private readonly hasLength = computed(() => this.password().length >= 8);
  private readonly hasMixedCase = computed(
    () => /[a-z]/.test(this.password()) && /[A-Z]/.test(this.password()),
  );
  private readonly hasNumber = computed(() => /[0-9]/.test(this.password()));
  private readonly hasSymbol = computed(() => /[^A-Za-z0-9]/.test(this.password()));

  readonly criteria = computed<PasswordCriterion[]>(() => [
    { label: 'Au moins 8 caractères', met: this.hasLength() },
    { label: 'Majuscules et minuscules', met: this.hasMixedCase() },
    { label: 'Un chiffre', met: this.hasNumber() },
    { label: 'Un symbole', met: this.hasSymbol() },
  ]);

  /** 0 à 4 : nombre de critères satisfaits. Sert uniquement d'indicateur visuel. */
  readonly score = computed(() => this.criteria().filter((c) => c.met).length);

  readonly label = computed(() => {
    if (!this.hasLength()) return 'Trop court';
    const s = this.score();
    if (s <= 1) return 'Faible';
    if (s === 2) return 'Moyen';
    if (s === 3) return 'Bon';
    return 'Fort';
  });

  readonly labelClass = computed(() => `pw-strength-label-${this.tier()}`);

  barClass(bar: number): string {
    const filled = this.hasLength() && bar < this.score();
    return filled ? `pw-strength-bar-filled pw-strength-bar-${this.tier()}` : '';
  }

  private tier(): 'weak' | 'fair' | 'good' | 'strong' {
    if (!this.hasLength()) return 'weak';
    const s = this.score();
    if (s <= 1) return 'weak';
    if (s === 2) return 'fair';
    if (s === 3) return 'good';
    return 'strong';
  }
}
