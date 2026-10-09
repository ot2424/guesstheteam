export function parseAuthLink(hash: string): { action: 'verify-email' | 'reset-password'; token: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const action = params.get('action');
  const token = params.get('token');
  return (action === 'verify-email' || action === 'reset-password') && token && /^[a-f0-9]{64}$/.test(token) ? { action, token } : null;
}
