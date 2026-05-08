import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { users, saveUsers } from '../data/store';

/**
 * pushService — Web Push notifications via the standard VAPID protocol.
 *
 * On startup we either pull VAPID keys from env (production / Fly secrets)
 * or generate a fresh pair the first time the server boots and persist
 * them to data/vapid.json so they survive restarts. This keeps the dev
 * loop frictionless while still allowing prod to lock the keys to its
 * own VAPID identity via env.
 *
 * Subscriptions are stashed on the user profile under `pushSubscriptions`
 * — a list of PushSubscription JSON blobs (one per device the user
 * granted permission on). Stale subscriptions (410 Gone) are auto-pruned
 * the next time we try to send to them.
 */

interface VapidKeys { publicKey: string; privateKey: string }

const DATA_DIR = path.resolve(process.cwd(), 'data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');

let vapid: VapidKeys | null = null;

function loadOrCreateVapid(): VapidKeys {
  if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
    return { publicKey: process.env.VAPID_PUBLIC, privateKey: process.env.VAPID_PRIVATE };
  }
  if (fs.existsSync(VAPID_FILE)) {
    try { return JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')); }
    catch { /* fall through to regen */ }
  }
  const fresh = webpush.generateVAPIDKeys();
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(VAPID_FILE, JSON.stringify(fresh, null, 2), 'utf8');
  return fresh;
}

export function initPushService(): void {
  vapid = loadOrCreateVapid();
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@check-web.fly.dev',
    vapid.publicKey,
    vapid.privateKey,
  );
}

/** Public VAPID key, exposed via /api/push/public-key so the client can
 *  pass it to PushManager.subscribe(). */
export function getPublicKey(): string {
  if (!vapid) throw new Error('pushService not initialised');
  return vapid.publicKey;
}

/** Add a new push subscription for `uid`, deduped by endpoint. */
export function addSubscription(uid: string, sub: any): void {
  const u: any = users.get(uid);
  if (!u) return;
  if (!u.pushSubscriptions) u.pushSubscriptions = [];
  const existing = u.pushSubscriptions.find((s: any) => s.endpoint === sub.endpoint);
  if (existing) return;
  u.pushSubscriptions.push(sub);
  saveUsers();
}

export function removeSubscription(uid: string, endpoint: string): void {
  const u: any = users.get(uid);
  if (!u?.pushSubscriptions) return;
  const before = u.pushSubscriptions.length;
  u.pushSubscriptions = u.pushSubscriptions.filter((s: any) => s.endpoint !== endpoint);
  if (u.pushSubscriptions.length !== before) saveUsers();
}

/** Send a push notification to every subscription registered for `uid`.
 *  Auto-prunes 404/410 (stale / unsubscribed) endpoints on failure. */
export async function pushTo(
  uid: string,
  title: string,
  body: string,
  data?: { url?: string; tag?: string },
): Promise<void> {
  const u: any = users.get(uid);
  if (!u?.pushSubscriptions?.length) return;
  const payload = JSON.stringify({
    title,
    body,
    icon: '/favicon-192.png',
    badge: '/favicon-192.png',
    url: data?.url || '/home',
    tag: data?.tag || 'check-game',
  });
  const results = await Promise.allSettled(
    u.pushSubscriptions.map((sub: any) => webpush.sendNotification(sub, payload).catch((err: any) => Promise.reject({ sub, err }))),
  );
  let pruned = false;
  for (const r of results) {
    if (r.status === 'rejected') {
      const code = r.reason?.err?.statusCode;
      if (code === 404 || code === 410) {
        u.pushSubscriptions = u.pushSubscriptions.filter((s: any) => s.endpoint !== r.reason.sub.endpoint);
        pruned = true;
      }
    }
  }
  if (pruned) saveUsers();
}
