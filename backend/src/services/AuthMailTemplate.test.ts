import { describe, expect, it } from 'vitest';
import { renderAuthMail } from './AuthMailTemplate';

describe('auth mail template', () => {
  it('keeps the complete reset token in an escaped button link', () => {
    const url = `https://guesstheteam.de/auth#action=reset-password&token=${'a'.repeat(64)}`;
    const html = renderAuthMail('reset-password', `Link:\n\n${url}\n\nIgnorieren.`);
    expect(html).toContain(`href="${url.replace('&', '&amp;')}"`);
    expect(html).toContain('Neues Passwort setzen');
    expect(html).toContain('30 Minuten');
  });
  it('uses the verification expiry and omits action links in change notifications', () => {
    expect(renderAuthMail('verify-email', 'https://guesstheteam.de/auth#test')).toContain('24 Stunden');
    const html = renderAuthMail('password-changed', 'Passwort geändert.');
    expect(html).toContain('Alle bisherigen Sitzungen');
    expect(html).not.toContain('Neues Passwort setzen');
  });
});
