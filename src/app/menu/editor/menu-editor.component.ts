import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MENU_LANGUAGES, can } from '../../restaurateur/plan';
import { PremiumLockComponent } from '../../shared/premium-lock.component';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../design/menu-design.model';
import { MenuDesignService } from '../design/menu-design.service';
import { Menu, Translation } from '../menu.model';
import { MenuService } from '../menu.service';
import { ModifierGroupService } from '../../kartapay/modifier-group.service';
import {
  EditableModifierGroup,
  SelectionType,
  applySelectionType,
  newModifierGroup,
  newModifierOption,
  toEditableGroups,
  toSaveModifierGroupsRequest,
} from '../../kartapay/modifier.model';
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
  translationFor,
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
 *
 * <strong>Premium.</strong> Photos et traductions passent par ce même éditeur, jamais par
 * un second. Une « langue d'édition » bascule les champs nom / description sur la
 * traduction correspondante — mêmes lignes, mêmes surfaces, le français en repère. Hors
 * Premium, les deux sont annoncés verrouillés, pas cachés.
 */
@Component({
    selector: 'app-menu-editor',
    imports: [CommonModule, FormsModule, PremiumLockComponent],
    // Sans display explicite l'hôte reste `inline` : la barre d'enregistrement collante
    // n'aurait pas de bloc de référence, et les marges des sections seraient ignorées.
    styles: [':host{display:block}'],
    templateUrl: './menu-editor.component.html'
})
export class MenuEditorComponent {
  private readonly menuService = inject(MenuService);
  private readonly designService = inject(MenuDesignService);
  private readonly modifierGroupService = inject(ModifierGroupService);

  readonly restaurantId = input.required<string>();
  readonly menu = input.required<Menu>();

  /** Espace hôte — ne change que le vocabulaire des verrous Premium (voir le studio). */
  readonly space = input<'admin' | 'restaurateur'>('admin');

  /** Remonte le menu au parent après enregistrement : statut et version restent justes. */
  readonly menuChange = output<Menu>();

  /** Langue d'édition courante (`fr` = texte de base) : le parent peut y caler son aperçu. */
  readonly languageChange = output<string>();

  readonly categories = signal<EditableCategory[]>([]);

  // ------------------------------------------------------------------ Premium

  readonly canPhotos = computed(() => can(this.menu().offer, 'itemPhotos'));
  readonly canTranslate = computed(() => can(this.menu().offer, 'translations'));

  readonly allLanguages = MENU_LANGUAGES;

  /** Langues proposées aux clients, en plus du français. Enregistrées avec la carte. */
  readonly languages = signal<string[]>([]);

  /** `fr` = les champs éditent le texte de base ; sinon la traduction de cette langue. */
  readonly editLang = signal('fr');
  readonly translating = computed(() => this.editLang() !== 'fr');

  readonly editLangLabel = computed(
    () => this.allLanguages.find((l) => l.code === this.editLang())?.label ?? 'Français',
  );

  isLanguageOn(code: string): boolean {
    return this.languages().includes(code);
  }

  toggleLanguage(code: string): void {
    const on = this.isLanguageOn(code);
    this.languages.update((list) => (on ? list.filter((c) => c !== code) : [...list, code]));
    if (on && this.editLang() === code) {
      this.editLang.set('fr');
      this.languageChange.emit('fr');
    }
    this.justSaved.set(false);
  }

  setEditLang(code: string): void {
    this.closeEdit();
    this.editLang.set(code);
    this.languageChange.emit(code);
  }

  /** Traduction éditée pour la langue courante — créée à la demande. */
  tr(target: EditableItem | EditableCategory): Translation {
    return translationFor(target, this.editLang());
  }

  setTranslated(target: EditableItem | EditableCategory, field: 'name' | 'description', value: string): void {
    this.tr(target)[field] = value;
    this.onFieldChange();
  }

  /** Nom tel qu'il se lit sur la ligne : la traduction si elle existe, sinon le français. */
  displayName(target: EditableItem | EditableCategory): string {
    if (!this.translating()) {
      return target.name;
    }
    return target.translations[this.editLang()]?.name?.trim() || target.name;
  }

