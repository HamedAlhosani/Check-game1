import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { soundService } from '../../services/sound.service';
import type { UserProfile } from '@check-game/shared';

/**
 * Two-in-one referral card:
 *   • Top: your code + share button — anyone you give it to gets 1000 coins
 *     (and you do too) when they redeem it
 *   • Bottom: input for redeeming a friend's code (one-time)
 *
 * The user's "have I redeemed yet" state lives on profile.referredBy.
 */
export function ReferralCard({ lang, myUid }: { lang: string; myUid?: string }) {
  const { profile, setProfile } = useAuthStore();
  const { addToast } = useUiStore();
  const [code, setCode] = useState<string | null>(null);
  const [redeemInput, setRedeemInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const alreadyRedeemed = !!(profile as any)?.referredBy;
  const referralsCount = (profile as any)?.referralsCount || 0;

  useEffect(() => {
    apiClient.get<{ code: string }>('/api/referral/code')
      .then(r => setCode(r.code))
      .catch(() => null);
  }, [myUid]);

  function copy() {
    if (!code) return;
    soundService.playClick();
    navigator.clipboard?.writeText(code).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (!code) return;
    soundService.playClick();
    const url = `${window.location.origin}/?ref=${code}`;
    const text = lang === 'ar'
      ? `سجّل في لعبة Check بكودي ${code} وكل واحد منا ياخذ 1000 كوينز 🪙\n${url}`
      : `Sign up to Check with my code ${code} and we each get 1000 coins 🪙\n${url}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Check Game', text, url }); return; }
      catch { /* user cancelled — fall through to copy */ }
    }
    navigator.clipboard?.writeText(text).catch(() => null);
    addToast(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied', 'success');
  }

  async function redeem() {
    if (!redeemInput.trim() || busy) return;
    const code = redeemInput.trim().toUpperCase();
    soundService.playClick();
    setRedeemInput('');

    // Optimistic update — flip the UI immediately so the user sees the
    // 1,000 coins + "redeemed" state without waiting for the network.
    // Snapshot the previous profile so we can roll back on failure.
    const previousProfile = profile;
    if (profile) {
      setProfile({
        ...profile,
        referredBy: 'pending',
        coins: (profile.coins || 0) + 1000,
      } as any);
      soundService.playCoins();
      addToast(lang === 'ar' ? `+1,000 كوينز 🎉` : `+1,000 coins 🎉`, 'success');
    }

    setBusy(true);
    try {
      const res = await apiClient.post<{ profile: UserProfile; granted: number }>('/api/referral/redeem', { code });
      if (res?.profile) setProfile(res.profile);
    } catch (e: any) {
      // Roll back the optimistic update.
      if (previousProfile) setProfile(previousProfile);
      soundService.playError();
      addToast(e?.message || (lang === 'ar' ? 'كود غير صالح' : 'Invalid code'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border p-5 space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(232,201,122,0.08) 0%, rgba(120,80,20,0.04) 100%)',
        borderColor: 'rgba(232,201,122,0.30)',
      }}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="font-arabic font-bold flex items-center gap-2"
          style={{ fontSize: 15, color: '#FFE07A' }}>
          🎫 {lang === 'ar' ? 'ادعُ صديقاً — كلاكما يربح' : 'Invite a friend — both win'}
        </h3>
        {referralsCount > 0 && (
          <span className="font-arabic" style={{ fontSize: 11, color: 'rgba(232,201,122,0.7)' }}>
            {lang === 'ar' ? `${referralsCount} صديق انضم` : `${referralsCount} friends joined`}
          </span>
        )}
      </div>
      <p className="font-arabic" style={{ fontSize: 11.5, color: 'rgba(245,230,200,0.6)', lineHeight: 1.7 }}>
        {lang === 'ar'
          ? 'شارك كودك مع صديق. لما يسجّل ويستخدم كودك، أنتما الاثنان تأخذان 1,000 كوينز 🪙'
          : 'Share your code. When a friend signs up and uses it, you each get 1,000 coins 🪙'}
      </p>

      {/* My code + share */}
      <div className="rounded-xl p-3 flex items-center gap-2"
        style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(232,201,122,0.35)' }}>
        <div className="flex-1">
          <p className="font-arabic" style={{ fontSize: 10, color: 'rgba(245,230,200,0.5)' }}>
            {lang === 'ar' ? 'كودك' : 'Your code'}
          </p>
          <p className="font-mono font-bold tracking-widest"
            style={{ fontSize: 18, color: '#FFE07A', letterSpacing: 3 }}>
            {code || '— — — —'}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={copy}
          className="rounded-lg px-3 py-2 font-arabic font-bold"
          style={{
            background: copied ? 'rgba(80,200,120,0.20)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${copied ? 'rgba(80,200,120,0.45)' : 'rgba(232,201,122,0.30)'}`,
            color: copied ? '#80E0A0' : 'rgba(245,230,200,0.75)',
            fontSize: 11,
          }}>
          {copied ? '✓' : (lang === 'ar' ? 'نسخ' : 'Copy')}
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={share}
          className="rounded-lg px-3 py-2 font-arabic font-bold"
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #A07830)',
            color: '#0E0905', fontSize: 11,
          }}>
          {lang === 'ar' ? 'شارك' : 'Share'}
        </motion.button>
      </div>

      {/* Redeem someone else's code */}
      {!alreadyRedeemed ? (
        <div>
          <p className="font-arabic mb-1.5" style={{ fontSize: 11, color: 'rgba(245,230,200,0.55)' }}>
            🎁 {lang === 'ar' ? 'عندك كود صديق؟ استخدمه مرة واحدة' : 'Got a friend\'s code? Use it once'}
          </p>
          <div className="flex gap-2">
            <input
              value={redeemInput}
              onChange={e => setRedeemInput(e.target.value.toUpperCase())}
              placeholder={lang === 'ar' ? 'كود الصديق' : 'Friend code'}
              className="flex-1 px-3 py-2 rounded-lg font-mono"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(232,201,122,0.30)',
                color: '#FFE07A', fontSize: 13, letterSpacing: 2,
              }}/>
            <motion.button whileTap={{ scale: 0.95 }} onClick={redeem}
              disabled={busy || !redeemInput.trim()}
              className="rounded-lg px-4 font-arabic font-bold disabled:opacity-50"
              style={{ background: 'rgba(232,201,122,0.20)', color: '#FFE07A', border: '1px solid rgba(232,201,122,0.45)', fontSize: 12 }}>
              {busy ? '...' : (lang === 'ar' ? 'استخدم' : 'Redeem')}
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg px-3 py-2 font-arabic"
          style={{ background: 'rgba(80,200,120,0.08)', border: '1px solid rgba(80,200,120,0.25)', color: 'rgba(80,200,120,0.85)', fontSize: 11.5 }}>
          ✓ {lang === 'ar' ? 'استخدمت كود صديق من قبل — لا تستطيع الاستفادة منه مرة ثانية' : 'Already redeemed a code — one-time only'}
        </div>
      )}
    </div>
  );
}
