import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Restaurant, RestaurantSummary } from '../models/restaurant.model';

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

  create(name: string): Observable<Restaurant> {
    return this.http.post<Restaurant>(this.baseUrl, { name });
  }

  rename(id: string, name: string): Observable<Restaurant> {
    return this.http.put<Restaurant>(`${this.baseUrl}/${id}`, { name });
  }
}
