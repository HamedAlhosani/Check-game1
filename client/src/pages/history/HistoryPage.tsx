import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/api.service';
import { useT, useLang } from '../../i18n/useT';
import { PageShell, ShellCard } from '../../components/shared/PageShell';
import { FrameRing } from '../../components/shared/FrameRing';
import { CharacterArt } from '../../components/shared/CharacterArt';
import { ProfileModal } from '../../components/shared/ProfileModal';
import { MatchRecord } from '@check-game/shared';
import { ReplayModal } from '../../components/shared/ReplayModal';

const isBotUid = (uid: string) => uid.startsWith('bot-');

const GAME_LABELS_AR: Record<string, string> = { check: 'Check', ludo: 'لودو', domino: 'دومنو', jackaro: 'جكارو' };
const GAME_LABELS_EN: Record<string, string> = { check: 'Check', ludo: 'Ludo', domino: 'Domino', jackaro: 'Jackaro' };

export function HistoryPage() {
  const t = useT();
  const lang = useLang();

  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayRecord, setReplayRecord] = useState<MatchRecord | null>(null);
  const [profileUid, setProfileUid] = useState<string | null>(null);

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
    <PageShell title={t('history_title')} lang={lang}>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse" style={{ background: 'rgba(229,188,124,0.04)', borderRadius: '22px 6px 22px 6px' }} />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🃏</p>
          <p className="font-arabic font-bold text-lg" style={{ color: 'rgba(251,243,219,0.5)' }}>{t('history_no_games')}</p>
          <p className="font-arabic text-sm mt-2" style={{ color: 'rgba(251,243,219,0.25)' }}>
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
              >
                <ShellCard glow={isWin}>
                  {/* Header strip */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm tracking-widest" style={{ color: 'rgba(229,188,124,0.7)' }}>
                        {GAME_LABELS[rec.gameType] || rec.gameType}
                      </span>
                      {rec.players.length > 0 && (
                        <span className="text-xs font-arabic" style={{ color: 'rgba(251,243,219,0.3)' }}>
                          · {rec.players.length} {lang === 'ar' ? 'لاعبين' : 'players'}
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
                      <span className="text-xs font-arabic" style={{ color: 'rgba(251,243,219,0.25)' }}>
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
                        const clickable = !isBotUid(p.uid);
                        const onClick = clickable ? () => setProfileUid(p.uid) : undefined;
                        return (
                          <button
                            key={p.uid}
                            onClick={onClick}
                            disabled={!clickable}
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-start ${clickable ? 'active:scale-[0.97] hover:brightness-110' : 'cursor-default'} transition`}
                            style={{
                              background: isThisWinner ? 'rgba(229,188,124,0.12)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${isMe ? 'rgba(229,188,124,0.4)' : isThisWinner ? 'rgba(229,188,124,0.2)' : 'rgba(255,255,255,0.07)'}`,
                            }}>
                            <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
                              <CharacterArt id={p.avatarId} size={28} />
                              <FrameRing size={28} frameId={(p as any).equippedFrame}/>
                            </div>
                            <div>
                              <p className="font-arabic text-xs font-bold leading-tight"
                                style={{ color: isThisWinner ? '#FBF3DB' : isMe ? 'rgba(229,188,124,0.8)' : 'rgba(251,243,219,0.6)' }}>
                                {isMe ? meLabel : p.displayName}
                                {isThisWinner && ' 🏆'}
                              </p>
                              <p className="font-mono text-xs leading-tight"
                                style={{ color: isThisWinner ? 'rgba(229,188,124,0.6)' : 'rgba(251,243,219,0.3)' }}>
                                {p.score} {lang === 'ar' ? 'نقطة' : 'pts'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {rec.gameType === 'check' && rec.rounds && rec.rounds.length > 0 && (
                      <button
                        onClick={() => navigate(`/replay/${rec.gameId}`)}
                        className="w-full rounded-lg flex items-center justify-center gap-2 font-arabic font-bold transition-all"
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(229,188,124,0.10)',
                          border: '1px solid rgba(229,188,124,0.30)',
                          color: '#FBF3DB',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}>
                        📺 {lang === 'ar' ? 'إعادة المباراة' : 'Replay match'}
                        <span style={{ fontSize: 10, color: 'rgba(251,243,219,0.55)', fontWeight: 400 }}>
                          · {rec.rounds.length} {lang === 'ar' ? 'جولات' : 'rounds'}
                        </span>
                      </button>
                    )}
                  </div>
                </ShellCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <ReplayModal
        open={!!replayRecord}
        record={replayRecord}
        myUid={myUid}
        lang={lang}
        onClose={() => setReplayRecord(null)}
      />

      <ProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />
    </PageShell>
  );
}