  displayDescription(item: EditableItem): string {
    if (!this.translating()) {
      return item.description;
    }
    return item.translations[this.editLang()]?.description?.trim() || item.description;
  }

  isUntranslated(target: EditableItem | EditableCategory): boolean {
    return this.translating() && !target.translations[this.editLang()]?.name?.trim();
  }

  // ------------------------------------------------------------------ photos

  readonly uploadingUid = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);

  onPhotoSelected(event: Event, item: EditableItem): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0] ?? null;
    el.value = ''; // permet de re-sélectionner le même fichier
    if (!file) {
      return;
    }
    this.uploadError.set(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.uploadError.set('Formats acceptés : JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.uploadError.set("L'image dépasse la taille maximale de 5 Mo.");
      return;
    }
    this.uploadingUid.set(item.uid);
    // Même route que le logo et l'image d'en-tête : un média du restaurant, validé côté serveur.
    this.designService.uploadImage(this.restaurantId(), file).subscribe({
      next: (image) => {
        this.uploadingUid.set(null);
        item.imageAssetId = image.assetId;
        item.imageUrl = image.url;
        this.onFieldChange();
      },
      error: (err) => {
        this.uploadingUid.set(null);
        this.uploadError.set(err?.error?.message ?? "L'image n'a pas pu être envoyée.");
      },
    });
  }

  clearPhoto(item: EditableItem): void {
    item.imageAssetId = null;
    item.imageUrl = null;
    this.onFieldChange();
  }

  /** `uid` du plat ouvert en édition. Un seul à la fois : la carte reste lisible. */
  readonly editingUid = signal<string | null>(null);

  /**
   * Valeurs du plat au moment de l'ouverture.
   *
   * « Annuler » doit vraiment annuler : les champs sont liés à l'objet par `ngModel`,
   * donc la saisie l'a déjà modifié. Sans cette copie, le bouton mentirait.
   */
  private editSnapshot:
    | (Pick<EditableItem, 'name' | 'description' | 'priceEuros' | 'imageAssetId' | 'imageUrl'> & {
        translation: Translation;
      })
    | null = null;
  private savedKey = signal('');
  private initialized = false;

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly justSaved = signal(false);

  readonly categoryCount = computed(() => this.categories().length);
  readonly itemCount = computed(() =>
    this.categories().reduce((total, c) => total + c.items.length, 0),
  );

  readonly dirty = computed(
    () => editorKey(this.categories(), this.savedLanguages()) !== this.savedKey(),
  );

  /** Langues telles qu'elles seront envoyées : seulement si l'offre les ouvre. */
  private savedLanguages(): string[] | undefined {
    return this.canTranslate() ? this.languages() : undefined;
  }

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
      this.languages.set([...(menu.structure?.languages ?? [])]);
      this.savedKey.set(editorKey(initial, this.savedLanguages()));
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
      imageAssetId: item.imageAssetId,
      imageUrl: item.imageUrl,
      translation: { ...this.tr(item) },
    };
    this.editingUid.set(item.uid);
  }

  /** Referme sans toucher aux valeurs : ce qui a été saisi est conservé. */
  closeEdit(): void {
    this.editSnapshot = null;
    this.editingUid.set(null);
    this.resetModifiersState();
  }

  /** Referme ET restaure les valeurs d'avant l'ouverture. */
  cancelEdit(item: EditableItem): void {
    if (this.editSnapshot) {
      item.name = this.editSnapshot.name;
      item.description = this.editSnapshot.description;
      item.priceEuros = this.editSnapshot.priceEuros;
      item.imageAssetId = this.editSnapshot.imageAssetId;
      item.imageUrl = this.editSnapshot.imageUrl;
      item.translations[this.editLang()] = this.editSnapshot.translation;
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

  // ------------------------------------------------------------------ personnalisation (Karta Pay)

  /**
   * Groupes d'options du plat actuellement ouvert en édition. Un seul plat édité à la
   * fois (voir `editingUid`) : pas besoin de garder un état par plat, `closeEdit` remet
   * tout à zéro.
   *
   * Ne s'applique qu'à un plat déjà enregistré (`item.id` non null) : le endpoint
   * modifier-groups est adressé par identifiant de produit, qui n'existe pas encore
   * pour un plat qui n'a jamais été sauvegardé.
   */
  readonly modifiersOpen = signal(false);
  readonly modifierGroups = signal<EditableModifierGroup[]>([]);
  readonly modifiersLoading = signal(false);
  readonly modifiersError = signal<string | null>(null);
  readonly modifiersSaving = signal(false);
  readonly modifiersSaveError = signal<string | null>(null);
  readonly modifiersSaved = signal(false);
  private modifiersLoadedItemId: string | null = null;

  toggleModifiers(item: EditableItem): void {
    if (!item.id) {
      return;
    }
    const opening = !this.modifiersOpen();
    this.modifiersOpen.set(opening);
    if (opening && this.modifiersLoadedItemId !== item.id) {
      this.loadModifiers(item.id);
    }
  }

  private loadModifiers(itemId: string): void {
    this.modifiersLoading.set(true);
    this.modifiersError.set(null);
    this.modifierGroupService.listByItem(this.restaurantId(), itemId).subscribe({
      next: (groups) => {
        this.modifierGroups.set(toEditableGroups(groups));
        this.modifiersLoadedItemId = itemId;
        this.modifiersLoading.set(false);
      },
      error: () => {
        this.modifiersError.set('Impossible de charger les options.');
        this.modifiersLoading.set(false);
      },
    });
  }

  private resetModifiersState(): void {
    this.modifiersOpen.set(false);
    this.modifierGroups.set([]);
    this.modifiersError.set(null);
    this.modifiersSaveError.set(null);
    this.modifiersSaved.set(false);
    this.modifiersLoadedItemId = null;
  }

  addModifierGroup(): void {
    this.modifierGroups.update((list) => [...list, newModifierGroup()]);
    this.modifiersSaved.set(false);
  }

  removeModifierGroup(groupUid: string): void {
    this.modifierGroups.update((list) => list.filter((g) => g.uid !== groupUid));
    this.modifiersSaved.set(false);
  }

  setGroupSelectionType(group: EditableModifierGroup, type: SelectionType): void {
    applySelectionType(group, type);
    this.onModifiersChange();
  }

  addModifierOption(group: EditableModifierGroup): void {
    group.options.push(newModifierOption());
    this.onModifiersChange();
  }

  removeModifierOption(group: EditableModifierGroup, optionUid: string): void {
    group.options = group.options.filter((o) => o.uid !== optionUid);
    this.onModifiersChange();
  }

  /** `[(ngModel)]` mute les groupes/options en place : republie le signal pour l'affichage. */
  onModifiersChange(): void {
    this.modifierGroups.set([...this.modifierGroups()]);
    this.modifiersSaved.set(false);
  }

  saveModifiers(item: EditableItem): void {
    if (!item.id || this.modifiersSaving()) {
      return;
    }
    this.modifiersSaving.set(true);
    this.modifiersSaveError.set(null);
    this.modifiersSaved.set(false);
    const payload = toSaveModifierGroupsRequest(this.modifierGroups());
    this.modifierGroupService.save(this.restaurantId(), item.id, payload.groups).subscribe({
      next: (groups) => {
        this.modifierGroups.set(toEditableGroups(groups));
        this.modifiersSaving.set(false);
        this.modifiersSaved.set(true);
      },
      error: (err) => {
        this.modifiersSaving.set(false);
        this.modifiersSaveError.set(err?.error?.message ?? "Impossible d'enregistrer les options.");
      },
    });
  }

  // ------------------------------------------------------------------ enregistrement

  save(): void {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.justSaved.set(false);

    const payload = toSaveRequest(this.categories(), this.savedLanguages());
    this.menuService.saveStructure(this.restaurantId(), payload.categories, payload.languages).subscribe({
      next: (menu) => {
        const reconciled = reconcileWithSaved(this.categories(), menu.structure?.categories ?? []);
        this.categories.set(reconciled);
        this.savedKey.set(editorKey(reconciled, this.savedLanguages()));
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
