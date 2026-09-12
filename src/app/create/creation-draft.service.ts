import { Injectable, computed, signal } from '@angular/core';
import { EditableCategory } from '../menu/review/menu-draft.model';
import { LandingMenuPresetId } from '../landing/landing-menu-presets';
import {
  CreationDraft,
  CreationStage,
  countDraft,
  newCreationDraft,
  toPreviewMenu,
} from './creation-draft.model';

const STORAGE_KEY = 'karta_creation_draft';

/**
 * Le brouillon d'un visiteur qui construit sa carte avant d'avoir un compte.
 *
 * <strong>Il ne doit jamais être perdu.</strong> Le visiteur peut passer plusieurs
 * minutes à corriger des prix, choisir un style et une couleur : recharger la page,
 * revenir en arrière ou aller se connecter ne doit rien effacer. D'où `sessionStorage` —
 * l'onglet, pas la machine : c'est un travail en cours, pas une donnée à conserver
 * indéfiniment sur l'appareil de quelqu'un.
 *
 * <strong>Aucun appel réseau.</strong> Ce service ne parle à aucun backend : la
 * persistance définitive d'un brouillon côté serveur n'existe pas encore. Le point
 * d'entrée est prêt ({@link attachToAccount}) et documenté, mais il n'invente pas
 * d'API — un faux appel donnerait l'illusion que le travail est sauvegardé.
 */
@Injectable({ providedIn: 'root' })
export class CreationDraftService {
  private readonly state = signal<CreationDraft | null>(this.read());

  readonly draft = this.state.asReadonly();
  readonly exists = computed(() => this.state() !== null);
  readonly stage = computed<CreationStage | null>(() => this.state()?.stage ?? null);
  readonly counts = computed(() => {
    const draft = this.state();
    return draft ? countDraft(draft) : null;
  });
  readonly previewMenu = computed(() => {
    const draft = this.state();
    return draft ? toPreviewMenu(draft) : null;
  });

  /** Démarre un parcours. Remplace un brouillon précédent : un fichier, une carte. */
  start(fileName: string, fileSizeBytes: number): void {
    this.write(newCreationDraft(fileName, fileSizeBytes));
  }

  setStage(stage: CreationStage): void {
    this.patch((draft) => ({ ...draft, stage }));
  }

  setCategories(categories: EditableCategory[]): void {
    this.patch((draft) => ({ ...draft, categories }));
  }

  toggleItem(uid: string): void {
    this.patch((draft) => ({
      ...draft,
      excluded: draft.excluded.includes(uid)
        ? draft.excluded.filter((id) => id !== uid)
        : [...draft.excluded, uid],
    }));
  }

  setPreset(presetId: LandingMenuPresetId): void {
    this.patch((draft) => ({ ...draft, presetId }));
  }

  setBrandName(brandName: string): void {
    this.patch((draft) => ({ ...draft, brandName }));
  }

  setColors(primaryColor: string | null, secondaryColor: string | null): void {
    this.patch((draft) => ({ ...draft, primaryColor, secondaryColor }));
  }

  clear(): void {
    this.state.set(null);
    this.storage()?.removeItem(STORAGE_KEY);
  }

  /**
   * Rattacher ce brouillon au compte qui vient de se connecter.
   *
   * <strong>Pas encore branché.</strong> Le backend n'expose aucune route pour déposer
   * une carte préparée hors session (voir `MenuService` : tout passe par un restaurant
   * existant). Le jour où elle existera, c'est ici qu'elle s'appelle, et nulle part
   * ailleurs : le reste du parcours n'a pas à savoir comment le brouillon est envoyé.
   */
  attachToAccount(): CreationDraft | null {
    return this.state();
  }

  /* ------------------------------------------------------------ persistance */

  private patch(update: (draft: CreationDraft) => CreationDraft): void {
    const current = this.state();
    if (current) {
      this.write(update(current));
    }
  }

  private write(draft: CreationDraft): void {
    this.state.set(draft);
    try {
      this.storage()?.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Stockage refusé (navigation privée, quota) : le parcours continue en mémoire.
      // Perdre le brouillon au rechargement vaut mieux qu'une page qui ne s'ouvre pas.
    }
  }

  private read(): CreationDraft | null {
    try {
      const raw = this.storage()?.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as CreationDraft;
      // Un brouillon d'une version antérieure du format ne doit pas casser la page.
      return Array.isArray(parsed?.categories) && typeof parsed?.stage === 'string'
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  /** `null` au rendu serveur (prérendu) : il n'y a pas de session à lire. */
  private storage(): Storage | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  }
}
