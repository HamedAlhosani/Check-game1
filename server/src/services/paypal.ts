import crypto from 'node:crypto';

/**
 * PayPal Orders v2 integration. Lets individuals (no trade license) accept
 * payments — works in UAE without a business entity, unlike Stripe / Lemon
 * Squeezy which both require a registered company.
 *
 * Flow:
 *   1. client POSTs /api/payments/checkout { packId } → we create a PayPal
 *      order via REST and return the approve URL
 *   2. client redirects to the approve URL → user pays on paypal.com
 *   3. PayPal redirects back to /store?paid=1&token=<ORDER_ID>
 *   4. client POSTs /api/payments/capture { orderId } → we capture the
 *      order via REST, read uid+packId from custom_id, credit the coins
 *
 * Env vars (set with `fly secrets set` once you have them from PayPal):
 *   PAYPAL_CLIENT_ID       — REST API client id
 *   PAYPAL_CLIENT_SECRET   — REST API secret
 *   PAYPAL_MODE            — 'live' (default) or 'sandbox' for testing
 *   PAYPAL_WEBHOOK_ID      — optional, for verifying inbound webhooks
 *   PUBLIC_BASE_URL        — defaults to https://check-web.fly.dev
 */

export interface CoinPack {
  id: string;        // internal pack id ('pkg_1000' etc.)
  coins: number;     // coins granted on success
  priceUsd: number;  // price charged via PayPal
  label: string;     // display label
}

// One source of truth for the four packs the store sells.
export const COIN_PACKS: CoinPack[] = [
  { id: 'pkg_1000',  coins: 1000,  priceUsd: 1.5,  label: 'صغيرة 🥉' },
  { id: 'pkg_5000',  coins: 5000,  priceUsd: 5,    label: 'متوسطة 🥈' },
  { id: 'pkg_15000', coins: 15000, priceUsd: 12,   label: 'كبيرة 🥇' },
  { id: 'pkg_50000', coins: 50000, priceUsd: 35,   label: 'أسطورية 💎' },
];

export function packById(packId: string): CoinPack | undefined {
  return COIN_PACKS.find(p => p.id === packId);
}

function apiBase(): string {
  return (process.env.PAYPAL_MODE || 'live').toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

function publicBase(): string {
  return process.env.PUBLIC_BASE_URL || 'https://check-web.fly.dev';
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** OAuth client-credentials flow — cached until ~30s before expiry. */
async function getAccessToken(): Promise<string> {
  const id     = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal not configured (missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET)');

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token failed: ${res.status} ${text}`);
  }
  const json: any = await res.json();
  cachedToken = {
    value:     json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/**
 * Create a PayPal order and return the approve URL the user gets redirected
 * to. We stash uid+packId in custom_id so capture can credit the right user.
 */
export async function createOrder(opts: { uid: string; pack: CoinPack }): Promise<string> {
  const token = await getAccessToken();
  const body = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: opts.pack.id,
      // PayPal lets us round-trip an opaque string of up to 127 chars
      custom_id: `${opts.uid}|${opts.pack.id}`,
      description: `Check Coins: ${opts.pack.coins.toLocaleString()}`,
      amount: {
        currency_code: 'USD',
        value: opts.pack.priceUsd.toFixed(2),
      },
    }],
    application_context: {
      brand_name:   'Check Game',
      user_action:  'PAY_NOW',
      shipping_preference: 'NO_SHIPPING',
      // PayPal appends ?token=<ORDER_ID>&PayerID=... when the user finishes
      return_url: `${publicBase()}/store?paid=1`,
      cancel_url: `${publicBase()}/store?cancelled=1`,
    },
  };

  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal createOrder failed: ${res.status} ${text}`);
  }
  const json: any = await res.json();
  const approve = (json.links || []).find((l: any) => l.rel === 'approve');
  if (!approve?.href) throw new Error('PayPal returned no approve link');
  return approve.href;
}

export interface CaptureResult {
  ok: boolean;
  uid?: string;
  packId?: string;
  reason?: string;
}

/**
 * Capture a previously-approved order. Returns { uid, packId } from
 * custom_id so the caller can grant coins. Idempotent on PayPal's side —
 * a second capture of the same order returns 422 with ORDER_ALREADY_CAPTURED
 * which we treat as success (so the user can refresh /store?paid=1 safely).
 */
export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  });

  if (res.status === 422) {
    const json: any = await res.json().catch(() => ({}));
    const alreadyCaptured = (json?.details || []).some((d: any) => d.issue === 'ORDER_ALREADY_CAPTURED');
    if (alreadyCaptured) {
      // Order is already paid — fetch it so we can still pull custom_id.
      return await fetchOrder(orderId);
    }
    return { ok: false, reason: `Capture failed: ${JSON.stringify(json)}` };
  }
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `Capture failed: ${res.status} ${text}` };
  }

  const json: any = await res.json();
  const status = json.status;
  if (status !== 'COMPLETED') return { ok: false, reason: `Order status ${status}` };

  const unit  = (json.purchase_units || [])[0];
  const cap   = (unit?.payments?.captures || [])[0];
  const custom = cap?.custom_id || unit?.custom_id;
  return parseCustomId(custom);
}

async function fetchOrder(orderId: string): Promise<CaptureResult> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `fetchOrder failed: ${res.status} ${text}` };
  }
  const json: any = await res.json();
  if (json.status !== 'COMPLETED') return { ok: false, reason: `Order status ${json.status}` };
  const unit  = (json.purchase_units || [])[0];
  const cap   = (unit?.payments?.captures || [])[0];
  return parseCustomId(cap?.custom_id || unit?.custom_id);
}

function parseCustomId(custom?: string): CaptureResult {
  if (!custom) return { ok: false, reason: 'Missing custom_id' };
  const [uid, packId] = custom.split('|');
  if (!uid || !packId) return { ok: false, reason: 'Bad custom_id format' };
  return { ok: true, uid, packId };
}

/**
 * Verify a PayPal webhook by calling their verify-webhook-signature endpoint.
 * Used as a backup credit path — the primary flow is the synchronous capture
 * call from the redirect handler, but webhooks catch payments where the user
 * closed their browser before being redirected back.
 */
export async function verifyWebhook(opts: {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const token = await getAccessToken();

  const h = (k: string) => {
    const v = opts.headers[k.toLowerCase()] || opts.headers[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const body = {
    transmission_id:    h('paypal-transmission-id'),
    transmission_time:  h('paypal-transmission-time'),
    cert_url:           h('paypal-cert-url'),
    auth_algo:          h('paypal-auth-algo'),
    transmission_sig:   h('paypal-transmission-sig'),
    webhook_id:         webhookId,
    webhook_event:      JSON.parse(opts.rawBody),
  };

  const res = await fetch(`${apiBase()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return false;
  const json: any = await res.json();
  return json?.verification_status === 'SUCCESS';
}

/** Pull { uid, packId } out of a webhook payload's custom_id. */
export function customFromWebhook(payload: any): CaptureResult {
  const resource = payload?.resource;
  // PAYMENT.CAPTURE.COMPLETED → resource.custom_id
  // CHECKOUT.ORDER.APPROVED   → resource.purchase_units[0].custom_id
  const custom = resource?.custom_id
              ?? resource?.purchase_units?.[0]?.custom_id;
  return parseCustomId(custom);
}

// Re-exported so app.ts can use the same crypto-safe compare elsewhere.
export const _safeEqual = crypto.timingSafeEqual;
