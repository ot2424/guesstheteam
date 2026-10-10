// Run with NODE_PATH pointing to a separately installed Playwright package.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.GTT_PLAYWRIGHT_MODULE || 'playwright');
let base = process.env.GTT_BROWSER_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];
try {
  for (const device of ['iPhone 13', 'Pixel 7']) {
    const context = await browser.newContext({ ...devices[device], serviceWorkers: 'allow' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    // UI tests use isolated API fixtures; no production accounts or email are touched.
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const body = path === '/api/v1/auth/me' ? { error: 'Bitte melde dich an.' } : { error: 'Test connection unavailable' };
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify(body) });
    });
    // Use the final origin after hosting redirects so offline navigation remains
    // inside the installed service worker's scope.
    await page.goto(base);
    base = new URL(page.url()).origin;
    for (const path of ['/', '/auth', '/impressum', '/datenschutz']) {
      await page.goto(base + path);
      await page.locator('h1, h2').first().waitFor();
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${device}: overflow at ${path}`);
      const tabbar = page.locator('.app-tabbar');
      const bounds = await tabbar.boundingBox();
      assert.ok(bounds && Math.abs(bounds.y + bounds.height - page.viewportSize().height) < 2, `${device}: bottom navigation`);
    }
    await page.goto(base);
    await page.locator('h1').first().waitFor();
    await page.screenshot({ path: `/tmp/gtt-home-${device.replaceAll(' ', '-')}.png`, fullPage: true });
    await page.goto(`${base}/auth#action=reset-password&token=${'a'.repeat(64)}`);
    await page.getByRole('heading', { name: 'Neues Passwort setzen' }).waitFor();
    assert.equal(await page.locator('input[type=password]').count(), 2);
    assert.equal(await page.locator('input[type=password]').first().evaluate(element => getComputedStyle(element).fontSize), '16px');
    await page.locator('input[type=password]').first().fill('a-test-password-123');
    await page.locator('input[type=password]').nth(1).fill('other-password-123');
    await page.getByRole('button', { name: 'Neues Passwort speichern' }).click();
    await page.getByRole('alert').filter({ hasText: 'Die Passwörter stimmen nicht überein.' }).waitFor();
    await page.screenshot({ path: `/tmp/gtt-reset-${device.replaceAll(' ', '-')}.png`, fullPage: true });
    await page.goto(base);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.getByText('Du bist offline.', { exact: false }).waitFor();
    await page.goto(`${base}/impressum`);
    await page.getByRole('heading', { name: 'Kurze Spielpause.' }).waitFor();
    await page.waitForLoadState('load');
    await context.setOffline(false);
    await page.waitForURL('**/impressum');
    await page.getByRole('heading', { name: 'Impressum', exact: true }).waitFor();
    await page.screenshot({ path: `/tmp/gtt-${device.replaceAll(' ', '-')}.png`, fullPage: true });
    // Confirm a persisted game is reconciled with the server, then retain input on network failure.
    const team = { id: 'fixture-team', name: 'Test FC', season: '2025/26', league: 'Test', logoUrl: '', formation: '4-3-3', players: Array.from({ length: 11 }, (_, index) => ({ id: `p${index}`, position: index === 0 ? 'GK' : index < 5 ? 'CB' : index < 8 ? 'CM' : 'ST', nationality: 'France', nationalityFlag: '🇫🇷', formationSlot: index, career: [{ clubId: 'rennes', clubName: 'Stade Rennais', logoUrl: 'https://upload.wikimedia.org/stale.svg', fromYear: 2019, toYear: 2021 }] })) };
    const initialGuesses = Object.fromEntries(team.players.map(player => [player.id, { playerId: player.id, solved: false, attempts: 0, revealed: false }]));
    const saved = { sessionId: '11111111-1111-4111-8111-111111111111', team, guesses: initialGuesses, startedAt: Date.now(), playMode: 'casual', matchType: 'single', difficulty: 'easy', rank: 'Bronze 3', savedAt: Date.now() };
    await page.evaluate(game => localStorage.setItem('footyguesser.activeGame.v1', JSON.stringify(game)), saved);
    await page.unroute('**/api/v1/**');
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/v1/game/guess') return route.abort('failed');
      const body = path === '/api/v1/auth/me' ? { user: { id: 'fixture-user', email: 'test@example.com' } }
        : path.startsWith('/api/v1/game/sessions/') ? { ...saved, status: 'active', guesses: { ...initialGuesses, p0: { ...initialGuesses.p0, solved: true, guessedName: 'Solved Player' } } }
          : path === '/api/v1/profile/me' ? { profile: null } : path === '/api/v1/players/search' ? { results: [] } : { notificationCount: 0 };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${base}/play`);
    await page.getByLabel('Spielername').waitFor();
    await page.getByText('1/11', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('footyguesser.activeGame.v1')).guesses.p0.solved), true);
    assert.equal(await page.locator('.app-tabbar').count(), 0);
    await page.getByRole('button').filter({ hasText: '💡' }).first().click();
    const logo = page.locator('.app-drawer:visible img[alt="Stade Rennais"]').first();
    await logo.waitFor();
    await page.waitForFunction(() => { const image = [...document.querySelectorAll('.app-drawer img[alt="Stade Rennais"]')].find(image => image.getBoundingClientRect().height > 0); return image?.complete && image.naturalWidth > 0; });
    await page.getByRole('button', { name: 'Karriere-Tipp schließen' }).filter({ visible: true }).click();
    await page.getByLabel('Spielername').fill('Retry Name');
    await page.getByRole('button', { name: 'Raten', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Die Verbindung ist unterbrochen' }).waitFor();
    assert.equal(await page.getByLabel('Spielername').inputValue(), 'Retry Name');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('footyguesser.activeGame.v1')).guesses.p0.solved), true);
    await context.close();
    console.log(`${device}: responsive layout, bottom navigation, reset form, connection banner and offline recovery, server resume, club logo and input retention passed.`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
