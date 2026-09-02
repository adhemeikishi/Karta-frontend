import { Injectable, signal } from '@angular/core';

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
  readonly breadcrumbs = signal<Breadcrumb[]>([]);

  setBreadcrumbs(crumbs: Breadcrumb[]): void {
    this.breadcrumbs.set(crumbs);
  }
}
