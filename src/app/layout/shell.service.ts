import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';

export interface Breadcrumb {
  label: string;
  /** Lien interne (routerLink). Absent pour le segment courant. */
  link?: string;
}

/**
 * État partagé du châssis : fil d'Ariane affiché dans le header.
 * Chaque page pose ses segments dans ngOnInit ; le détail client les met à jour
 * quand le nom du restaurant est chargé.
 */
@Injectable({ providedIn: 'root' })
export class ShellService {
  private readonly auth = inject(AuthService);

  readonly breadcrumbs = signal<Breadcrumb[]>([]);

  constructor() {
    // Le fil d'Ariane nomme des clients : il ne doit pas survivre au compte qui l'a posé.
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.breadcrumbs.set([]);
      }
    });
  }

  setBreadcrumbs(crumbs: Breadcrumb[]): void {
    this.breadcrumbs.set(crumbs);
  }
}
