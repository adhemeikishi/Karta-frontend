import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CreationDraftService } from '../../create/creation-draft.service';
import { formatFileSize } from '../../create/file-size';
import { MenuDemoService } from '../../create/menu-demo.service';

/** Mêmes limites que l'import réel de l'onboarding (`ImportComponent`). */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Le point d'entrée du parcours, sur la landing : on dépose sa carte actuelle.
 *
 * Le PDF est réellement envoyé à KartaAI (`MenuDemoService`, `POST
 * /api/public/menu-demo/extract`) — même pipeline d'extraction que l'onboarding réel
 * (Gemini, même prompt, même validation), sans compte ni restaurant : voir
 * `MenuDemoPublicController` côté backend. Rien n'est jamais enregistré côté serveur.
 *
 * La navigation vers `/karta-ai` n'a lieu qu'après une extraction réussie : un échec
 * garde le visiteur ici, sur la landing, avec un message clair et la possibilité de
 * réessayer — jamais de redirection vers un menu qui n'a pas pu être lu.
 */
@Component({
  selector: 'landing-menu-import-dropzone',
  standalone: true,
  templateUrl: './menu-import-dropzone.component.html',
})
export class MenuImportDropzoneComponent {
  private readonly drafts = inject(CreationDraftService);
  private readonly demoService = inject(MenuDemoService);
  private readonly router = inject(Router);

  readonly dragging = signal(false);
  readonly error = signal<string | null>(null);
  readonly file = signal<{ name: string; size: string; bytes: number } | null>(null);
  /** Appel à `/api/public/menu-demo/extract` en cours : empêche toute double soumission. */
  readonly submitting = signal(false);

  /** Le vrai fichier à envoyer : jamais sérialisé, jamais mis en `sessionStorage`. */
  private selectedFile: File | null = null;

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
    if (this.submitting()) {
      return;
    }
    this.file.set(null);
    this.error.set(null);
    this.selectedFile = null;
  }

  /**
   * Lance l'extraction réelle. Ne quitte la landing que sur un succès confirmé par le
   * backend : pendant l'appel et en cas d'échec, le visiteur reste sur cet écran.
   */
  start(): void {
    const file = this.selectedFile;
    if (!file || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.demoService.extract(file).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.drafts.startFromExtraction(file.name, file.size, response.categories);
        this.router.navigate(['/karta-ai']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(
          err?.error?.message ??
            "Impossible d'extraire ce menu. Réessayez ou choisissez un autre fichier.",
        );
      },
    });
  }

  private accept(file: File | null): void {
    if (!file || this.submitting()) {
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.error.set('Format accepté : PDF.');
      this.selectedFile = null;
      this.file.set(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('Le fichier dépasse la taille maximale de 10 Mo.');
      this.selectedFile = null;
      this.file.set(null);
      return;
    }
    this.error.set(null);
    this.selectedFile = file;
    this.file.set({ name: file.name, size: formatFileSize(file.size), bytes: file.size });
  }
}
