/**
 * Styles de la scène — portés de `motion-concepts/karta-hero/index.html`, tous préfixés
 * `ks-` et portés par `ViewEncapsulation.None` (le DOM de la scène est construit à la
 * main par `KartaScene`). Les couleurs viennent des tokens `--k-*` de `styles.css`
 * (lus, jamais modifiés). Le rendu du menu lui-même vient de `MenuRenderComponent`.
 */
const SCENE_CSS_STAGE = `
ks-stage{display:block;position:relative;width:100%;height:100%;overflow:hidden;background:var(--ks-stage-bg)}
ks-stage{--ks-stage-bg:var(--k-canvas,#FAFAF8);--ks-grid:var(--k-ink-200,#DBDAD5);--ks-ink:var(--k-ink-900,#131312);--ks-muted:var(--k-ink-500,#6B6A64)}
ks-stage .ks-stage{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;background:var(--ks-stage-bg);color:var(--ks-ink);font-family:var(--k-font-sans,'Plus Jakarta Sans',system-ui,sans-serif)}
ks-stage .ks-scene,ks-stage .ks-under,ks-stage .ks-over{position:absolute;inset:0}
ks-stage .ks-over{pointer-events:none}
ks-stage .ks-over a,ks-stage .ks-over button{pointer-events:auto}

ks-stage .ks-world{position:absolute;width:1920px;height:1080px;transform-origin:960px 540px}
ks-stage .ks-grid{position:absolute;left:-320px;top:-180px;width:2560px;height:1440px;
  background-image:linear-gradient(var(--ks-grid) 1px,transparent 1px),linear-gradient(90deg,var(--ks-grid) 1px,transparent 1px);
  background-size:16px 16px;background-position:center;
  -webkit-mask-image:radial-gradient(closest-side,#000 30%,transparent 100%);mask-image:radial-gradient(closest-side,#000 30%,transparent 100%)}
ks-stage .ks-flood{position:absolute;left:765px;top:118px;width:390px;height:844px;border-radius:48px;background:var(--k-charcoal,#131312);visibility:hidden}
ks-stage .ks-card{position:absolute;left:0;top:0;background:#fff;border:1px solid var(--k-hairline,#E6E6E4);
  box-shadow:0 1px 2px rgba(19,19,18,.04),0 24px 48px -24px rgba(19,19,18,.22)}
ks-stage .ks-cap{position:absolute;left:0;right:0;text-align:center;font-weight:500;color:#131312;letter-spacing:-.005em}

ks-stage .ks-phone{position:absolute;left:751px;top:104px;width:418px;height:872px;border-radius:62px;border:14px solid #0C0C0C;
  box-shadow:0 0 0 1.5px #3B3A37,0 50px 90px -40px rgba(12,12,12,.45),0 16px 30px -16px rgba(12,12,12,.3)}
ks-stage .ks-screen{position:absolute;left:0;top:0;width:390px;height:844px;border-radius:48px;overflow:hidden;isolation:isolate}
ks-stage .ks-island{position:absolute;left:139px;top:11px;width:112px;height:33px;border-radius:17px;background:#000;z-index:9}
ks-stage .ks-layer{position:absolute;inset:0;z-index:0}
`;

