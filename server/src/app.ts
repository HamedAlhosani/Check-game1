import express from 'express';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken, signToken, hashPassword, comparePassword } from './services/localAuth';
import { credentials, saveCredentials } from './data/store';
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
  sendFriendRequest,
  acceptFriendRequest,
  declineOrRemoveFriend,
  getFriendsList,
  getFriendRequests,
  getUserHistory,
} from './services/firestoreService';
import { STORE_ITEMS } from '@check-game/shared';

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
  res.json({ ok: true });
}));

app.post('/api/friends/accept', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).uid;
  const { uid: friendUid } = req.body;
  if (!friendUid) return res.status(400).json({ error: 'Missing uid' });
  const result = await acceptFriendRequest(uid, friendUid);
  if (!result.ok) return res.status(400).json({ error: result.error });
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
