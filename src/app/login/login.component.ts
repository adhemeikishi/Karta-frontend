import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly http = inject(HttpClient);
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

    const encoded = btoa(`${this.username}:${this.password}`);

    // On vérifie les identifiants avant de les stocker, en appelant un endpoint
    // admin réel - pas d'intercepteur ici volontairement (les credentials ne
    // sont pas encore stockés), on passe l'en-tête directement.
    this.http
      .get(`${environment.apiBaseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Basic ${encoded}` },
      })
      .subscribe({
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
