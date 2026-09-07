import { createServer, Server } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import type { AddressInfo } from 'node:net';

/**
 * Sert un dossier statique **à la manière de Cloudflare Pages** — l'hébergeur réel du
 * frontend Karta (`https://kartaqr.fr`). Sert à vérifier, hors navigateur de dev, que
 * la sortie de `npm run build` se comporte comme en production, y compris les pièges
 * qui ont causé un 404 puis une boucle `ERR_TOO_MANY_REDIRECTS`.
 *
 * Comportements reproduits (docs Cloudflare Pages) :
 *
 *  1. **`_redirects` s'applique AVANT les assets, et même si un asset existe.**
 *     C'est pourquoi une règle `/*` est dangereuse : elle masquerait les pages
 *     prérendues.
 *  2. **Normalisation d'URL HTML `auto-trailing-slash`** (défaut) :
 *       `/x.html`            → 307 vers `/x`
 *       `/x` (x/index.html)  → 307 vers `/x/`
 *       `/x/` (x/index.html) → 200, sert `x/index.html`
 *       `/x` (x.html)        → 200, sert `x.html`
 *       `/index.html`        → 307 vers `/`
 *       `/`                  → 200, sert `index.html`
 *     Cette normalisation s'applique aussi à la **cible d'un rewrite `200`** — d'où
 *     la boucle quand la cible est `/index.csr.html` (307 → `/index.csr` → règle
 *     `/*` → `/index.csr.html` → 307 → …).
 *  3. **`404.html`** : si présent au niveau supérieur, il est servi (statut 404)
 *     pour tout chemin sans asset ni règle, et il désactive le « mode SPA
 *     implicite » de Cloudflare.
 */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
};

interface Rule {
  from: string;
  to: string;
  code: number;
}

function parseRedirects(root: string): Rule[] {
  try {
    return readFileSync(join(root, '_redirects'), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const [from, to, code] = l.split(/\s+/);
        return { from, to, code: Number(code || 302) };
      });
  } catch {
    return [];
  }
}

function isFile(root: string, rel: string): boolean {
  try {
    return statSync(join(root, rel)).isFile();
  } catch {
    return false;
  }
}

type Resolution =
  | { kind: 'file'; file: string }
  | { kind: 'redirect'; location: string }
  | { kind: 'none' };

/** Résolution d'un chemin en asset, avec la normalisation `auto-trailing-slash`. */
function resolveAsset(root: string, pathname: string): Resolution {
  if (pathname === '/') {
    return isFile(root, 'index.html') ? { kind: 'file', file: 'index.html' } : { kind: 'none' };
  }
  // /a/b/index.html → 307 /a/b/   ;   /a/b.html → 307 /a/b
  if (pathname.endsWith('/index.html')) {
    return { kind: 'redirect', location: pathname.slice(0, -'index.html'.length) };
  }
  if (pathname.endsWith('.html')) {
    return { kind: 'redirect', location: pathname.slice(0, -'.html'.length) };
  }
  if (pathname.endsWith('/')) {
    const idx = pathname.slice(1) + 'index.html';
    return isFile(root, idx) ? { kind: 'file', file: idx } : { kind: 'none' };
  }
  // pas de slash final
  const asHtml = pathname.slice(1) + '.html';
  if (isFile(root, asHtml)) return { kind: 'file', file: asHtml };
  const asDirIndex = pathname.slice(1) + '/index.html';
  if (isFile(root, asDirIndex)) return { kind: 'redirect', location: pathname + '/' };
  if (isFile(root, pathname.slice(1))) return { kind: 'file', file: pathname.slice(1) };
  return { kind: 'none' };
}

function matchRule(rules: Rule[], pathname: string): Rule | null {
  for (const r of rules) {
    if (r.from === pathname) return r;
    if (r.from.endsWith('/*')) {
      const base = r.from.slice(0, -2);
      if (base === '' || pathname === base || pathname.startsWith(base + '/')) return r;
    }
  }
  return null;
}

/** `404.html` le plus proche en remontant l'arborescence (comme Cloudflare Pages). */
function find404(root: string, pathname: string): string | null {
  let dir = dirname(pathname);
  while (true) {
    const rel = join(dir, '404.html').replace(/^[/\\]/, '');
    if (isFile(root, rel)) return rel;
    if (dir === '/' || dir === '.' || dir === '') return null;
    dir = dirname(dir);
  }
}

export interface CfPagesServer {
  url: string;
  close(): Promise<void>;
}

export async function startCfPagesServer(root: string): Promise<CfPagesServer> {
  const rules = parseRedirects(root);

  function serveFile(res: import('node:http').ServerResponse, file: string, status = 200) {
    const body = readFileSync(join(root, file));
    res.writeHead(status, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  }

  const server: Server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname);

    // 1. _redirects — appliqué avant les assets, qu'un asset existe ou non.
    const rule = matchRule(rules, pathname);
    if (rule) {
      if (rule.code >= 300 && rule.code < 400) {
        res.writeHead(rule.code, { location: rule.to });
        res.end();
        return;
      }
      // rewrite 200 : la cible passe par la même normalisation HTML → une 307 sur
      // la cible est renvoyée au client (c'est le vecteur de la boucle).
      const target = resolveAsset(root, rule.to);
      if (target.kind === 'redirect') {
        res.writeHead(307, { location: target.location });
        res.end();
        return;
      }
      if (target.kind === 'file') {
        serveFile(res, target.file, 200);
        return;
      }
      // cible introuvable → on continue vers 404
    }

    // 2. asset statique (avec normalisation d'URL).
    if (!rule) {
      const asset = resolveAsset(root, pathname);
      if (asset.kind === 'redirect') {
        res.writeHead(307, { location: asset.location });
        res.end();
        return;
      }
      if (asset.kind === 'file') {
        serveFile(res, asset.file, 200);
        return;
      }
    }

    // 3. 404.html le plus proche (statut 404).
    const notFound = find404(root, pathname);
    if (notFound) {
      serveFile(res, notFound, 404);
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
