import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MAX_PDF_BYTES, Menu } from '../menu/menu.model';
import { MenuService } from '../menu/menu.service';
import { can } from '../restaurateur/plan';
import { OnboardingService } from './onboarding.service';

/**
 * Étape 01 — le restaurateur dépose la carte qu'il a déjà.
 *
 * L'import passe par {@link MenuService.uploadPdf}, exactement comme dans l'Espace
 * Restaurateur : mêmes contraintes de format et de taille, mêmes messages. Rien n'est
 * réimplémenté ici, et surtout rien n'est extrait côté navigateur — la lecture du PDF
 * est le travail du serveur, à l'étape suivante.
 */
@Component({
  selector: 'app-onboarding-import',
  imports: [CommonModule],
  templateUrl: './import.component.html',
})
export class ImportComponent {
  private readonly menuService = inject(MenuService);
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);

  readonly menu = this.onboarding.menu;
  readonly restaurantId = computed(() => this.onboarding.restaurant()?.id ?? '');

  readonly pdf = computed(() => this.menu()?.pdf ?? null);

  /**
   * Une carte BASIC <em>est</em> le PDF : il n'y a rien à analyser, on passe droit à la
   * publication. Les offres PRO et PREMIUM produisent une carte numérique, donc une
   * analyse puis une vérification (voir `plan.ts`).
   */
  readonly buildsDigitalMenu = computed(() => can(this.onboarding.offer(), 'structuredMenu'));

  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Surbrillance de la zone de dépôt pendant un glisser. */
  readonly dragging = signal(false);

  // ------------------------------------------------------------------ dépôt

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) {
      this.upload(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = ''; // permet de re-sélectionner le même fichier
    if (file) {
      this.upload(file);
    }
  }

  private upload(file: File): void {
    this.errorMessage.set(null);
    if (file.type !== 'application/pdf') {
      this.errorMessage.set('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      this.errorMessage.set('Votre PDF dépasse la taille maximale de 10 Mo.');
      return;
    }

    this.busy.set(true);
    this.menuService.uploadPdf(this.restaurantId(), file).subscribe({
      next: (menu: Menu) => {
        this.onboarding.setMenu(menu);
        this.busy.set(false);
      },
      error: (err) => {
        this.busy.set(false);
        this.errorMessage.set(err?.error?.message ?? "L'import a échoué. Réessayez.");
      },
    });
  }

  // ------------------------------------------------------------------ suite

  /** Étape suivante : l'analyse pour une carte numérique, la publication pour un PDF. */
  next(): void {
    this.router.navigate(['/onboarding', this.buildsDigitalMenu() ? 'processing' : 'publish']);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} o`;
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }
}
