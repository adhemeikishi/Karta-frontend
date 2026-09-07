import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../shared/seo.service';

type FormState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Page `/contact` — formulaire simple, Design System existant (`.input`, `.select`,
 * `.field-label`, `.alert-error`, `.btn`). Aucun nouveau système visuel.
 *
 * TODO backend : `POST ${apiBaseUrl}/api/contact` n'existe pas encore côté serveur
 * (contact / prise de contact commerciale hors périmètre V1). Le front est complet
 * (tous les états) ; brancher l'endpoint quand il sera disponible.
 */
@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  private readonly http = inject(HttpClient);

  readonly subjects = [
    'Découvrir Karta',
    'Choisir une offre',
    'Question technique',
    'Autre',
  ];

  readonly state = signal<FormState>('idle');

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    restaurant: new FormControl('', { nonNullable: true }),
    subject: new FormControl(this.subjects[0], { nonNullable: true, validators: [Validators.required] }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  constructor() {
    inject(SeoService).apply({
      title: 'Contact',
      description:
        'Une question sur Karta, une offre à mettre en place ? Écrivez-nous, on répond vite.',
      path: '/contact',
    });
  }

  /** Champ en erreur ET déjà touché (ou après un submit raté) — pilote le liseré
   *  danger et le message d'erreur. */
  showError(field: 'name' | 'email' | 'restaurant' | 'subject' | 'message'): boolean {
    const c = this.form.controls[field];
    return c.invalid && (c.touched || this.state() === 'error');
  }

  submit(): void {
    if (this.state() === 'loading') {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.state.set('error');
      return;
    }

    this.state.set('loading');
    this.http.post(`${environment.apiBaseUrl}/api/contact`, this.form.getRawValue()).subscribe({
      next: () => {
        this.state.set('success');
        this.form.reset({ subject: this.subjects[0] });
      },
      error: () => this.state.set('error'),
    });
  }
}
