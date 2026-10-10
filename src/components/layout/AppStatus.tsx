import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function AppStatus() {
  const { pathname } = useLocation();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [connectionError, setConnectionError] = useState('');
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined;
    const checkUpdate = () => { if (!document.hidden && navigator.onLine) void registration?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', checkUpdate);
    const online = () => { setOffline(false); window.dispatchEvent(new Event('gtt:retry')); };
    const offline = () => setOffline(true);
    const failed = (event: Event) => setConnectionError((event as CustomEvent<string>).detail);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('gtt:connection-error', failed);
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registered => {
        registration = registered;
        if (registered.waiting) setWaitingWorker(registered.waiting);
        registered.addEventListener('updatefound', () => {
          const worker = registered.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaitingWorker(worker);
          });
        });
      }).catch(() => { /* Browsing remains available if installation is unsupported. */ });
    }
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); window.removeEventListener('gtt:connection-error', failed); document.removeEventListener('visibilitychange', checkUpdate); };
  }, []);

  const retry = async () => {
    setChecking(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? 'https://api.guesstheteam.de/api/v1' : 'http://localhost:4000/api/v1');
      const response = await fetch(new URL('/ready', base), { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (!response.ok) throw new Error();
      setConnectionError('');
      setOffline(false);
      window.dispatchEvent(new Event('gtt:retry'));
    } catch { setConnectionError('Die Verbindung ist noch nicht verfügbar. Bitte versuche es später erneut.'); }
    finally { setChecking(false); }
  };

  const update = () => {
    setUpdating(true);
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  };

  const canUpdate = pathname !== '/play' && pathname !== '/online' && pathname !== '/auth' && pathname !== '/tutorial';
  if (!offline && !connectionError && (!waitingWorker || !canUpdate)) return null;
  return <div className="app-status" role="status" aria-live="polite">
    {(offline || connectionError) && <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-gray-200">{offline ? 'Du bist offline. Dein gespeichertes Spiel bleibt auf diesem Gerät erhalten.' : connectionError}</p>
      <button onClick={() => void retry()} disabled={checking || offline} className="min-h-11 rounded-lg bg-green-500 px-4 text-sm font-bold text-black disabled:opacity-50">{checking ? 'Verbindung prüfen…' : 'Erneut versuchen'}</button>
    </div>}
    {waitingWorker && canUpdate && <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
      <p className="text-sm text-gray-200">Eine neue Version ist verfügbar.</p>
      <button onClick={update} disabled={updating} className="min-h-11 rounded-lg border border-green-500/40 px-4 text-sm text-green-300">{updating ? 'Wird aktualisiert…' : 'Jetzt aktualisieren'}</button>
    </div>}
  </div>;
}
