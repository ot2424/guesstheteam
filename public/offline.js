let checking = false;
async function retryConnection() {
  if (checking) return;
  const status = document.getElementById('status');
  if (!navigator.onLine) { status.textContent = 'Noch keine Internetverbindung verfügbar.'; return; }
  checking = true;
  status.textContent = 'Verbindung wird geprüft…';
  try {
    const response = await fetch('/manifest.webmanifest', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error();
    window.location.reload();
  } catch { status.textContent = 'Die Verbindung ist noch nicht verfügbar. Bitte versuche es erneut.'; checking = false; }
}
document.getElementById('retry').addEventListener('click', () => void retryConnection());
window.addEventListener('online', () => void retryConnection());
// Connectivity can return before this script has finished loading.
if (navigator.onLine) void retryConnection();
