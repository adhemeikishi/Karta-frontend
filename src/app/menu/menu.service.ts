import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Menu, SaveCategoryRequest } from './menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/restaurants`;

  getMenu(restaurantId: string): Observable<Menu> {
    return this.http.get<Menu>(`${this.baseUrl}/${restaurantId}/menu`);
  }

  /** Crée le menu du client. Le type découle de l'offre côté backend. */
  createMenu(restaurantId: string): Observable<Menu> {
    return this.http.post<Menu>(`${this.baseUrl}/${restaurantId}/menu`, {});
  }

  /**
   * Remplace l'intégralité de la structure (offres PRO / PREMIUM).
   * Document complet : ce qui n'est pas envoyé est supprimé côté serveur.
   */
  saveStructure(restaurantId: string, categories: SaveCategoryRequest[]): Observable<Menu> {
    return this.http.put<Menu>(`${this.baseUrl}/${restaurantId}/menu`, { categories });
  }

  /** Supprime le menu et tout son contenu. */
  deleteMenu(restaurantId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${restaurantId}/menu`);
  }

  uploadPdf(restaurantId: string, file: File): Observable<Menu> {
    const form = new FormData();
    form.append('file', file);
    // Ne pas fixer Content-Type : HttpClient gère la frontière multipart.
    return this.http.post<Menu>(`${this.baseUrl}/${restaurantId}/menu/pdf`, form);
  }

  deletePdf(restaurantId: string): Observable<Menu> {
    return this.http.delete<Menu>(`${this.baseUrl}/${restaurantId}/menu/pdf`);
  }

  publish(restaurantId: string): Observable<Menu> {
    return this.http.put<Menu>(`${this.baseUrl}/${restaurantId}/menu/publish`, {});
  }

  unpublish(restaurantId: string): Observable<Menu> {
    return this.http.put<Menu>(`${this.baseUrl}/${restaurantId}/menu/unpublish`, {});
  }
}
