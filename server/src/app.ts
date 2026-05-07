import express from 'express';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken, signToken, hashPassword, comparePassword } from './services/localAuth';
import { credentials, saveCredentials } from './data/store';
import { COIN_PACKS, packById, createOrder, captureOrder, verifyWebhook, customFromWebhook } from './services/paypal';
import {
  createUserProfile,
  getUserProfile,
  updateProfileName,
  updateProfileAvatar,
  markRulesSeen,
  getLeaderboard,
  purchaseItem,
  equipItem,
  rechargeCoins,
  getDailyReward,
  claimDailyReward,
  getProgression,
  claimMission,
  claimAchievement,
  claimLevelReward,
  getWheelStatus,
  spinWheel,
  getReferralCode,
  redeemReferral,
  openChest,
  getChestStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineOrRemoveFriend,
  getFriendsList,
  getFriendRequests,
  getUserHistory,
} from './services/firestoreService';
import { STORE_ITEMS, SOCKET_EVENTS } from '@check-game/shared';
import {
  listClans, getClan, getMyClan, getMyInvites,
  createClan, editClan, deleteClan, leaveClan,
  applyToClan, acceptApplication, rejectApplication,
  inviteToClan, declineInvite, acceptInvite,
  kickMember, setRole, transferLeader,
} from './services/clanService';
import { notifyUser } from './socket/notifications';

const app = express();
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true
    : (process.env.CLIENT_URL || 'http://localhost:5173'),
}));
app.use(express.json());

function wrap(fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  (req as any).uid = payload.uid;
  next();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', wrap(async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) return res.status(400).json({ error: 'Missing fields' });

  const emailKey = email.toLowerCase().trim();
  if (credentials.has(emailKey)) return res.status(409).json({ error: 'Email already in use' });

  const uid = uuidv4();
  const passwordHash = await hashPassword(password);
  credentials.set(emailKey, { uid, passwordHash });
  saveCredentials();

  await createUserProfile(uid, displayName, emailKey);
  const token = signToken(uid);
  res.json({ token, uid });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const emailKey = email.toLowerCase().trim();
  const cred = credentials.get(emailKey);
  if (!cred) return res.status(401).json({ error: 'Email not found' });

  const ok = await comparePassword(password, cred.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Wrong password' });

  const token = signToken(cred.uid);
  res.json({ token, uid: cred.uid });
}));

app.post('/api/auth/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Missing token' });

  try {
    const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!gRes.ok) return res.status(401).json({ error: 'Invalid Google token' });

    const g = await gRes.json() as { sub: string; email: string; name: string; aud: string };
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && g.aud !== clientId) return res.status(401).json({ error: 'Token mismatch' });

    const googleKey = `google:${g.sub}`;
    const emailKey = (g.email || '').toLowerCase();

    let uid: string;

    const gCred = credentials.get(googleKey);
    if (gCred) {
      uid = gCred.uid;
    } else {
      const eCred = credentials.get(emailKey);
      if (eCred) {
        uid = eCred.uid;
        credentials.set(googleKey, { uid, passwordHash: '' });
        saveCredentials();
      } else {
        uid = uuidv4();
        const displayName = g.name || emailKey.split('@')[0];
        credentials.set(emailKey, { uid, passwordHash: '' });
        credentials.set(googleKey, { uid, passwordHash: '' });
        saveCredentials();
        await createUserProfile(uid, displayName, emailKey);
      }
    }

    const profile = await getUserProfile(uid);
    const token = signToken(uid);
    res.json({ token, uid, email: profile?.email, displayName: profile?.displayName });
  } catch {
    res.status(500).json({ error: 'Google auth failed' });
  }
});

app.post('/api/auth/change-password', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { currentPassword, newPassword } = req.body;

  const profile = await getUserProfile(uid);
  if (!profile) return res.status(404).json({ error: 'User not found' });

  const emailKey = profile.email.toLowerCase();
  const cred = credentials.get(emailKey);
  if (!cred) return res.status(404).json({ error: 'Credentials not found' });

  const ok = await comparePassword(currentPassword, cred.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Wrong current password' });

  cred.passwordHash = await hashPassword(newPassword);
  saveCredentials();
  res.json({ ok: true });
}));

// ── Profile ────────────────────────────────────────────────────────────────────

