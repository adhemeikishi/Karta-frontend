import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, Identity } from '../services/auth.service';
import { KartaLogoComponent } from '../shared/karta-logo.component';

@Component({
    selector: 'app-login',
    imports: [CommonModule, FormsModule, KartaLogoComponent],
    templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Écran demandé avant d'être renvoyé ici par `authGuard` (`?next=`), s'il y en a un. */
  private readonly requestedUrl = this.route.snapshot.queryParamMap.get('next');

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
      next: (identity) => {
        this.authService.setCredentials(this.username, this.password, identity);
        this.loading.set(false);
        this.router.navigateByUrl(destinationFor(identity, this.requestedUrl));
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

/**
 * Où envoyer un compte après connexion.
 *
 * L'écran demandé avant d'être bloqué (`?next=`) l'emporte — <strong>mais seulement
 * s'il est atteignable par le compte qui vient de se connecter</strong> (voir
 * {@link isReachableBy}). Un `next` hérité d'une autre session, ou fabriqué à la main,
 * ne doit pas envoyer un restaurateur dans le back-office ni dans le restaurant d'un
 * autre. À défaut, c'est le <strong>rôle renvoyé par le backend</strong> qui décide.
 * Le frontend ne devine rien : `/api/admin/me` fait foi.
 */
export const DEFAULT_ADMIN_DESTINATION = '/admin/dashboard';

export function destinationFor(identity: Identity | null, next: string | null | undefined): string {
  const requested = safeNextUrl(next);
  if (requested && isReachableBy(identity, requested)) {
    return requested;
  }
  if (identity?.role === 'RESTAURATEUR' && identity.restaurantId) {
    return `/app/${identity.restaurantId}/carte`;
  }
  // Restaurateur sans restaurant (configuration incomplète) : `/app` le dira
  // proprement plutôt que de l'envoyer dans un back-office qui lui est fermé.
  return identity?.role === 'RESTAURATEUR' ? '/app' : DEFAULT_ADMIN_DESTINATION;
}

/**
 * Chemin interne demandé, ou `null` s'il n'y en a pas d'exploitable.
 *
 * `next` vient de l'URL : il n'est accepté que s'il désigne un chemin interne de cette
 * application. Un `//evil.tld` ou un `https://…` est un chemin de redirection ouverte —
 * on l'ignore plutôt que d'y envoyer l'utilisateur. Renvoyer vers `/login` serait une
 * boucle : traité comme absent.
 */
export function safeNextUrl(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return null;
  }
  if (next === '/login' || next.startsWith('/login?') || next.startsWith('/login/')) {
    return null;
  }
  return next;
}

/**
 * L'écran demandé est-il ouvert à ce compte ?
 *
 * Même règle que les gardes de route, appliquée avant la navigation : sans cela on
 * enverrait l'utilisateur vers un écran dont il serait aussitôt renvoyé, en lui faisant
 * traverser un instant d'interface qui ne le concerne pas. Le cas dangereux est le
 * changement de compte : un `next` déposé par la session précédente ne doit jamais
 * décider où atterrit la suivante.
 *
 * Ce qui n'appartient ni au back-office ni à l'Espace Restaurateur (le site public) est
 * atteignable par tout le monde — le refuser n'apporterait rien.
 */
export function isReachableBy(identity: Identity | null, url: string): boolean {
  const path = url.split(/[?#]/)[0];

  if (path === '/admin' || path.startsWith('/admin/')) {
    return identity?.role === 'ADMIN';
  }

  if (path === '/onboarding' || path.startsWith('/onboarding/')) {
    return identity?.role === 'RESTAURATEUR';
  }

  if (path === '/app' || path.startsWith('/app/')) {
    if (identity?.role !== 'RESTAURATEUR') {
      return false;
    }
    // `/app/<restaurantId>/...` : l'identifiant de l'URL doit être le sien. `/app` seul
    // n'en désigne aucun, il se contente de rediriger vers celui du compte.
    const requestedId = path.split('/')[2];
    return !requestedId || requestedId === identity.restaurantId;
  }

  return true;
}
