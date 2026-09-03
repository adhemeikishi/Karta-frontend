import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Restaurant } from '../../models/restaurant.model';
import { RestaurantService } from '../../services/restaurant.service';
import { ShellService } from '../../layout/shell.service';
import {
  EditableCategory,
  EditableItem,
  MenuDraft,
  formatPriceInput,
  newCategory,
  newItem,
  parsePriceInput,
  toEditable,
} from './menu-draft.model';
import { MenuDraftService } from './menu-draft.service';

/**
 * Écran de Review : « voici ce que KartaAI a compris de votre menu, vérifiez avant de
 * publier ».
 *
 * Écran plein, pas une modale : relire une carte entière est un travail qu'on interrompt
 * et qu'on reprend. Le brouillon vit en base, donc un rechargement ne perd rien.
 *
 * Rien n'est écrit dans le menu tant que « Valider le menu » n'a pas été cliqué, et
 * valider ne publie pas : le menu passe en « prêt à publier », la mise en ligne reste
 * une action distincte depuis le studio.
 */
@Component({
  selector: 'app-menu-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './menu-review.component.html',
})
export class MenuReviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly draftService = inject(MenuDraftService);
  private readonly restaurantService = inject(RestaurantService);
  private readonly shell = inject(ShellService);

  readonly restaurantId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly restaurant = signal<Restaurant | null>(null);
  readonly draft = signal<MenuDraft | null>(null);
  readonly categories = signal<EditableCategory[]>([]);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly discarding = signal(false);
  readonly confirmingDiscard = signal(false);

  /**
   * Ce que chaque champ de prix affiche, indexé par `item.uid`.
   *
   * Décorrélé de `item.priceEuros` (le nombre, source de vérité pour la sauvegarde) :
   * un champ `type="number"` ne peut pas afficher « 8,90 », il retombe toujours à
   * « 8.9 ». Un texte formaté à deux décimales le peut, mais seulement s'il n'est
   * jamais réécrit pendant la frappe — sinon Angular replace le contenu du champ à
   * chaque caractère et le curseur saute. Ce tampon n'est donc mis à jour qu'à
   * l'initialisation du champ et à sa perte de focus (`blur`), jamais pendant la
   * frappe (voir `onPriceInput`).
   */
  private readonly priceDisplay = new Map<string, string>();

  /** Recalculé à chaque cycle : le volume d'une carte rend le coût négligeable. */
  get itemCount(): number {
    return this.categories().reduce((total, c) => total + c.items.length, 0);
  }

  get missingPriceCount(): number {
    return this.allItems().filter((i) => i.priceEuros === null || i.priceEuros < 0).length;
  }

  get missingNameCount(): number {
    return this.allItems().filter((i) => i.name.trim() === '').length;
  }

  get missingCategoryNameCount(): number {
    return this.categories().filter((c) => c.name.trim() === '').length;
  }

  get flaggedCount(): number {
    return this.allItems().filter((i) => i.needsReview).length;
  }

  /**
   * Bloque la validation tant qu'une donnée indispensable manque.
   *
   * Le backend refuserait de toute façon, mais l'expliquer ici évite un aller-retour
   * qui rendrait un message d'erreur générique sur une carte de 60 lignes.
   */
  get blockers(): string[] {
    const blockers: string[] = [];
    if (this.categories().length === 0) {
      blockers.push('Ajoutez au moins une catégorie.');
    }
    if (this.itemCount === 0) {
      blockers.push('Ajoutez au moins un plat.');
    }
    if (this.missingCategoryNameCount > 0) {
      blockers.push(`${this.missingCategoryNameCount} catégorie(s) sans nom.`);
    }
    if (this.missingNameCount > 0) {
      blockers.push(`${this.missingNameCount} plat(s) sans nom.`);
    }
    if (this.missingPriceCount > 0) {
      blockers.push(`${this.missingPriceCount} plat(s) sans prix.`);
    }
    return blockers;
  }

  get canSave(): boolean {
    return this.blockers.length === 0 && !this.saving();
  }

  readonly detailLink = computed(() => ['/admin/restaurants', this.restaurantId]);

  ngOnInit(): void {
    this.shell.setBreadcrumbs([
      { label: 'Clients', link: '/admin/restaurants' },
      { label: 'Vérification du menu' },
    ]);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => this.restaurant.set(null),
    });

    this.draftService.getDraft(this.restaurantId).subscribe({
      next: (draft) => {
        this.draft.set(draft);
        this.categories.set(toEditable(draft));
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          err?.status === 404
            ? "Aucune analyse en attente. Lancez KartaAI depuis la fiche du client."
            : "Le brouillon n'a pas pu être chargé.",
        );
        this.loading.set(false);
      },
    });
  }

  // ------------------------------------------------------------------ édition

  addCategory(): void {
    this.categories.set([...this.categories(), newCategory()]);
  }

  removeCategory(index: number): void {
    this.categories.set(this.categories().filter((_, i) => i !== index));
  }

  moveCategory(index: number, direction: -1 | 1): void {
    const target = index + direction;
    const list = [...this.categories()];
    if (target < 0 || target >= list.length) {
      return;
    }
    [list[index], list[target]] = [list[target], list[index]];
    this.categories.set(list);
  }

  addItem(category: EditableCategory): void {
    category.items = [...category.items, newItem()];
    this.categories.set([...this.categories()]);
  }

  removeItem(category: EditableCategory, index: number): void {
    this.priceDisplay.delete(category.items[index].uid);
    category.items = category.items.filter((_, i) => i !== index);
    this.categories.set([...this.categories()]);
  }

  /** Lever le doute est une action explicite : le signalement ne disparaît pas tout seul. */
  acknowledge(item: EditableItem): void {
    item.needsReview = false;
    item.note = null;
    this.categories.set([...this.categories()]);
  }

  // ------------------------------------------------------------------ prix

  /** Valeur affichée dans le champ. Formatée une fois, puis laissée telle quelle. */
  priceInputValue(item: EditableItem): string {
    if (!this.priceDisplay.has(item.uid)) {
      this.priceDisplay.set(item.uid, formatPriceInput(item.priceEuros));
    }
    return this.priceDisplay.get(item.uid)!;
  }

  /**
   * Pendant la frappe : on garde exactement ce que l'utilisateur tape (aucun
   * reformatage), et on met à jour `priceEuros` en parallèle pour que les blocages
   * de validation réagissent en direct.
   */
  onPriceInput(item: EditableItem, raw: string): void {
    this.priceDisplay.set(item.uid, raw);
    item.priceEuros = parsePriceInput(raw);
  }

  /** À la sortie du champ : normalise l'affichage à deux décimales (« 8,9 » → « 8,90 »). */
  onPriceBlur(item: EditableItem): void {
    this.priceDisplay.set(item.uid, formatPriceInput(item.priceEuros));
  }

  // ------------------------------------------------------------------ validation

  save(): void {
    if (!this.canSave) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);

    this.draftService.applyReview(this.restaurantId, this.categories()).subscribe({
      next: () => {
        // Le brouillon est consommé côté serveur, dans la même transaction que
        // l'écriture du menu : rien à nettoyer ici.
        this.saving.set(false);
        this.router.navigate(this.detailLink());
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message ?? "Le menu n'a pas pu être enregistré.");
      },
    });
  }

  discard(): void {
    this.discarding.set(true);
    this.draftService.discard(this.restaurantId).subscribe({
      next: () => this.router.navigate(this.detailLink()),
      error: () => {
        this.discarding.set(false);
        this.confirmingDiscard.set(false);
        this.saveError.set("L'analyse n'a pas pu être supprimée.");
      },
    });
  }

  private allItems(): EditableItem[] {
    return this.categories().flatMap((c) => c.items);
  }
}
