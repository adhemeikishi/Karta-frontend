import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import {
  EditableItem,
  formatPriceInput,
  parsePriceInput,
} from '../menu/review/menu-draft.model';
import { SeoService } from '../shared/seo.service';
import { CreationDraftService } from './creation-draft.service';
import { isIncluded } from './creation-draft.model';

/**
 * `/create/review` — le restaurateur vérifie ce que Karta a compris.
 *
 * Même geste que la Review réelle du produit (`MenuReviewComponent`) et même
 * vocabulaire visuel que l'éditeur de carte (`.mx-*`) : une ligne par plat, qui
 * s'ouvre sur place quand on la touche. Ce n'est pas un back-office — pas de
 * réordonnancement, pas de suppression de catégorie, pas d'enregistrement serveur :
 * on relit, on corrige, on décoche ce qui n'a rien à faire là.
 *
 * Les deux plats dont le prix n'a pas pu être lu sont signalés : c'est précisément ce
 * qu'une lecture de PDF laisse derrière elle, et la raison d'être de cet écran.
 */
@Component({
  selector: 'create-review',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './review.component.html',
})
export class ReviewComponent {
  private readonly router = inject(Router);
  readonly drafts = inject(CreationDraftService);

  readonly categories = computed(() => this.drafts.draft()?.categories ?? []);
  readonly counts = this.drafts.counts;

  /** Plat en cours d'édition — un seul à la fois, comme dans l'éditeur réel. */
  readonly editing = signal<string | null>(null);

  /** Prix non lus restants : le seul reproche que l'écran ait à faire. */
  readonly missingPrices = computed(() =>
    this.categories()
      .flatMap((category) => category.items)
      .filter((item) => this.included(item) && item.priceEuros === null).length,
  );

  constructor() {
    inject(SeoService).apply({
      title: 'Vérifiez votre carte',
      description: 'Relisez votre carte avant de choisir son style.',
      path: '/create/review',
    });
  }

  included(item: EditableItem): boolean {
    const draft = this.drafts.draft();
    return draft ? isIncluded(draft, item) : true;
  }

  toggle(item: EditableItem): void {
    this.drafts.toggleItem(item.uid);
    if (this.editing() === item.uid) {
      this.editing.set(null);
    }
  }

  startEdit(item: EditableItem): void {
    this.editing.set(item.uid);
  }

  closeEdit(): void {
    this.editing.set(null);
    this.commit();
  }

  isEditing(item: EditableItem): boolean {
    return this.editing() === item.uid;
  }

  displayPrice(item: EditableItem): string {
    return item.priceEuros === null ? 'Prix à compléter' : `${formatPriceInput(item.priceEuros)} €`;
  }

  priceInputValue(item: EditableItem): string {
    return formatPriceInput(item.priceEuros);
  }

  onPriceInput(item: EditableItem, raw: string): void {
    item.priceEuros = parsePriceInput(raw);
    // Un prix relu n'est plus un doute d'extraction.
    if (item.priceEuros !== null) {
      item.needsReview = false;
      item.note = null;
    }
  }

  /** Le brouillon est réécrit à chaque respiration, jamais à chaque frappe. */
  commit(): void {
    this.drafts.setCategories(this.categories());
  }

  validate(): void {
    this.commit();
    this.drafts.setStage('design');
    this.router.navigate(['/create/design']);
  }
}
