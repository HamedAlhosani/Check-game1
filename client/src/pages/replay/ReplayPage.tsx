import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/api.service';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useLang } from '../../i18n/useT';
import { PageShell } from '../../components/shared/PageShell';
import { ReplayModal } from '../../components/shared/ReplayModal';
import { soundService } from '../../services/sound.service';
import { MatchRecord } from '@check-game/shared';

/**
 * ReplayPage — full-page wrapper around ReplayModal so a match can be
 * opened directly via /replay/:gameId. Two main use cases:
 *
 *   1. Direct link from chat / share / bookmark.
 *   2. The HistoryPage now also routes here (via a "📺" icon) instead of
 *      mounting the modal — so the URL is bookmarkable and the back-button
 *      restores the history list.
 *
 * Server endpoint /api/replay/:gameId enforces participant-only access.
 */
export function ReplayPage() {
  const lang = useLang();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { profile } = useAuthStore();
  const { addToast } = useUiStore();
  const [record, setRecord] = useState<MatchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    apiClient.get<MatchRecord>(`/api/replay/${gameId}`)
      .then(r => setRecord(r))
      .catch((e: any) => {
        const msg = e?.message || '';
        if (msg.includes('Not a participant')) {
          setError(lang === 'ar' ? 'هذي مباراة خاصة — ما تقدر تشوف إعادتها' : "Private match — replay isn't visible to you");
        } else if (msg.includes('Match not found')) {
          setError(lang === 'ar' ? 'المباراة مب موجودة' : 'Match not found');
        } else {
          setError(lang === 'ar' ? 'تعذّر تحميل الإعادة' : 'Could not load replay');
        }
      })
      .finally(() => setLoading(false));
  }, [gameId, lang]);

  function copyLink() {
    if (!gameId) return;
    soundService.playClick();
    const url = `${window.location.origin}/replay/${gameId}`;
    navigator.clipboard.writeText(url).then(
      () => addToast(lang === 'ar' ? 'انحفظ الرابط 📋' : 'Link copied 📋', 'success'),
      () => addToast(lang === 'ar' ? 'تعذّر النسخ' : 'Copy failed', 'error'),
    );
  }

  return (
    <PageShell
      title={lang === 'ar' ? '📺 إعادة المباراة' : '📺 Match Replay'}
      lang={lang}
      back="/history"
      right={
        record ? (
          <button
            onClick={copyLink}
            className="font-arabic font-bold rounded-xl px-3 py-1.5 transition-all"
            style={{
              fontSize: 12,
              background: 'rgba(229,188,124,0.12)',
              border: '1px solid rgba(229,188,124,0.40)',
              color: '#E8C97A',
              cursor: 'pointer',
            }}
            title={lang === 'ar' ? 'انسخ رابط الإعادة' : 'Copy replay link'}
          >
            🔗 {lang === 'ar' ? 'نسخ الرابط' : 'Copy link'}
          </button>
        ) : null
      }
    >
      {loading && (
        <div className="text-center py-16 font-arabic" style={{ color: 'rgba(251,243,219,0.45)' }}>
          {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </div>
      )}
      {error && !loading && (
        <div className="rounded-2xl p-6 text-center border"
          style={{ background: 'rgba(196,92,58,0.08)', borderColor: 'rgba(196,92,58,0.35)' }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🔒</p>
          <p className="font-arabic font-bold" style={{ fontSize: 15, color: '#E07040' }}>{error}</p>
          <button
            onClick={() => navigate('/history')}
            className="mt-4 px-4 py-2 rounded-xl font-arabic font-bold"
            style={{
              background: 'linear-gradient(135deg, #E5BC7C, #A07338)',
              color: '#100A05',
              fontSize: 13,
            }}
          >
            {lang === 'ar' ? 'الرجوع للسجل' : 'Back to history'}
          </button>
        </div>
      )}
      {record && (
        <ReplayModal
          open={true}
          record={record}
          myUid={profile?.uid}
          lang={lang}
          onClose={() => navigate('/history')}
        />
      )}
    </PageShell>
  );
}
