import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Menu } from '../menu.model';
import { MenuService } from '../menu.service';
import {
  EditableCategory,
  EditableItem,
  editorKey,
  formatPriceInput,
  newCategory,
  newItem,
  parsePriceInput,
  reconcileWithSaved,
  toEditable,
  toSaveRequest,
} from './menu-editor.model';

/**
 * Éditeur du contenu du menu structuré : catégories, plats, prix, disponibilité, ordre.
 *
 * État local puis enregistrement explicite — aucune écriture avant « Enregistrer les
 * modifications ». Le style et la publication restent le rôle de
 * {@link MenuDesignStudioComponent}, à côté : cet éditeur ne modifie que la structure
 * (mêmes routes, même contrat `PUT .../menu` que la Review KartaIA et que le studio).
 *
 * Réorganisation par flèches ↑/↓ (pas de glisser-déposer) : c'est déjà le mécanisme
 * utilisé par la Review KartaIA pour les catégories, et aucune librairie de drag & drop
 * n'existe dans le projet.
 *
 * <strong>Lire d'abord, modifier ensuite.</strong> Une carte se lit — nom, description,
 * prix — et ne se modifie qu'un plat à la fois. Tout afficher en champs de saisie
 * transformait la page en formulaire de soixante lignes où plus rien ne ressortait.
 * Chaque plat est donc une ligne ; l'édition ouvre une surface à sa place, et
 * {@link cancelEdit} restaure réellement la valeur d'avant.
 */
@Component({
    selector: 'app-menu-editor',
    imports: [CommonModule, FormsModule],
    // Sans display explicite l'hôte reste `inline` : la barre d'enregistrement collante
    // n'aurait pas de bloc de référence, et les marges des sections seraient ignorées.
    styles: [':host{display:block}'],
    templateUrl: './menu-editor.component.html'
})
export class MenuEditorComponent {
  private readonly menuService = inject(MenuService);

  readonly restaurantId = input.required<string>();
  readonly menu = input.required<Menu>();

  /** Remonte le menu au parent après enregistrement : statut et version restent justes. */
  readonly menuChange = output<Menu>();

  readonly categories = signal<EditableCategory[]>([]);

  /** `uid` du plat ouvert en édition. Un seul à la fois : la carte reste lisible. */
  readonly editingUid = signal<string | null>(null);

  /**
   * Valeurs du plat au moment de l'ouverture.
   *
   * « Annuler » doit vraiment annuler : les champs sont liés à l'objet par `ngModel`,
   * donc la saisie l'a déjà modifié. Sans cette copie, le bouton mentirait.
   */
  private editSnapshot: Pick<EditableItem, 'name' | 'description' | 'priceEuros'> | null = null;
  private savedKey = signal('');
  private initialized = false;

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly justSaved = signal(false);

  readonly categoryCount = computed(() => this.categories().length);
  readonly itemCount = computed(() =>
    this.categories().reduce((total, c) => total + c.items.length, 0),
  );

  readonly dirty = computed(() => editorKey(this.categories()) !== this.savedKey());

  // ------------------------------------------------------------------ validation

  private allItems(): EditableItem[] {
    return this.categories().flatMap((c) => c.items);
  }

  get missingCategoryNameCount(): number {
    return this.categories().filter((c) => c.name.trim() === '').length;
  }

  get missingItemNameCount(): number {
    return this.allItems().filter((i) => i.name.trim() === '').length;
  }

  get invalidPriceCount(): number {
    return this.allItems().filter((i) => i.priceEuros === null || i.priceEuros < 0).length;
  }

  get blockers(): string[] {
    const blockers: string[] = [];
    if (this.missingCategoryNameCount > 0) {
      blockers.push(`${this.missingCategoryNameCount} catégorie(s) sans nom.`);
    }
    if (this.missingItemNameCount > 0) {
      blockers.push(`${this.missingItemNameCount} plat(s) sans nom.`);
    }
    if (this.invalidPriceCount > 0) {
      blockers.push(`${this.invalidPriceCount} plat(s) sans prix valide.`);
    }
    return blockers;
  }

  readonly canSave = computed(
    () => !this.saving() && this.dirty() && this.computeBlockersLength() === 0,
  );

