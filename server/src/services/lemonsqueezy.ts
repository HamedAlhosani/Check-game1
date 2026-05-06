import crypto from 'node:crypto';

/**
 * Lemon Squeezy integration — Merchant of Record provider.
 * Lets us sell coin packs to users without owning a business entity.
 *
 * Environment variables (set with `fly secrets set` once you have them):
 *   LEMON_API_KEY          — long JWT-style API key from Settings → API
 *   LEMON_STORE_ID         — numeric store ID from Settings → Stores
 *   LEMON_WEBHOOK_SECRET   — signing secret you set when creating the webhook
 *
 * Variant IDs are mapped per coin pack below — replace these with your
 * real variant IDs from the Lemon Squeezy dashboard once products exist.
 */

export interface CoinPack {
  id: string;            // internal package id (e.g. 'pkg_1000')
  variantId: string;     // Lemon Squeezy variant id
  coins: number;         // coins granted on success
  priceUsd: number;      // for display only
  label: string;         // for display
}

// Update the variantId values once products are created on Lemon Squeezy.
export const COIN_PACKS: CoinPack[] = [
  { id: 'pkg_1000',  variantId: process.env.LEMON_VARIANT_1000  || '',  coins: 1000,  priceUsd: 1.5,  label: 'صغيرة 🥉' },
  { id: 'pkg_5000',  variantId: process.env.LEMON_VARIANT_5000  || '',  coins: 5000,  priceUsd: 5,    label: 'متوسطة 🥈' },
  { id: 'pkg_15000', variantId: process.env.LEMON_VARIANT_15000 || '',  coins: 15000, priceUsd: 12,   label: 'كبيرة 🥇' },
  { id: 'pkg_50000', variantId: process.env.LEMON_VARIANT_50000 || '',  coins: 50000, priceUsd: 35,   label: 'أسطورية 💎' },
];

export function packForVariant(variantId: string): CoinPack | undefined {
  return COIN_PACKS.find(p => p.variantId === variantId);
}
export function packById(packId: string): CoinPack | undefined {
  return COIN_PACKS.find(p => p.id === packId);
}

const API = 'https://api.lemonsqueezy.com/v1';

/**
 * Create a hosted Checkout URL the user can be redirected to. Once they
 * complete payment, Lemon Squeezy fires our webhook with their uid in
 * `custom_data` so we can credit the right account.
 */
export async function createCheckoutUrl(opts: {
  uid: string;
  email?: string | null;
  pack: CoinPack;
}): Promise<string> {
  const apiKey   = process.env.LEMON_API_KEY;
  const storeId  = process.env.LEMON_STORE_ID;
  if (!apiKey || !storeId)   throw new Error('Lemon Squeezy not configured (missing LEMON_API_KEY or LEMON_STORE_ID)');
  if (!opts.pack.variantId)  throw new Error(`No variantId for pack ${opts.pack.id}`);

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        // Pass uid + packId so the webhook can verify which user gets credited
        checkout_data: {
          email: opts.email || undefined,
          custom: { uid: opts.uid, pack_id: opts.pack.id },
        },
        product_options: {
          // Where to send the user after a successful payment
          redirect_url: `${process.env.PUBLIC_BASE_URL || 'https://check-web.fly.dev'}/store?paid=1`,
        },
      },
      relationships: {
        store:   { data: { type: 'stores',          id: storeId } },
        variant: { data: { type: 'variants',        id: opts.pack.variantId } },
      },
    },
  };

  const res = await fetch(`${API}/checkouts`, {
    method: 'POST',
    headers: {
      'Accept':        'application/vnd.api+json',
      'Content-Type':  'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy checkout failed: ${res.status} ${text}`);
  }
  const json: any = await res.json();
  const url = json?.data?.attributes?.url;
  if (!url) throw new Error('Lemon Squeezy returned no checkout URL');
  return url;
}

/**
 * Verify the X-Signature HMAC on an incoming webhook so we know the
 * request actually came from Lemon Squeezy and wasn't spoofed.
 */
export function verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.LEMON_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(typeof rawBody === 'string' ? rawBody : rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(signatureHeader, 'utf8'));
  } catch {
    return false;
  }
}

/** Extract { uid, packId } that we attached to the checkout's custom_data. */
export function extractCustomData(payload: any): { uid?: string; packId?: string } {
  const meta = payload?.meta?.custom_data || payload?.data?.attributes?.first_order_item?.product_options?.custom_data;
  return { uid: meta?.uid, packId: meta?.pack_id };
}
