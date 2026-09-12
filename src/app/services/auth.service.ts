import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'qrmenu_admin_credentials';
const IDENTITY_KEY = 'qrmenu_identity';

/**
 * Marque une déconnexion explicite dans cet onglet.
 *
 * Sans elle, l'auto-connexion de développement ({@link AuthService.tryDevAutoLogin})
 * rouvrait une session ADMIN dès la première route protégée visitée après un logout —
 * y compris quand on venait de se déconnecter d'un compte restaurateur pour en changer.
 * C'était la cause du mélange Admin / Restaurateur observé en local.
 */
const SIGNED_OUT_KEY = 'qrmenu_signed_out';

interface StoredCredentials {
  username: string;
  password: string;
}

/**
 * Qui est connecté, tel que le backend le déclare (`GET /api/admin/me`).
 *
 * `restaurantId` n'est renseigné que pour un restaurateur : c'est SON restaurant, et le
 * backend refuse tout autre identifiant (voir RestaurateurScopeFilter). Un administrateur
 * les gère tous, donc n'en a aucun en particulier.
 */
export interface Identity {
  username: string;
  role: 'ADMIN' | 'RESTAURATEUR';
  restaurantId: string | null;
}

/**
 * Gère les identifiants Basic Auth de l'API.
 * Stockés uniquement en sessionStorage (effacés à la fermeture de l'onglet) -
 * jamais en dur dans le code, jamais en localStorage (persistance trop longue
 * pour un identifiant admin).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /**
   * Seul endpoint que tout compte authentifié peut appeler, quel que soit son rôle.
   * Il sert à la fois à valider des identifiants et à savoir où envoyer l'utilisateur.
   *
   * Auparavant `/api/admin/dashboard` : réservé à l'administration, donc un restaurateur
   * n'aurait jamais pu se connecter.
   */
  private readonly identityUrl = `${environment.apiBaseUrl}/api/admin/me`;

  /** Signal réactif consulté par le guard/layout pour savoir si on est "connecté". */
  readonly isAuthenticated = signal<boolean>(this.readStoredCredentials() !== null);

  /** Identité du compte connecté, rechargée depuis la session au démarrage. */
  readonly identity = signal<Identity | null>(this.readStoredIdentity());

  readonly isAdmin = computed(() => this.identity()?.role === 'ADMIN');

  setCredentials(username: string, password: string, identity: Identity | null): void {
    const value: StoredCredentials = { username, password };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    if (identity) {
      sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    }
    sessionStorage.removeItem(SIGNED_OUT_KEY);
    this.identity.set(identity);
    this.isAuthenticated.set(true);
  }

  /**
   * Efface tout ce qui identifie le compte : identifiants, identité, et — par l'effet
   * ci-dessous — l'état que les services conservent en mémoire.
   *
   * Point de sortie unique. Les deux boutons « Se déconnecter » et l'intercepteur (401)
   * passent par ici : aucun chemin ne peut oublier une moitié de l'état.
   */
  clearCredentials(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(IDENTITY_KEY);
    sessionStorage.setItem(SIGNED_OUT_KEY, '1');
    this.identity.set(null);
    this.isAuthenticated.set(false);
  }

  /**
   * Déconnexion complète : purge de la session puis retour à l'écran de connexion,
   * <strong>sans `next`</strong> — un écran demandé par le compte précédent n'a plus
   * aucune raison d'être rejoué pour le suivant.
   */
  logout(): void {
    this.clearCredentials();
    this.router.navigate(['/login']);
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
   * Vérifie des identifiants Basic Auth contre le backend, **sans rien stocker**.
   * Émet l'identité en cas de succès (2xx) ou propage l'erreur HTTP (401, réseau…)
   * pour que l'appelant distingue « identifiants refusés » de « serveur injoignable ».
   *
   * Volontairement hors intercepteur : à ce stade aucun identifiant n'est stocké,
   * on passe l'en-tête directement.
   */
  verifyCredentials(username: string, password: string): Observable<Identity> {
    const encoded = btoa(`${username}:${password}`);
    return this.http.get<Identity>(this.identityUrl, {
      headers: { Authorization: `Basic ${encoded}` },
    });
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
    // Une déconnexion explicite doit le rester : sinon changer de compte serait
    // impossible en local, l'auto-connexion ADMIN reprenant la main à chaque garde.
    if (sessionStorage.getItem(SIGNED_OUT_KEY)) {
      return of(false);
    }

    const { username, password } = environment.devAutoLogin;

    return this.verifyCredentials(username, password).pipe(
      tap((identity) => this.setCredentials(username, password, identity)),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  private readStoredCredentials(): StoredCredentials | null {
    return readJson<StoredCredentials>(STORAGE_KEY);
  }

  private readStoredIdentity(): Identity | null {
    return readJson<Identity>(IDENTITY_KEY);
  }
}

function readJson<T>(key: string): T | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