app.post('/api/profile', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { displayName, email } = req.body;
  let profile = await getUserProfile(uid);
  if (!profile) {
    await createUserProfile(uid, displayName || 'لاعب', email || '');
    profile = await getUserProfile(uid);
  }
  res.json(profile);
}));

app.get('/api/profile', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const profile = await getUserProfile(uid);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json(profile);
}));

// Public profile (read-only, sensitive fields stripped) — used to view another user's profile
app.get('/api/profile/:uid', requireAuth, wrap(async (req, res) => {
  const viewerUid = (req as any).uid;
  const profile = await getUserProfile(req.params.uid);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  const p = profile as any;

  // Clan info — show which clan they belong to (empty if none)
  let clan: { id: string; name: string; tag: string; emblem: string } | null = null;
  if (p.clanId) {
    const c = getClan(p.clanId);
    if (c) clan = { id: c.id, name: c.name, tag: c.tag, emblem: c.emblem };
  }

  // Friend status from the viewer's perspective
  type FriendStatus = 'self' | 'friends' | 'requested_by_me' | 'requested_by_them' | 'none';
  let friendStatus: FriendStatus = 'none';
  if (viewerUid === p.uid) {
    friendStatus = 'self';
  } else {
    const viewer = (await getUserProfile(viewerUid)) as any;
    if (viewer?.friends?.includes(p.uid)) friendStatus = 'friends';
    else if (viewer?.friendRequests?.includes(p.uid)) friendStatus = 'requested_by_them';
    else if ((p.friendRequests || []).includes(viewerUid)) friendStatus = 'requested_by_me';
  }

  res.json({
    uid: p.uid,
    username: p.username,
    displayName: p.displayName,
    avatarId: p.avatarId,
    equippedItems: p.equippedItems,
    ranking: p.ranking,
    stats: p.stats,
    clan,
    friendStatus,
  });
}));

app.patch('/api/profile', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { displayName, avatarId } = req.body;
  if (displayName) await updateProfileName(uid, displayName);
  if (avatarId) await updateProfileAvatar(uid, avatarId);
  const profile = await getUserProfile(uid);
  res.json(profile);
}));

app.post('/api/profile/rules-seen', requireAuth, wrap(async (req, res) => {
  await markRulesSeen((req as any).uid);
  res.json({ ok: true });
}));

// ── Leaderboard ────────────────────────────────────────────────────────────────

app.get('/api/leaderboard', wrap(async (_req, res) => {
  const entries = await getLeaderboard(50);
  res.json(entries);
}));

// ── Store ──────────────────────────────────────────────────────────────────────

app.get('/api/store/items', (_req, res) => {
  res.json(STORE_ITEMS);
});

app.post('/api/store/purchase', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Missing itemId' });
  const result = await purchaseItem(uid, itemId);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, coins: result.coins, profile });
}));

app.patch('/api/store/equip', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Missing itemId' });
  const result = await equipItem(uid, itemId);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, profile });
}));

app.post('/api/store/recharge', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { packageId } = req.body;
  if (!packageId) return res.status(400).json({ error: 'Missing packageId' });
  const result = await rechargeCoins(uid, packageId);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, coins: result.coins, granted: result.granted, profile });
}));

// ── Real-money coin purchases via PayPal ────────────────────────────────────
// Public list of packs the client can show in the store
app.get('/api/payments/packs', (_req, res) => {
  res.json(COIN_PACKS.map(p => ({ id: p.id, coins: p.coins, priceUsd: p.priceUsd, label: p.label })));
});

// Step 1: create a PayPal order and return the approve URL. The client just
// sets window.location to the returned url; PayPal then redirects the user
// back to /store?paid=1&token=<ORDER_ID> after they finish paying.
app.post('/api/payments/checkout', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { packId } = req.body || {};
  const pack = packId ? packById(packId) : undefined;
  if (!pack) return res.status(400).json({ error: 'Unknown coin pack' });
  try {
    const url = await createOrder({ uid, pack });
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Checkout failed' });
  }
}));

