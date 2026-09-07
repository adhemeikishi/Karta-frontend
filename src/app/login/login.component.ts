import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { KartaLogoComponent } from '../shared/karta-logo.component';

@Component({
    selector: 'app-login',
    imports: [CommonModule, FormsModule, KartaLogoComponent],
    templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  submit(): void {
    if (!this.username || !this.password) {
      this.errorMessage.set('Nom d\'utilisateur et mot de passe requis.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    // Vérification des identifiants contre le backend avant de les stocker.
    // (endpoint centralisé dans AuthService — voir AuthService.credentialCheckUrl)
    this.authService.verifyCredentials(this.username, this.password).subscribe({
      next: () => {
        this.authService.setCredentials(this.username, this.password);
        this.loading.set(false);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401) {
          this.errorMessage.set('Identifiants incorrects.');
        } else {
          this.errorMessage.set('Impossible de contacter le serveur QR Menu.');
        }
      },
    });
  }
}
