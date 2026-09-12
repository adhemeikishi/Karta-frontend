import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CreationDraftService } from '../../create/creation-draft.service';
import { formatFileSize } from '../../create/file-size';

/** Mêmes limites que l'import réel de l'onboarding (`ImportComponent`). */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Le point d'entrée du parcours, sur la landing : on dépose sa carte actuelle.
 *
 * L'écran ne fait qu'une chose — retenir le fichier, puis passer la main à
 * `/karta-ai`. La transformation est une étape du produit, pas une animation jouée
 * dans un coin de la page d'accueil.
 *
 * <strong>Le fichier ne quitte pas l'appareil.</strong> Aucun appel réseau : seuls son
 * nom et sa taille sont retenus, pour être affichés pendant le parcours. La suite est
 * une démonstration, et chaque écran le dit.
 */
@Component({
  selector: 'landing-menu-import-dropzone',
  standalone: true,
  templateUrl: './menu-import-dropzone.component.html',
})
export class MenuImportDropzoneComponent {
  private readonly drafts = inject(CreationDraftService);
  private readonly router = inject(Router);

  readonly dragging = signal(false);
  readonly error = signal<string | null>(null);
  readonly file = signal<{ name: string; size: string; bytes: number } | null>(null);

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
    this.accept(event.dataTransfer?.files?.[0] ?? null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = ''; // permet de re-sélectionner le même fichier
    this.accept(file);
  }

  clear(): void {
    this.file.set(null);
    this.error.set(null);
  }

  /** Ouvre le parcours. Le brouillon naît ici et survit à la navigation. */
  start(): void {
    const file = this.file();
    if (!file) {
      return;
    }
    this.drafts.start(file.name, file.bytes);
    this.router.navigate(['/karta-ai']);
  }

  private accept(file: File | null): void {
    if (!file) {
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.error.set('Format accepté : PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('Le fichier dépasse la taille maximale de 10 Mo.');
      return;
    }
    this.error.set(null);
    this.file.set({ name: file.name, size: formatFileSize(file.size), bytes: file.size });
  }
}
