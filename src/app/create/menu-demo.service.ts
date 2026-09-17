import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DraftCategory } from '../menu/review/menu-draft.model';

/** Même forme que `ExtractionDtos.ExtractedMenu` côté backend. */
export interface ExtractedMenuResponse {
  categories: DraftCategory[];
}

/**
 * Démo publique KartaAI : `/api/public/menu-demo/extract`.
 *
 * Même pipeline d'extraction que l'onboarding réel (`MenuExtractor` + `ExtractionValidator`
 * côté backend), mais sans restaurant ni compte, et sans Basic Auth — voir
 * `MenuDemoPublicController`. Rien n'est jamais enregistré côté serveur : le résultat
 * n'existe que dans la réponse de cet appel.
 */
@Injectable({ providedIn: 'root' })
export class MenuDemoService {
  private readonly http = inject(HttpClient);

  extract(file: File): Observable<ExtractedMenuResponse> {
    const form = new FormData();
    form.append('file', file);
    // Ne pas fixer Content-Type : HttpClient gère la frontière multipart.
    return this.http.post<ExtractedMenuResponse>(
      `${environment.apiBaseUrl}/api/public/menu-demo/extract`,
      form,
    );
  }
}
