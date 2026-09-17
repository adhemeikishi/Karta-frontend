import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrderDetail, OrderStatus, OrderSummary } from './order.model';

/** Commandes Karta Pay d'un client : `/api/admin/restaurants/{id}/orders`. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/restaurants`;

  /** Par défaut, seules les commandes du jour courant : {@code all = true} pour l'historique complet. */
  listByRestaurant(restaurantId: string, statusFilter?: OrderStatus, all?: boolean): Observable<OrderSummary[]> {
    let params = new HttpParams();
    if (statusFilter) {
      params = params.set('status', statusFilter);
    }
    if (all) {
      params = params.set('all', 'true');
    }
    return this.http.get<OrderSummary[]>(`${this.baseUrl}/${restaurantId}/orders`, { params });
  }

  getById(restaurantId: string, orderId: string): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.baseUrl}/${restaurantId}/orders/${orderId}`);
  }

  updateStatus(restaurantId: string, orderId: string, status: OrderStatus): Observable<OrderDetail> {
    return this.http.put<OrderDetail>(`${this.baseUrl}/${restaurantId}/orders/${orderId}/status`, { status });
  }
}
