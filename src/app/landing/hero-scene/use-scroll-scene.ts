import { DestroyRef, Signal, afterNextRender, inject, signal } from '@angular/core';
import { SceneStageComponent } from './scene-stage.component';
import { DURATION } from './karta-scene';
import { KeyMap, ScrollDriver, pchipMap } from './scroll-driver';

export interface ScrollSceneConfig {
  /** Section haute dont la hauteur donne la longueur du scroll. */
  pin: () => HTMLElement;
  /** Élément `position: sticky` à l'intérieur. */
  sticky: () => HTMLElement;
  stage: () => SceneStageComponent;
  /** Repères [progression, t] — gabarit large (desktop / tablette paysage). */
  wide: KeyMap;
  /** Repères pour le gabarit portrait (mobile) — scroll plus court. */
  tall: KeyMap;
  /** Lecture automatique à l'ouverture de la page, avant que le scroll ne prenne la main. */
  intro?: { from: number; dur: number };
  /** Ajouts propres au hero, appelés à chaque image après la scène. */
  extra?: (t: number, p: number, kind: 'wide' | 'tall') => void;
}

/**
 * Branche une scène sur le scroll de sa section. À appeler dans le constructeur du composant. Gère : l'attente de la scène, la carte de repères par gabarit, le respect de
 * `prefers-reduced-motion` (scène figée sur la composition finale, aucune section collante)
 * et le nettoyage complet à la destruction (écouteurs, boucle d'animation).
 */
export function useScrollScene(cfg: ScrollSceneConfig): { reduced: Signal<boolean> } {
  const destroyRef = inject(DestroyRef);
  const reduced = signal(false);
  let driver: ScrollDriver | null = null;
  let mq: MediaQueryList | null = null;
  const mapWide = pchipMap(cfg.wide);
  const mapTall = pchipMap(cfg.tall);

  const stop = () => {
    driver?.stop();
    driver = null;
  };

  const run = () => {
    stop();
    const stage = cfg.stage();
    if (reduced()) {
      stage.seek(DURATION - 0.01);
      cfg.extra?.(DURATION - 0.01, 1, stage.kind());
      return;
    }
    const opts = {
      pin: cfg.pin(),
      sticky: cfg.sticky(),
      map: (p: number) => (stage.kind() === 'tall' ? mapTall : mapWide)(p),
      apply: (t: number, p: number) => {
        stage.seek(t);
        cfg.extra?.(t, p, stage.kind());
      },
      intro: cfg.intro,
    };
    driver = new ScrollDriver(opts);
    driver.start();
  };

  afterNextRender(() => {
    mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.set(mq.matches);
    const onMq = () => {
      reduced.set(mq?.matches ?? false);
      queueMicrotask(run);
    };
    mq.addEventListener('change', onMq);
    destroyRef.onDestroy(() => mq?.removeEventListener('change', onMq));

    const stage = cfg.stage();
    let first = true;
    const onReady = () => {
      if (first) {
        first = false;
        // Laisse le gabarit réduit (hauteur de section) s'appliquer avant de mesurer le scroll.
        requestAnimationFrame(run);
      } else if (driver) driver.refresh();
      else run();
    };
    if (stage.isReady) onReady();
    const sub = stage.ready.subscribe(onReady);
    destroyRef.onDestroy(() => sub.unsubscribe());
  });

  destroyRef.onDestroy(stop);
  return { reduced };
}
