/**
 * Styles de la section épinglée du hero et de ses boutons — uniquement des classes `kv-*`,
 * portées par `ViewEncapsulation.None`. Rien dans `styles.css`. Tokens : `--k-*` (lecture seule).
 */
export const COMMON_CSS = `
/* margin-top: la navbar (sticky) réserve 64 px de flux ; la scène remonte dessous, comme l'ancien hero (-mt-16). */
.kv-pin{position:relative;margin-top:-4rem;height:calc(var(--kv-len-wide,6.5) * 100svh)}
@media (max-width:819px),(max-aspect-ratio:11/10){.kv-pin{height:calc(var(--kv-len-tall,4.2) * 100svh)}}
.kv-sticky{position:sticky;top:0;height:100svh;overflow:hidden}
.kv-sticky ks-stage{position:absolute;inset:0}
.kv-pin.kv-reduced{height:auto}
.kv-pin.kv-reduced .kv-sticky{position:relative}

/* Lien persistant « passer » : la scène ne retient jamais le visiteur. */
.kv-skip{position:absolute;right:20px;bottom:18px;z-index:5;font:600 11px/1 var(--k-font-mono,monospace);letter-spacing:.14em;text-transform:uppercase;
  color:var(--ks-muted,#6B6A64);text-decoration:none;padding:10px 12px;border-radius:6px;transition:color .15s var(--k-ease,ease),background-color .15s var(--k-ease,ease)}
.kv-skip:hover{color:var(--ks-ink,#131312);background:color-mix(in srgb,currentColor 8%,transparent)}
.kv-skip:focus-visible{outline:2px solid var(--k-persimmon,#F05A00);outline-offset:2px}
@media (max-width:819px),(max-aspect-ratio:11/10){.kv-skip{right:12px;bottom:66px}}

/* Boutons de la scène (dessinés dans le repère du cadre, donc plus grands que .btn) */
.kv-btn{display:inline-flex;align-items:center;gap:10px;height:56px;padding:0 26px;border-radius:8px;font-size:18px;font-weight:600;line-height:1;text-decoration:none;white-space:nowrap;
  transition:background-color .15s var(--k-ease,ease),color .15s var(--k-ease,ease)}
/* La règle générique « ks-stage .ks-ln > * » (inline-block) gagne à spécificité égale : on ne relève que display. */
ks-stage .ks-ln>.kv-btn{display:inline-flex}
.kv-btn svg{width:18px;height:18px}
.kv-btn-primary{background:var(--k-persimmon,#F05A00);color:#fff}
.kv-btn-primary:hover{background:var(--k-persimmon-hover,#D44F00)}
.kv-btn-ghost{color:var(--ks-ink,#131312)}
.kv-btn-ghost:hover{background:color-mix(in srgb,currentColor 8%,transparent)}
.kv-btn:focus-visible{outline:3px solid var(--k-persimmon,#F05A00);outline-offset:3px}
`;
