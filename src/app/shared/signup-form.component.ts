import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, Identity } from '../services/auth.service';
import { PasswordStrengthComponent } from './password-strength.component';

/**
 * Formulaire d'inscription libre-service (`POST /api/public/signup`), partagé entre
 * `/login` (onglet Inscription, accès direct hors funnel) et `/create/compte` (étape 4
 * du parcours de création, avec l'aperçu de la carte à côté).
 *
 * Les deux pages gardent leur propre contexte et leur propre rôle — seuls le formulaire
 * et la logique de soumission sont mutualisés ici, pour n'avoir qu'un seul endroit qui
 * sait comment créer un compte, valider ses champs et enchaîner sur la connexion.
 *
 * En cas de succès, connecte immédiatement le compte qui vient d'être créé (mêmes deux
 * étapes qu'une connexion normale : vérifier, puis stocker) et émet {@link success} avec
 * l'identité obtenue — c'est l'appelant qui décide où naviguer ensuite, chaque page ayant
 * sa propre destination logique.
 */
@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [CommonModule, FormsModule, PasswordStrengthComponent],
  templateUrl: './signup-form.component.html',
})
export class SignupFormComponent {
  private readonly auth = inject(AuthService);

  /** Pré-remplissage optionnel (ex. nom du restaurant déjà saisi dans le brouillon). */
  @Input() initialRestaurantName = '';

  /** Émis une fois le compte créé et la session posée. */
  @Output() readonly success = new EventEmitter<Identity>();

  restaurantName = '';
  email = '';
  password = '';
  passwordConfirm = '';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.restaurantName = this.initialRestaurantName;
  }

  submit(): void {
    if (!this.restaurantName.trim() || !this.email.trim() || !this.password) {
      this.errorMessage.set('Tous les champs sont requis.');
      return;
    }
    if (this.password.length < 8) {
      this.errorMessage.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (this.password !== this.passwordConfirm) {
      this.errorMessage.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.signup(this.email, this.password, this.restaurantName).subscribe({
      next: () => {
        // Connexion immédiate avec les identifiants qui viennent d'être créés — mêmes
        // deux étapes qu'une connexion normale (vérifier, puis stocker).
        this.auth.verifyCredentials(this.email, this.password).subscribe({
          next: (identity) => {
            this.auth.setCredentials(this.email, this.password, identity);
            this.loading.set(false);
            this.success.emit(identity);
          },
          error: () => {
            this.loading.set(false);
            // Le compte est bien créé : seule la connexion automatique a échoué.
            this.errorMessage.set('Compte créé. Connectez-vous pour continuer.');
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 409) {
          this.errorMessage.set('Un compte existe déjà avec cet email.');
        } else if (err?.status === 400) {
          this.errorMessage.set(err?.error?.message ?? 'Vérifiez les informations saisies.');
        } else {
          this.errorMessage.set('Impossible de contacter le serveur Karta.');
        }
      },
    });
  }
}
