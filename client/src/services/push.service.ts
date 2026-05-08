import { apiClient } from './api.service';

/**
 * push.service — wraps the browser Push subscription flow so the rest
 * of the app can call enable / disable / check-status without touching
 * the SW + PushManager API directly.
 *
 * Flow:
 *   1. registerSW() — installs sw.js (idempotent).
 *   2. Notification.requestPermission() — user-gesture-gated.
 *   3. PushManager.subscribe with the server's VAPID public key.
 *   4. POST /api/push/subscribe — server stashes the subscription on
 *      the user profile. Future server-side pushTo(uid, ...) fires
 *      to every device the user opted in on.
 *
 * Silently no-ops on browsers without push support (older Safari, etc).
 */

const STORAGE_KEY = 'check.pushOptIn';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const pushService = {
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  permission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  async registerSW(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    try { return await navigator.serviceWorker.register('/sw.js'); }
    catch { return null; }
  },

  /**
   * Asks the user for notification permission and subscribes to push.
   * Returns true on success. Safe to re-call — already-subscribed
   * users are detected and POSTed again so the server keeps the latest.
   */
  async enable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const reg = await this.registerSW();
    if (!reg) return false;

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    const { publicKey } = await apiClient.get<{ publicKey: string }>('/api/push/public-key');
    if (!publicKey) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
      });
    }

    await apiClient.post('/api/push/subscribe', { subscription: sub.toJSON() });
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
    return true;
  },

  async disable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      try { await apiClient.post('/api/push/unsubscribe', { endpoint: sub.endpoint }); } catch { /* noop */ }
      try { await sub.unsubscribe(); } catch { /* noop */ }
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    return true;
  },

  /** Was the user ever opted-in on this device? Used to decide whether
   *  to silently re-sync on app start. */
  isOptedIn(): boolean {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  },
};