// Step 2: client calls this with the orderId from the redirect query string.
// We capture the order on PayPal's side and credit the coins. Idempotent —
// safe for the user to refresh /store?paid=1 multiple times.
app.post('/api/payments/capture', requireAuth, wrap(async (req, res) => {
  const callerUid = (req as any).uid;
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });
  try {
    const cap = await captureOrder(String(orderId));
    if (!cap.ok || !cap.uid || !cap.packId) {
      return res.status(400).json({ error: cap.reason || 'Capture failed' });
    }
    // Defence in depth — only credit the user that actually started the order.
    if (cap.uid !== callerUid) return res.status(403).json({ error: 'UID mismatch' });
    const pack = packById(cap.packId);
    if (!pack) return res.status(400).json({ error: 'Unknown pack in order' });
    const result = await rechargeCoins(cap.uid, pack.id);
    if (!result.ok) return res.status(500).json({ error: result.error });
    const profile = await getUserProfile(cap.uid);
    res.json({ ok: true, granted: result.granted, coins: result.coins, profile });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Capture failed' });
  }
}));

// Backup credit path. PayPal fires this on PAYMENT.CAPTURE.COMPLETED — used
// for users who closed their browser before being redirected back from PayPal.
// The synchronous /capture above handles the happy path; this catches stragglers.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), wrap(async (req, res) => {
  const rawBody = (req.body as Buffer).toString('utf8');
  const verified = await verifyWebhook({ headers: req.headers as any, rawBody });
  if (!verified) return res.status(401).json({ error: 'Invalid signature' });

  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const eventType = payload?.event_type;
  if (eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
    return res.json({ ok: true, ignored: eventType });
  }

  const { uid, packId } = customFromWebhook(payload);
  if (!uid || !packId) return res.status(400).json({ error: 'Missing custom_id' });
  const pack = packById(packId);
  if (!pack) return res.status(400).json({ error: 'Unknown pack' });

  const result = await rechargeCoins(uid, pack.id);
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json({ ok: true, granted: result.granted, coins: result.coins });
}));

// ── Progression: missions / achievements / level rewards ──────────────────
app.get('/api/progression', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const data = await getProgression(uid);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
}));

app.post('/api/progression/missions/claim', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });
  const result = await claimMission(uid, id);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, granted: result.granted, coins: result.coins, profile });
}));

app.post('/api/progression/achievements/claim', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });
  const result = await claimAchievement(uid, id);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, granted: result.granted, coins: result.coins, profile });
}));

app.post('/api/progression/levels/claim', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { level } = req.body || {};
  if (typeof level !== 'number') return res.status(400).json({ error: 'Missing level' });
  const result = await claimLevelReward(uid, level);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, granted: result.granted, coins: result.coins, itemGranted: result.itemGranted, profile });
}));

// ── Lucky Wheel ────────────────────────────────────────────────────────────
app.get('/api/wheel/status', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  res.json(await getWheelStatus(uid));
}));

app.post('/api/wheel/spin', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const result = await spinWheel(uid);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ...result, profile });
}));

// ── Friend Referral ────────────────────────────────────────────────────────
app.get('/api/referral/code', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const code = await getReferralCode(uid);
  res.json({ code });
}));

app.post('/api/referral/redeem', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Missing code' });
  const result = await redeemReferral(uid, code.trim().toUpperCase());
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, granted: result.granted, profile });
}));

// ── Treasure Chests ────────────────────────────────────────────────────────
app.get('/api/chests', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  res.json(await getChestStatus(uid));
}));

app.post('/api/chests/open', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { tier } = req.body || {};
  if (!tier) return res.status(400).json({ error: 'Missing tier' });
  const result = await openChest(uid, tier);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ...result, profile });
}));

// ── Clans ──────────────────────────────────────────────────────────────────
app.get('/api/clans', requireAuth, wrap(async (req, res) => {
  res.json(listClans((req as any).uid));
}));

app.get('/api/clans/me', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  res.json({ clan: getMyClan(uid), invites: getMyInvites(uid) });
}));

app.get('/api/clans/:id', requireAuth, wrap(async (req, res) => {
  const c = getClan(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
}));

app.post('/api/clans', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { name, tag, emblem, description, visibility } = req.body || {};
  if (!name || !tag) return res.status(400).json({ error: 'Missing name or tag' });
  const r = await createClan({ founderUid: uid, name, tag, emblem, description, visibility });
  if (!r.ok) return res.status(400).json({ error: r.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, clan: r.clan, profile });
}));

app.patch('/api/clans/:id', requireAuth, wrap(async (req, res) => {
  const r = await editClan((req as any).uid, req.params.id, req.body || {});
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true, clan: r.clan });
}));

app.delete('/api/clans/:id', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const r = await deleteClan(uid, req.params.id);
  if (!r.ok) return res.status(400).json({ error: r.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, profile });
}));

