import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'qrmenu_admin_credentials';

interface StoredCredentials {
  username: string;
  password: string;
}

/**
 * Gère les identifiants Basic Auth pour l'API admin.
 * Stockés uniquement en sessionStorage (effacés à la fermeture de l'onglet) -
 * jamais en dur dans le code, jamais en localStorage (persistance trop longue
 * pour un identifiant admin).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** Signal réactif consulté par le guard/layout pour savoir si on est "connecté". */
  readonly isAuthenticated = signal<boolean>(this.readStoredCredentials() !== null);

  setCredentials(username: string, password: string): void {
    const value: StoredCredentials = { username, password };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    this.isAuthenticated.set(true);
  }

  clearCredentials(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.isAuthenticated.set(false);
  }

  getAuthorizationHeader(): string | null {
    const creds = this.readStoredCredentials();
    if (!creds) {
      return null;
    }
    const encoded = btoa(`${creds.username}:${creds.password}`);
    return `Basic ${encoded}`;
  }

  /**
   * Auto-connexion en développement local uniquement : tente les identifiants
   * de dev définis dans environment.ts (absents de environment.prod.ts - voir
   * ce fichier). Vérifie réellement contre le backend avant de stocker quoi que
   * ce soit ; si ça échoue (ex: mot de passe dev changé côté backend), l'appelant
   * retombe sur l'écran de login normal. Ne fait jamais rien en production.
   */
  tryDevAutoLogin(): Observable<boolean> {
    if (environment.production || !environment.devAutoLogin) {
      return of(false);
    }

    const { username, password } = environment.devAutoLogin;
    const encoded = btoa(`${username}:${password}`);

    return this.http
      .get(`${environment.apiBaseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Basic ${encoded}` },
      })
      .pipe(
        map(() => {
          this.setCredentials(username, password);
          return true;
        }),
        catchError(() => of(false))
      );
  }

  private readStoredCredentials(): StoredCredentials | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredCredentials;
    } catch {
      return null;
    }
  }
}