  /** `blockers` est un getter (dépend de signaux) : ce wrapper le rend lisible à `computed`. */
  private computeBlockersLength(): number {
    return this.blockers.length;
  }

  // ------------------------------------------------------------------ chargement

  /**
   * Initialise l'état local depuis le menu du parent — une seule fois.
   *
   * `menu` reste un input requis : cet effet se redéclenche donc à chaque changement de
   * référence (ex. le studio publie/dépublie en dessous, sans toucher au contenu). Le
   * garde `initialized` fait que ces changements ultérieurs n'écrasent jamais une
   * édition en cours — seul le tout premier rendu matérialise l'état local.
   */
  constructor() {
    effect(() => {
      const menu = this.menu();
      if (this.initialized) {
        return;
      }
      this.initialized = true;
      const initial = toEditable(menu.structure?.categories ?? []);
      this.categories.set(initial);
      this.savedKey.set(editorKey(initial));
    });
  }

  // ------------------------------------------------------------------ catégories

  addCategory(): void {
    this.categories.update((list) => [...list, newCategory()]);
    this.justSaved.set(false);
  }

  moveCategory(index: number, direction: -1 | 1): void {
    const target = index + direction;
    const list = [...this.categories()];
    if (target < 0 || target >= list.length) {
      return;
    }
    [list[index], list[target]] = [list[target], list[index]];
    this.categories.set(list);
    this.justSaved.set(false);
  }

  // Confirmation de suppression de catégorie — seulement si elle contient des plats.
  readonly pendingDeleteCategory = signal<{ index: number; name: string; itemCount: number } | null>(
    null,
  );

  requestRemoveCategory(index: number): void {
    const category = this.categories()[index];
    if (!category) {
      return;
    }
    if (category.items.length === 0) {
      this.removeCategory(index);
      return;
    }
    this.pendingDeleteCategory.set({
      index,
      name: category.name.trim() || 'cette catégorie',
      itemCount: category.items.length,
    });
  }

  confirmRemoveCategory(): void {
    const pending = this.pendingDeleteCategory();
    if (pending) {
      this.removeCategory(pending.index);
    }
    this.pendingDeleteCategory.set(null);
  }

  cancelRemoveCategory(): void {
    this.pendingDeleteCategory.set(null);
  }

  private removeCategory(index: number): void {
    this.categories.update((list) => list.filter((_, i) => i !== index));
    this.justSaved.set(false);
  }

  // ------------------------------------------------------------------ édition d'un plat

  isEditing(item: EditableItem): boolean {
    return this.editingUid() === item.uid;
  }

  startEdit(item: EditableItem): void {
    this.editSnapshot = {
      name: item.name,
      description: item.description,
      priceEuros: item.priceEuros,
    };
    this.editingUid.set(item.uid);
  }

  /** Referme sans toucher aux valeurs : ce qui a été saisi est conservé. */
  closeEdit(): void {
    this.editSnapshot = null;
    this.editingUid.set(null);
  }

  /** Referme ET restaure les valeurs d'avant l'ouverture. */
  cancelEdit(item: EditableItem): void {
    if (this.editSnapshot) {
      item.name = this.editSnapshot.name;
      item.description = this.editSnapshot.description;
      item.priceEuros = this.editSnapshot.priceEuros;
      this.priceDisplay.set(item.uid, formatPriceInput(item.priceEuros));
    }
    this.closeEdit();
    this.onFieldChange();
  }

  // ------------------------------------------------------------------ plats

  /** Un plat ajouté n'a encore ni nom ni prix : il s'ouvre directement en édition. */
  addItem(categoryIndex: number): void {
    const item = newItem();
    this.categories.update((list) =>
      list.map((c, i) => (i === categoryIndex ? { ...c, items: [...c.items, item] } : c)),
    );
    this.justSaved.set(false);
    this.startEdit(item);
  }

