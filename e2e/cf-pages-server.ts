import { createServer, Server } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { AddressInfo } from 'node:net';

/**
 * Sert un dossier statique **à la manière de Cloudflare Pages** — l'hébergeur réel du
 * frontend Karta (`https://kartaqr.fr`). Sert à vérifier, hors navigateur de dev, que la
 * sortie de `npm run build` se comporte comme en production.
 *
 * Règles reproduites :
 *  1. si un fichier statique correspond au chemin (avec résolution `…/index.html`), il est
 *     servi tel quel en 200 — un asset a toujours la priorité sur `_redirects` ;
 *  2. sinon, les règles de `_redirects` s'appliquent (rewrite `200` → sert la cible sans
 *     changer l'URL ; `301/302/308` → redirection) ;
 *  3. sinon, 404.
 *
 * C'est cette étape 2 qui manquait en production : sans `_redirects`, `/login` et
 * `/admin/**` (routes rendues côté client, sans fichier prérendu) tombaient en 404.
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

function resolveFile(root: string, pathname: string): string | null {
  const candidates = [pathname];
  if (!extname(pathname)) {
    candidates.push(pathname.replace(/\/$/, '') + '.html', join(pathname, 'index.html'));
  }
  for (const c of candidates) {
    try {
      if (statSync(join(root, c)).isFile()) return c;
    } catch {
      /* not a file */
    }
  }
  return null;
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

export interface CfPagesServer {
  url: string;
  close(): Promise<void>;
}

export async function startCfPagesServer(root: string): Promise<CfPagesServer> {
  const rules = parseRedirects(root);

  const server: Server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname);

    const asset = resolveFile(root, pathname === '/' ? '/index.html' : pathname);
    if (asset) {
      const body = readFileSync(join(root, asset));
      res.writeHead(200, { 'content-type': MIME[extname(asset)] ?? 'application/octet-stream' });
      res.end(body);
      return;
    }

    const rule = matchRule(rules, pathname);
    if (rule) {
      if (rule.code >= 300 && rule.code < 400) {
        res.writeHead(rule.code, { location: rule.to });
        res.end();
        return;
      }
      const dest = resolveFile(root, rule.to);
      if (dest) {
        const body = readFileSync(join(root, dest));
        res.writeHead(rule.code || 200, {
          'content-type': MIME[extname(dest)] ?? 'application/octet-stream',
        });
        res.end(body);
        return;
      }
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found — Cloudflare Pages renverrait 404 ici.');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
