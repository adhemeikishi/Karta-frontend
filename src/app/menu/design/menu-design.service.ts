import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DesignDraft, MenuDesign, UploadedImage, toSaveRequest } from './menu-design.model';

@Injectable({ providedIn: 'root' })
export class MenuDesignService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/restaurants`;

  getDesign(restaurantId: string): Observable<MenuDesign> {
    return this.http.get<MenuDesign>(`${this.baseUrl}/${restaurantId}/menu/design`);
  }

  /** Enregistre l'apparence. Ne publie rien : « Publier » reste une action distincte. */
  saveDesign(restaurantId: string, draft: DesignDraft): Observable<MenuDesign> {
    return this.http.put<MenuDesign>(
      `${this.baseUrl}/${restaurantId}/menu/design`,
      toSaveRequest(draft),
    );
  }

  /**
   * HTML d'aperçu du menu tel qu'il serait rendu avec ce brouillon.
   *
   * Le rendu vient du renderer backend — le même que la page publique — jamais d'un
   * faux menu reconstruit ici : deux rendus finiraient par diverger.
   *
   * Passe par HttpClient (donc par l'intercepteur d'authentification) plutôt que par un
   * `src` direct : sans en-tête Authorization, le navigateur afficherait une invite
   * Basic Auth dans l'iframe.
   */
  previewHtml(restaurantId: string, draft: DesignDraft): Observable<string> {
    let params = new HttpParams().set('preset', draft.preset);
    if (draft.brandName) {
      params = params.set('brandName', draft.brandName);
    }
    if (draft.primaryColor) {
      params = params.set('primaryColor', draft.primaryColor);
    }
    if (draft.secondaryColor) {
      params = params.set('secondaryColor', draft.secondaryColor);
    }
    if (draft.logoAssetId) {
      params = params.set('logoAssetId', draft.logoAssetId);
    }
    if (draft.heroAssetId) {
      params = params.set('heroAssetId', draft.heroAssetId);
    }

    return this.http.get(`${this.baseUrl}/${restaurantId}/menu/preview`, {
      params,
      responseType: 'text',
    });
  }

  /** Upload d'une image du client (logo, bannière). Le format est vérifié côté serveur. */
  uploadImage(restaurantId: string, file: File): Observable<UploadedImage> {
    const form = new FormData();
    form.append('file', file);
    // Ne pas fixer Content-Type : HttpClient gère la frontière multipart.
    return this.http.post<UploadedImage>(`${this.baseUrl}/${restaurantId}/images`, form);
  }
}
