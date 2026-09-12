import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { KartaLogoComponent } from '../shared/karta-logo.component';
import { ShellService } from './shell.service';

@Component({
    selector: 'app-layout',
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, KartaLogoComponent],
    templateUrl: './layout.component.html'
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellService);

  readonly breadcrumbs = this.shell.breadcrumbs;
  readonly mobileNavOpen = signal(false);

  toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobileNav();
  }

  logout(): void {
    this.authService.logout();
  }
}
