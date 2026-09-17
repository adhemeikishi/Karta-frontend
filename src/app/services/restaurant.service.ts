import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  KartaPayDashboardStats,
  Restaurant,
  RestaurantOffer,
  RestaurantScanStats,
  RestaurantSummary,
} from '../models/restaurant.model';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/restaurants`;

  list(): Observable<RestaurantSummary[]> {
    return this.http.get<RestaurantSummary[]>(this.baseUrl);
  }

  getById(id: string): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/${id}`);
  }

  create(name: string, offer: RestaurantOffer): Observable<Restaurant> {
    return this.http.post<Restaurant>(this.baseUrl, { name, offer });
  }

  rename(id: string, name: string): Observable<Restaurant> {
    return this.http.put<Restaurant>(`${this.baseUrl}/${id}`, { name });
  }

  changeOffer(id: string, offer: RestaurantOffer): Observable<Restaurant> {
    return this.http.put<Restaurant>(`${this.baseUrl}/${id}/offer`, { offer });
  }

  /** Interrupteur commercial Karta Pay — action de Karta, pas du restaurateur. */
  toggleKartaPay(id: string, enabled: boolean): Observable<Restaurant> {
    return this.http.put<Restaurant>(`${this.baseUrl}/${id}/karta-pay`, { enabled });
  }

  /**
   * Statistiques de scans du client : 4 compteurs + série quotidienne sur 30 jours.
   * Strictement filtrées par client côté backend.
   */
  stats(id: string): Observable<RestaurantScanStats> {
    return this.http.get<RestaurantScanStats>(`${this.baseUrl}/${id}/stats`);
  }

  /**
   * Tableau de bord Karta Pay du client : scans, CA, plats les plus vendus, répartition du
   * CA, panier moyen et heures de pointe. Strictement filtré par client côté backend.
   */
  kartaPayDashboard(id: string): Observable<KartaPayDashboardStats> {
    return this.http.get<KartaPayDashboardStats>(`${this.baseUrl}/${id}/karta-pay/dashboard`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
