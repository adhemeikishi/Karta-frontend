import {
  Directive,
  ElementRef,
  HostBinding,
  OnDestroy,
  OnInit,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * Révèle l'élément (fondu + translateY, voir `.reveal`/`.reveal-scale` dans
 * styles.css — 800ms, `--k-ease`, volontairement lent et cinématique) au premier
 * passage dans le viewport, puis se désabonne — jamais de ré-animation au scroll
 * répété. `revealDelay` (ms) permet un stagger entre éléments d'un même groupe ;
 * `revealScale` ajoute une très légère mise à l'échelle, réservée aux gros éléments
 * (mockup téléphone, titre du hero) — jamais un zoom marqué.
 *
 * Sans IntersectionObserver (vieux navigateur) ou avec JS désactivé au SSR : la
 * classe `.is-visible` est posée immédiatement, le contenu reste toujours lisible.
 */
@Directive({
  selector: '[revealOnScroll]',
  standalone: true,
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  readonly revealDelay = input(0, { alias: 'revealOnScroll', transform: numberAttribute });
  readonly revealScale = input(false, { transform: (v: unknown) => v !== false && v !== 'false' });

  @HostBinding('class.reveal') get baseClass(): boolean {
    return !this.revealScale();
  }
  @HostBinding('class.reveal-scale') get scaleClass(): boolean {
    return this.revealScale();
  }

  private observer?: IntersectionObserver;

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.el.nativeElement.classList.add('is-visible');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const delay = this.revealDelay() || 0;
            window.setTimeout(() => this.el.nativeElement.classList.add('is-visible'), delay);
            this.observer?.unobserve(this.el.nativeElement);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