const SCENE_CSS_DEVICE = `
ks-stage .ks-cam{position:absolute;inset:0;z-index:5;color:#fff}
ks-stage .ks-hole{position:absolute;border-radius:14px;box-shadow:0 0 0 1200px rgba(12,12,12,.58)}
ks-stage .ks-br{position:absolute;width:30px;height:30px;border-color:currentColor;border-style:solid;border-width:0}
ks-stage .ks-tl{border-top-width:3px;border-left-width:3px;border-top-left-radius:10px}
ks-stage .ks-tr{border-top-width:3px;border-right-width:3px;border-top-right-radius:10px}
ks-stage .ks-bl{border-bottom-width:3px;border-left-width:3px;border-bottom-left-radius:10px}
ks-stage .ks-bf{border-bottom-width:3px;border-right-width:3px;border-bottom-right-radius:10px}
ks-stage .ks-pill{position:absolute;left:50%;top:604px;height:40px;padding:0 16px;border-radius:20px;background:rgba(255,255,255,.95);color:#131312;
  display:flex;align-items:center;gap:8px;font:600 15px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;white-space:nowrap}
ks-stage .ks-pill svg{width:16px;height:16px}
ks-stage .ks-ripple{position:absolute;left:195px;top:624px;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.28)}
ks-stage .ks-band{position:absolute;left:0;right:0;bottom:0;height:150px;display:flex;flex-direction:column;align-items:center;gap:16px;padding-top:18px;
  font:600 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;letter-spacing:.12em}
ks-stage .ks-shutter{width:66px;height:66px;border-radius:50%;border:4px solid #fff;padding:4px}
ks-stage .ks-shutter i{display:block;width:100%;height:100%;border-radius:50%;background:#fff}

/* Barre d'état / barre d'adresse (chrome iOS autour du menu, hors rendu Karta) */
ks-stage .ks-sb{position:absolute;left:0;right:0;top:0;height:50px;padding:6px 30px 0 34px;display:flex;align-items:center;justify-content:space-between;
  font:600 16px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;z-index:3;background:var(--ks-bg);color:var(--ks-text)}
ks-stage .ks-sb-cam{background:transparent}
/* Les icônes sont des SVG : le CSS global du site pose svg{display:block}, qui les empilait. On les range explicitement
   sur une ligne, alignés sur le centre de l'îlot (y ≈ 27). */
ks-stage .ks-sb>span:first-child{letter-spacing:-.01em;font-variant-numeric:tabular-nums}
ks-stage .ks-sb>span:last-child{display:flex;align-items:center;gap:6px}
ks-stage .ks-sb svg{display:block;flex:none;height:12px;width:auto;margin:0}
ks-stage .ks-ub{position:absolute;left:12px;right:12px;bottom:24px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:7px;
  font:500 15px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;z-index:3;background:var(--ks-surface);color:var(--ks-text);box-shadow:inset 0 0 0 1px var(--ks-border)}
ks-stage .ks-ub svg{width:12px;height:12px}
ks-stage .ks-home{position:absolute;left:128px;bottom:8px;width:134px;height:5px;border-radius:3px;z-index:3;background:var(--ks-text)}

/* Couche de menu : le rendu vient de MenuRenderComponent (<menu-render>) */
ks-stage .ks-km{position:absolute;inset:0;overflow:hidden;background-color:var(--ks-bg)}
ks-stage .ks-kscroll{position:relative;padding-top:50px}
ks-stage .ks-fade{position:absolute;left:0;right:0;bottom:0;height:130px;background:linear-gradient(to bottom,transparent,var(--ks-bg) 72%);z-index:2}
ks-stage .ks-pv{display:block;height:1.5em;overflow:hidden}
ks-stage .ks-pvi,ks-stage .ks-pv b{display:block;font-weight:inherit}
ks-stage .ks-tx{display:inline-block}

/* Modules du QR (le fil conducteur) */
ks-stage .ks-modules{position:absolute;left:0;top:0}
ks-stage .ks-modules i{position:absolute;left:0;top:0;width:100px;height:100px;transform-origin:0 0;background:#131312}
ks-stage .ks-fbr{position:absolute;left:0;top:0;color:var(--k-persimmon,#F05A00)}
ks-stage .ks-fbr .ks-br{width:34px;height:34px;border:0 solid currentColor;border-radius:0}
ks-stage .ks-fbr .ks-tl{left:0;top:0;border-top-width:3px;border-left-width:3px}
ks-stage .ks-fbr .ks-tr{right:0;top:0;border-top-width:3px;border-right-width:3px}
ks-stage .ks-fbr .ks-bl{left:0;bottom:0;border-bottom-width:3px;border-left-width:3px}
ks-stage .ks-fbr .ks-bf{right:0;bottom:0;border-bottom-width:3px;border-right-width:3px}

/* Typographie pilotée par le temps (voir TextTimeline) */
ks-stage .ks-blk{position:absolute;visibility:hidden}
ks-stage .ks-ln{display:block;overflow:hidden;padding-bottom:.24em;margin-bottom:-.24em}
ks-stage .ks-ln>*{display:inline-block;will-change:transform}
ks-stage .ks-pt{margin-left:-.12em}
`;

/** Calques de compositing (monde, grille, topographie) et bords fondus des cadres étroits. */
const SCENE_CSS_LAYERS = `
/* Cadre plus étroit que l'écran (tablette portrait) : la grille et la topographie s'effacent sur 36 px au lieu d'être coupées net. */
ks-stage.ks-box .ks-stage{-webkit-mask-image:linear-gradient(90deg,transparent,#000 36px,#000 calc(100% - 36px),transparent);mask-image:linear-gradient(90deg,transparent,#000 36px,#000 calc(100% - 36px),transparent)}
ks-stage .ks-world{will-change:transform}
/* L'opacité s'anime sur le conteneur (calque composité) ; le masque reste sur la grille, statique : animer l'opacité d'un élément masqué le repeignait en entier à chaque image. */
ks-stage .ks-gridw{position:absolute;left:0;top:0;width:0;height:0;will-change:opacity}
ks-stage .ks-topo2{position:absolute;transform-origin:50% 50%;will-change:transform;pointer-events:none;user-select:none}
ks-stage .ks-topo2 img{position:absolute;left:0;top:0;width:100%;height:100%;max-width:none;will-change:opacity}
ks-stage .ks-screenbg{position:absolute;inset:0;z-index:0}
ks-stage .ks-layer{z-index:1}
`;
/** Trois feuilles : chacune reste sous le budget de 5 kB par composant. */
export const SCENE_CSS: string[] = [SCENE_CSS_STAGE, SCENE_CSS_DEVICE, SCENE_CSS_LAYERS];
