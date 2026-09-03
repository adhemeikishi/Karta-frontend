import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Menu } from '../menu.model';
import { EditableCategory, MenuDraft, toSaveRequest } from './menu-draft.model';

/**
 * API KartaAI.
 *
 * Trois routes seulement : produire un brouillon, le relire, l'abandonner. La validation
 * n'a volontairement pas d'endpoint dédié — elle passe par le `PUT .../menu` existant,
 * déjà validé côté serveur. Le brouillon est consommé par le backend une fois le menu
 * réellement écrit.
 */
@Injectable({ providedIn: 'root' })
export class MenuDraftService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/restaurants`;

  /** Analyse la carte PDF déjà importée. N'écrit rien dans le menu. */
  importFromPdf(restaurantId: string): Observable<MenuDraft> {
    return this.http.post<MenuDraft>(`${this.baseUrl}/${restaurantId}/menu/ai/import`, {});
  }

  /** Brouillon en attente, pour reprendre une Review interrompue. 404 s'il n'y en a pas. */
  getDraft(restaurantId: string): Observable<MenuDraft> {
    return this.http.get<MenuDraft>(`${this.baseUrl}/${restaurantId}/menu/ai/draft`);
  }

  discard(restaurantId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${restaurantId}/menu/ai/draft`);
  }

  /**
   * Valide la Review : écrit le menu par le chemin existant.
   * Ne publie rien — la publication reste une action séparée depuis le studio.
   */
  applyReview(restaurantId: string, categories: EditableCategory[]): Observable<Menu> {
    return this.http.put<Menu>(`${this.baseUrl}/${restaurantId}/menu`, toSaveRequest(categories));
  }
}
