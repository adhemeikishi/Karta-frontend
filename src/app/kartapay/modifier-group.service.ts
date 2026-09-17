import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ModifierGroup, SaveModifierGroupRequest } from './modifier.model';

/**
 * Groupes d'options d'un produit : `/api/admin/restaurants/{id}/menu/items/{itemId}/modifier-groups`.
 * Document complet par produit : `save` remplace tous les groupes (et leurs options) en un appel.
 */
@Injectable({ providedIn: 'root' })
export class ModifierGroupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/restaurants`;

  listByItem(restaurantId: string, itemId: string): Observable<ModifierGroup[]> {
    return this.http.get<ModifierGroup[]>(
      `${this.baseUrl}/${restaurantId}/menu/items/${itemId}/modifier-groups`,
    );
  }

  save(restaurantId: string, itemId: string, groups: SaveModifierGroupRequest[]): Observable<ModifierGroup[]> {
    return this.http.put<ModifierGroup[]>(
      `${this.baseUrl}/${restaurantId}/menu/items/${itemId}/modifier-groups`,
      { groups },
    );
  }
}
