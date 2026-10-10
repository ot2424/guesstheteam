import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './api';
import { ApiError, ConnectionError } from './apiErrors';

describe('API connection handling', () => {
  beforeEach(() => {
    const events = new EventTarget();
    vi.stubGlobal('window', { setTimeout, clearTimeout, dispatchEvent: events.dispatchEvent.bind(events) });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('keeps API validation errors distinct from connectivity errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Ungültiger Link' }), { status: 400 })));
    await expect(request('/auth/reset-password')).rejects.toBeInstanceOf(ApiError);
  });
  it('reports a broken connection and never automatically repeats a write', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    await expect(request('/game/finish', { method: 'POST' })).rejects.toBeInstanceOf(ConnectionError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('preserves caller cancellation instead of reporting a connection failure', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    await expect(request('/players/search', { signal: controller.signal })).rejects.toHaveProperty('name', 'AbortError');
  });
});
