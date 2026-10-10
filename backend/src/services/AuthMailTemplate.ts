export type MailPurpose = 'verify-email' | 'reset-password' | 'password-changed';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function renderAuthMail(purpose: MailPurpose, text: string) {
  const reset = purpose === 'reset-password';
  const changed = purpose === 'password-changed';
  const title = changed ? 'Passwort geändert' : reset ? 'Zurück ins Spiel.' : 'Dein Team wartet.';
  const description = changed
    ? 'Dein Passwort wurde erfolgreich geändert. Alle bisherigen Sitzungen wurden abgemeldet.'
    : reset ? 'Ein neues Passwort, und du bist wieder dabei. Wähle ein sicheres Passwort für deinen GuessTheTeam-Account.'
      : 'Nur noch ein Schritt: Bestätige deine E-Mail-Adresse und sichere dir deinen Fortschritt, XP und Rang.';
  const url = text.match(/^https?:\/\/\S+$/m)?.[0];
  const button = reset ? 'Neues Passwort setzen' : 'E-Mail bestätigen';
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${title}</title></head>
<body style="margin:0;background:#06090f;color:#f9fafb;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${description}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#06090f"><tr><td align="center" style="padding:36px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0e141d;border:1px solid #263140;border-radius:24px;overflow:hidden">
<tr><td style="padding:30px 32px;background:#0c1a12;border-bottom:1px solid #233329"><a href="https://guesstheteam.de" style="color:#ffffff;text-decoration:none;font-size:18px;font-weight:800;letter-spacing:2px"><span style="color:#22c55e">GTT</span> &nbsp;GUESSTHETEAM</a></td></tr>
<tr><td style="padding:32px"><p style="margin:0 0 14px;color:#22c55e;font-size:11px;font-weight:700;letter-spacing:2px">DEIN ACCOUNT</p>
<h1 style="margin:0 0 18px;font-size:34px;line-height:1.15;color:#ffffff">${title}</h1>
<p style="margin:0 0 26px;color:#a8b2c1;font-size:15px;line-height:1.7">${description}</p>
${!changed && url ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#22c55e" style="border-radius:12px;text-align:center"><a href="${escapeHtml(url)}" style="display:inline-block;padding:17px 26px;color:#04130a;font-size:15px;font-weight:700;text-decoration:none">${button} &rarr;</a></td></tr></table>
<p style="margin:20px 0 0;color:#a8b2c1;font-size:13px;line-height:1.6">Dieser Link ist ${reset ? '30 Minuten' : '24 Stunden'} gültig und kann einmal verwendet werden.</p>
<p style="margin:24px 0 8px;color:#8894a5;font-size:12px">Der Button funktioniert nicht? Kopiere diesen Link:</p><p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere"><a href="${escapeHtml(url)}" style="color:#86efac">${escapeHtml(url)}</a></p>` : ''}
</td></tr><tr><td style="padding:22px 32px;border-top:1px solid #263140;color:#8894a5;font-size:12px;line-height:1.7">${changed ? 'Falls du das nicht warst, setze dein Passwort umgehend über die Anmeldung zurück.' : 'Falls du diese Anfrage nicht gestellt hast, kannst du diese Nachricht ignorieren.'}<br><br>GuessTheTeam · Dein Fußballwissen. Dein Spiel.</td></tr>
</table></td></tr></table></body></html>`;
}