  moveItem(categoryIndex: number, itemIndex: number, direction: -1 | 1): void {
    const category = this.categories()[categoryIndex];
    if (!category) {
      return;
    }
    const target = itemIndex + direction;
    if (target < 0 || target >= category.items.length) {
      return;
    }
    const items = [...category.items];
    [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
    this.categories.update((list) =>
      list.map((c, i) => (i === categoryIndex ? { ...c, items } : c)),
    );
    this.justSaved.set(false);
  }

  toggleAvailable(categoryIndex: number, itemIndex: number): void {
    this.categories.update((list) =>
      list.map((c, ci) =>
        ci === categoryIndex
          ? {
              ...c,
              items: c.items.map((it, ii) =>
                ii === itemIndex ? { ...it, available: !it.available } : it,
              ),
            }
          : c,
      ),
    );
    this.justSaved.set(false);
  }

  // Confirmation de suppression de plat — systématique.
  readonly pendingDeleteItem = signal<{ categoryIndex: number; itemIndex: number; name: string } | null>(
    null,
  );

  requestRemoveItem(categoryIndex: number, itemIndex: number): void {
    const item = this.categories()[categoryIndex]?.items[itemIndex];
    if (!item) {
      return;
    }
    this.pendingDeleteItem.set({
      categoryIndex,
      itemIndex,
      name: item.name.trim() || 'ce plat',
    });
  }

  confirmRemoveItem(): void {
    const pending = this.pendingDeleteItem();
    if (pending) {
      // Le plat supprimé peut être celui ouvert en édition : la surface doit se fermer.
      this.closeEdit();
      this.categories.update((list) =>
        list.map((c, ci) =>
          ci === pending.categoryIndex
            ? { ...c, items: c.items.filter((_, ii) => ii !== pending.itemIndex) }
            : c,
        ),
      );
      this.justSaved.set(false);
    }
    this.pendingDeleteItem.set(null);
  }

  cancelRemoveItem(): void {
    this.pendingDeleteItem.set(null);
  }

  // ------------------------------------------------------------------ prix (affichage)

  /**
   * Même tampon d'affichage que la Review : la valeur tapée n'est reformatée qu'à la
   * perte de focus, jamais pendant la frappe (sinon le curseur saute).
   */
  private readonly priceDisplay = new Map<string, string>();

  priceInputValue(item: EditableItem): string {
    if (!this.priceDisplay.has(item.uid)) {
      this.priceDisplay.set(item.uid, formatPriceInput(item.priceEuros));
    }
    return this.priceDisplay.get(item.uid)!;
  }

  onPriceInput(item: EditableItem, raw: string): void {
    this.priceDisplay.set(item.uid, raw);
    item.priceEuros = parsePriceInput(raw);
    this.categories.set([...this.categories()]);
    this.justSaved.set(false);
  }

  onPriceBlur(item: EditableItem): void {
    this.priceDisplay.set(item.uid, formatPriceInput(item.priceEuros));
  }

  /**
   * Prix tel qu'il se lit sur la ligne : « 12,90 € », ou un tiret cadratin quand il
   * manque. Afficher « 0,00 € » laisserait croire à un plat gratuit.
   */
  displayPrice(item: EditableItem): string {
    if (item.priceEuros === null || item.priceEuros < 0) {
      return '—';
    }
    return `${formatPriceInput(item.priceEuros)} €`;
  }

  onFieldChange(): void {
    // `[(ngModel)]` mute l'objet en place (name/description) ; on republie le signal
    // pour que `dirty`/`canSave` se recalculent, et on republie le tableau pour que
    // les `@for` de plats voisins ne soient pas recréés inutilement.
    this.categories.set([...this.categories()]);
    this.justSaved.set(false);
  }

  // ------------------------------------------------------------------ enregistrement

  save(): void {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.justSaved.set(false);

    const payload = toSaveRequest(this.categories());
    this.menuService.saveStructure(this.restaurantId(), payload.categories).subscribe({
      next: (menu) => {
        const reconciled = reconcileWithSaved(this.categories(), menu.structure?.categories ?? []);
        this.categories.set(reconciled);
        this.savedKey.set(editorKey(reconciled));
        this.saving.set(false);
        this.justSaved.set(true);
        this.menuChange.emit(menu);
      },
      error: (err) => {
        this.saving.set(false);
        // Les modifications locales restent affichées : rien n'est perdu.
        this.saveError.set(err?.error?.message ?? "Impossible d'enregistrer le menu.");
      },
    });
  }
}
