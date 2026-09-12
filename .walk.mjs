import { chromium } from '@playwright/test';

const out = process.argv[2];
const pdf = `${out}/menu-restaurant.pdf`;
const width = Number(process.argv[3] ?? 1440);
const tag = process.argv[4] ?? 'd';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));

const shot = async (name) => { await p.screenshot({ path: `${out}/${tag}-w-${name}.png`, fullPage: false }); };
const overflow = async (where) => {
  const bad = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (bad) console.log('OVERFLOW HORIZONTAL:', where);
};

await p.goto('http://localhost:4200/', { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '.reveal,.reveal-scale{opacity:1!important;transform:none!important}' });
await p.locator('#menu').scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await shot('01-landing');
await overflow('landing');

// 1. dépôt du PDF
await p.setInputFiles('#menu input[type=file]', pdf);
await p.waitForTimeout(500);
await shot('02-file');

// 2. démarrage du parcours
await p.getByRole('button', { name: 'Créer mon menu digital' }).click();
await p.waitForURL('**/karta-ai', { timeout: 5000 });
console.log('→', p.url());
await p.waitForTimeout(3500);
await shot('03-analyse');
await overflow('karta-ai');
await p.waitForTimeout(9000);
await shot('04-analyse-fin');
await p.waitForTimeout(2500);
await shot('05-pret');

// 3. review
await p.getByRole('link', { name: 'Vérifier ma carte' }).click();
await p.waitForURL('**/create/review', { timeout: 5000 });
console.log('→', p.url());
await p.waitForTimeout(500);
await shot('06-review');
await overflow('review');

// modifier un plat + décocher
await p.locator('.mx-item-open').first().click();
await p.waitForTimeout(300);
await p.locator('.mx-edit input.input').first().fill('Burrata di Puglia');
await p.locator('.mx-edit input.mono').first().fill('10,50');
await p.getByRole('button', { name: 'Terminer' }).click();
await p.waitForTimeout(300);
await p.locator('.cf-check input').nth(2).uncheck();
await p.waitForTimeout(300);
await shot('07-review-edit');
const editedOk = await p.getByText('Burrata di Puglia').first().isVisible();
console.log('plat modifié visible :', editedOk);

await p.getByRole('button', { name: 'Valider ma carte' }).click();
await p.waitForURL('**/create/design', { timeout: 5000 });
console.log('→', p.url());
await p.waitForTimeout(600);
await shot('08-design');
await overflow('design');

// presets
for (const preset of ['Dark', 'Street Food', 'Luxe']) {
  await p.getByRole('button', { name: preset, exact: true }).click();
  await p.waitForTimeout(400);
}
await shot('09-preset-luxe');

// personnalisation : nom + couleur
await p.locator('#brand-name').fill('Chez Miloud');
await p.waitForTimeout(300);
await p.locator('.cf-details > summary').click();
await p.waitForTimeout(300);
await p.locator('#color-primary').evaluate((el) => {
  el.value = '#0d6b4f';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await p.waitForTimeout(400);
await shot('10-perso');

// rechargement : le brouillon doit survivre
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const survived = await p.locator('#brand-name').inputValue();
console.log('après rechargement, nom conservé :', survived);
await shot('11-apres-reload');

// 4. CTA QR → compte
await p.getByRole('button', { name: 'Obtenir mon QR code' }).click();
await p.waitForURL('**/create/compte', { timeout: 5000 });
console.log('→', p.url());
await p.waitForTimeout(500);
await shot('12-compte');
await overflow('compte');

// retour arrière : on doit retrouver le style
await p.goBack();
await p.waitForTimeout(700);
console.log('retour arrière →', p.url(), '| nom :', await p.locator('#brand-name').inputValue());

// 5. auth → pricing
await p.goForward();
await p.waitForTimeout(500);
await p.getByRole('link', { name: 'Se connecter' }).click();
await p.waitForURL('**/login**', { timeout: 5000 });
console.log('→', p.url());
await shot('13-login');

console.log('ERREURS CONSOLE:', errs.length ? errs.slice(0, 6) : 'aucune');
await b.close();
