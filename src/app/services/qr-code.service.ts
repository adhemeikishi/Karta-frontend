import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { QrCode, QrCodeStats } from '../models/qr-code.model';

@Injectable({ providedIn: 'root' })
export class QrCodeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin`;

  listByRestaurant(restaurantId: string): Observable<QrCode[]> {
    return this.http.get<QrCode[]>(`${this.baseUrl}/restaurants/${restaurantId}/qr-codes`);
  }

  getById(id: string): Observable<QrCode> {
    return this.http.get<QrCode>(`${this.baseUrl}/qr-codes/${id}`);
  }

  // Pas de create()/updateDestination() ici : le QR est unique et permanent, créé
  // automatiquement à la création du restaurant (règle produit) — jamais une action du
  // restaurateur. La destination n'est plus modifiable (voir QrCodeAdminController).

  activate(id: string): Observable<QrCode> {
    return this.http.post<QrCode>(`${this.baseUrl}/qr-codes/${id}/activate`, {});
  }

  deactivate(id: string): Observable<QrCode> {
    return this.http.post<QrCode>(`${this.baseUrl}/qr-codes/${id}/deactivate`, {});
  }

  getStats(id: string): Observable<QrCodeStats> {
    return this.http.get<QrCodeStats>(`${this.baseUrl}/qr-codes/${id}/stats`);
  }

  imagePngUrl(id: string): string {
    return `${this.baseUrl}/qr-codes/${id}/image.png`;
  }

  imageSvgUrl(id: string): string {
    return `${this.baseUrl}/qr-codes/${id}/image.svg`;
  }

  /**
   * Récupère l'image en blob via HttpClient (donc avec l'en-tête Basic Auth ajouté
   * par l'intercepteur). Un simple <img src> ou <a download> ne fonctionnerait pas :
   * les endpoints image sont sous /api/admin/** et exigent l'authentification.
   */
  imagePng(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/qr-codes/${id}/image.png`, { responseType: 'blob' });
  }

  imageSvg(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/qr-codes/${id}/image.svg`, { responseType: 'blob' });
  }
}
