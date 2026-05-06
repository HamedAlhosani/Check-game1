import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api.service';
import { useT, useLang } from '../../i18n/useT';
import { LangToggle } from '../../components/shared/LangToggle';
import { FrameRing } from '../../components/shared/FrameRing';
import { MatchRecord } from '@check-game/shared';
import { ReplayModal } from '../../components/shared/ReplayModal';

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_1: '🦅', avatar_2: '🐪', avatar_3: '🌴', avatar_4: '⚔️',
  avatar_5: '🌙', avatar_6: '⭐', avatar_7: '🏜️', avatar_8: '🌊',
  avatar_9: '🦁', avatar_10: '🔥', avatar_11: '💎', avatar_12: '🎭',
  avatar_13: '⚔️', avatar_14: '⛵', avatar_15: '🧭', avatar_16: '🇦🇪',
};

const GAME_LABELS_AR: Record<string, string> = { check: 'Check', ludo: 'لودو', domino: 'دومنو', jackaro: 'جكارو' };
const GAME_LABELS_EN: Record<string, string> = { check: 'Check', ludo: 'Ludo', domino: 'Domino', jackaro: 'Jackaro' };

export function HistoryPage() {
  const t = useT();
  const lang = useLang();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayRecord, setReplayRecord] = useState<MatchRecord | null>(null);

  useEffect(() => {
    apiClient.get<MatchRecord[]>('/api/history')
      .then(r => setRecords(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myUid = profile?.uid ?? '';

  function timeAgo(ts: number): string {
    const diff = (Date.now() - ts) / 1000;
    if (lang === 'ar') {
      if (diff < 60) return 'الآن';
      if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
      return `${Math.floor(diff / 86400)} يوم`;
    } else {
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    }
  }

  const meLabel = lang === 'ar' ? 'أنت' : 'You';
  const GAME_LABELS = lang === 'ar' ? GAME_LABELS_AR : GAME_LABELS_EN;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #1A1408 0%, #0E0905 100%)', direction: dir }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 border-b border-white/5"
        style={{ background: 'rgba(6,4,15,0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-sand/50 hover:text-gold transition-colors">
          <span className="text-xl">{lang === 'ar' ? '←' : '→'}</span>
          <span className="font-arabic text-sm">{t('back')}</span>
        </button>
        <h1 className="font-display text-xl tracking-widest" style={{ color: '#C9A84C' }}>{t('history_title')}</h1>
        <LangToggle />
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(201,168,76,0.04)' }} />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🃏</p>
            <p className="font-arabic font-bold text-lg" style={{ color: 'rgba(245,230,200,0.5)' }}>{t('history_no_games')}</p>
            <p className="font-arabic text-sm mt-2" style={{ color: 'rgba(245,230,200,0.25)' }}>
              {lang === 'ar' ? 'العب مبارياتك وستظهر هنا' : 'Play games and they will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec, i) => {
              const isWin = rec.winnerId === myUid;
              const sortedPlayers = [...rec.players].sort((a, b) => a.score - b.score);

              return (
                <motion.div
                  key={rec.gameId + i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-2xl overflow-hidden border"
                  style={{
                    borderColor: isWin ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)',
                    background: isWin ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.025)',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm tracking-widest" style={{ color: 'rgba(201,168,76,0.7)' }}>
                        {GAME_LABELS[rec.gameType] || rec.gameType}
                      </span>
                      {rec.players.length > 0 && (
                        <span className="text-xs font-arabic" style={{ color: 'rgba(245,230,200,0.3)' }}>
                          • {rec.players.length} {lang === 'ar' ? 'لاعبين' : 'players'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {myUid && (
                        <span className={`text-xs font-arabic font-bold px-2.5 py-0.5 rounded-full ${
                          isWin ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30' : 'bg-white/5 text-white/30 border border-white/10'
                        }`}>
                          {isWin ? `🏆 ${t('history_win')}` : `← ${t('history_loss')}`}
                        </span>
                      )}
                      <span className="text-xs font-arabic" style={{ color: 'rgba(245,230,200,0.25)' }}>
                        {timeAgo(rec.playedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {sortedPlayers.map(p => {
                        const isThisWinner = p.uid === rec.winnerId;
                        const isMe = p.uid === myUid;
                        return (
                          <div key={p.uid} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                            style={{
                              background: isThisWinner ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${isMe ? 'rgba(201,168,76,0.4)' : isThisWinner ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.07)'}`,
                            }}>
                            <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
                              <div className="rounded-full flex items-center justify-center"
                                style={{ width: 28, height: 28, background: 'rgba(201,168,76,0.08)', fontSize: 16 }}>
                                {AVATAR_EMOJIS[p.avatarId] || '👤'}
                              </div>
                              <FrameRing size={28} frameId={(p as any).equippedFrame}/>
                            </div>
                            <div>
                              <p className="font-arabic text-xs font-bold leading-tight"
                                style={{ color: isThisWinner ? '#E8C97A' : isMe ? 'rgba(201,168,76,0.8)' : 'rgba(245,230,200,0.6)' }}>
                                {isMe ? meLabel : p.displayName}
                                {isThisWinner && ' 🏆'}
                              </p>
                              <p className="font-mono text-xs leading-tight"
                                style={{ color: isThisWinner ? 'rgba(201,168,76,0.6)' : 'rgba(245,230,200,0.3)' }}>
                                {p.score} {lang === 'ar' ? 'نقطة' : 'pts'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Replay button — only on rich Check matches */}
                    {rec.gameType === 'check' && rec.rounds && rec.rounds.length > 0 && (
                      <button
                        onClick={() => setReplayRecord(rec)}
                        className="w-full rounded-lg flex items-center justify-center gap-2 font-arabic font-bold transition-all"
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(201,168,76,0.10)',
                          border: '1px solid rgba(201,168,76,0.30)',
                          color: '#E8C97A',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}>
                        📺 {lang === 'ar' ? 'إعادة المباراة' : 'Replay match'}
                        <span style={{ fontSize: 10, color: 'rgba(245,230,200,0.55)', fontWeight: 400 }}>
                          · {rec.rounds.length} {lang === 'ar' ? 'جولات' : 'rounds'}
                        </span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <ReplayModal
        open={!!replayRecord}
        record={replayRecord}
        myUid={myUid}
        lang={lang}
        onClose={() => setReplayRecord(null)}
      />
    </div>
  );
}