// Apply / withdraw / accept / reject
app.post('/api/clans/:id/apply', requireAuth, wrap(async (req, res) => {
  const r = await applyToClan((req as any).uid, req.params.id, (req.body || {}).message);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true, autoAccepted: r.autoAccepted });
}));

app.post('/api/clans/:id/accept/:targetUid', requireAuth, wrap(async (req, res) => {
  const r = await acceptApplication((req as any).uid, req.params.id, req.params.targetUid);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
}));

app.post('/api/clans/:id/reject/:targetUid', requireAuth, wrap(async (req, res) => {
  const r = await rejectApplication((req as any).uid, req.params.id, req.params.targetUid);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
}));

// Invites — order matters: specific paths must come BEFORE the parameterized
// /invite/:targetUid route, otherwise Express matches "accept"/"decline" as
// a target uid and routes them to inviteToClan (which then 400s with
// "only officers can invite"). That was the real cause of the user's
// "I can't accept or decline my invites" bug.
app.post('/api/clans/:id/invite/accept', requireAuth, wrap(async (req, res) => {
  const r = await acceptInvite((req as any).uid, req.params.id);
  if (!r.ok) return res.status(400).json({ error: r.error });
  const profile = await getUserProfile((req as any).uid);
  res.json({ ok: true, profile });
}));

app.post('/api/clans/:id/invite/decline', requireAuth, wrap(async (req, res) => {
  await declineInvite((req as any).uid, req.params.id);
  res.json({ ok: true });
}));

app.post('/api/clans/:id/invite/:targetUid', requireAuth, wrap(async (req, res) => {
  const r = await inviteToClan((req as any).uid, req.params.id, req.params.targetUid);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
}));

// Member management
app.post('/api/clans/:id/kick/:targetUid', requireAuth, wrap(async (req, res) => {
  const r = await kickMember((req as any).uid, req.params.id, req.params.targetUid);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
}));

app.post('/api/clans/:id/role/:targetUid', requireAuth, wrap(async (req, res) => {
  const { role } = req.body || {};
  const r = await setRole((req as any).uid, req.params.id, req.params.targetUid, role);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
}));

app.post('/api/clans/:id/transfer/:targetUid', requireAuth, wrap(async (req, res) => {
  const r = await transferLeader((req as any).uid, req.params.id, req.params.targetUid);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
}));

app.post('/api/clans/leave', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const r = await leaveClan(uid);
  if (!r.ok) return res.status(400).json({ error: r.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, disbanded: r.disbanded, profile });
}));

// ── Daily reward ───────────────────────────────────────────────────────────────

app.get('/api/daily/status', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const status = await getDailyReward(uid);
  res.json(status);
}));

app.post('/api/daily/claim', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const result = await claimDailyReward(uid);
  if (!result.ok) return res.status(400).json({ error: result.error });
  const profile = await getUserProfile(uid);
  res.json({ ok: true, coins: result.coins, granted: result.granted, nextDay: result.nextDay, profile });
}));

// ── Friends ────────────────────────────────────────────────────────────────────

app.get('/api/friends', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const friends = await getFriendsList(uid);
  res.json(friends);
}));

app.get('/api/friends/requests', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const requests = await getFriendRequests(uid);
  res.json(requests);
}));

app.post('/api/friends/request', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Missing username' });
  const result = await sendFriendRequest(uid, username);
  if (!result.ok) return res.status(400).json({ error: result.error });
  if (result.recipientUid) {
    notifyUser(result.recipientUid, SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, { fromUid: uid });
    notifyUser(result.recipientUid, SOCKET_EVENTS.FRIEND_LIST_CHANGED, {});
  }
  res.json({ ok: true });
}));

app.post('/api/friends/accept', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { uid: friendUid } = req.body;
  if (!friendUid) return res.status(400).json({ error: 'Missing uid' });
  const result = await acceptFriendRequest(uid, friendUid);
  if (!result.ok) return res.status(400).json({ error: result.error });
  notifyUser(friendUid, SOCKET_EVENTS.FRIEND_LIST_CHANGED, {});
  res.json({ ok: true });
}));

app.delete('/api/friends/:friendUid', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { friendUid } = req.params;
  await declineOrRemoveFriend(uid, friendUid);
  res.json({ ok: true });
}));

// ── Match History ──────────────────────────────────────────────────────────────

app.get('/api/history', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const records = await getUserHistory(uid, 20);
  res.json(records);
}));

// ── Static client (production) ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../public');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err?.message || err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

export default app;
