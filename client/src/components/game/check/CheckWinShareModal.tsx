import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { soundService } from '../../../services/sound.service';
import { useUiStore } from '../../../store/uiStore';

/**
 * CheckWinShareModal — celebrates a clean CHECK win with a shareable
 * canvas-rendered PNG. The image is drawn fully in JS (no html2canvas
 * dep) so it stays consistent across browsers and renders at print
 * resolution (1080×1350 — Instagram-story-friendly vertical).
 *
 * Share strategy:
 *   1. Web Share API (Level 2 with files) when available — mobile.
 *   2. Fallback: download the PNG.
 *
 * Triggered from CheckBoard when:
 *   - roundScoreData.checkOutcome === 'win'
 *   - roundScoreData.checkCallerId === current user uid
 */

export interface ShareOpponent {
  uid: string;
  displayName: string;
  handSum: number;
  cumulative: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  callerName: string;
  callerCumulative: number;
  opponents: ShareOpponent[];
  roundNumber: number;
}

const W = 1080;
const H = 1350;

// Brand palette (Emirati Heritage — matches the rest of the app)
const COLORS = {
  bg1: '#2A1C0E',
  bg2: '#0E0905',
  gold: '#E8C97A',
  goldDeep: '#A07338',
  goldLight: '#FFE07A',
  sand: '#FBF3DB',
  sandDim: 'rgba(251,243,219,0.55)',
  red: '#E04030',
  green: '#7AE08A',
};

/** Draws the share image onto the provided canvas context. Pure layout
 *  code — keep it readable so future tweaks (winner avatar, theme) slot
 *  in without rewriting. */
function drawShareImage(
  ctx: CanvasRenderingContext2D,
  callerName: string,
  callerCumulative: number,
  opponents: ShareOpponent[],
  roundNumber: number,
  dateStr: string
) {
  // ── Background gradient ────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, COLORS.bg1);
  bg.addColorStop(1, COLORS.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft top halo
  const halo = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 700);
  halo.addColorStop(0, 'rgba(255,224,122,0.25)');
  halo.addColorStop(1, 'rgba(255,224,122,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, 700);

  // ── Border frame ───────────────────────────────────────────────────
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = 'rgba(232,201,122,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, W - 120, H - 120);

  // ── Header brand ───────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 56px Cinzel, Georgia, serif';
  ctx.fillText('CHECK', W / 2, 170);

  ctx.fillStyle = COLORS.sandDim;
  ctx.font = '22px Tahoma, Arial, sans-serif';
  ctx.fillText(`الجولة ${roundNumber} • ${dateStr}`, W / 2, 210);

  // ── Trophy + headline ──────────────────────────────────────────────
  ctx.font = '140px Apple Color Emoji, Segoe UI Emoji, sans-serif';
  ctx.fillText('🏆', W / 2, 380);

  ctx.fillStyle = COLORS.goldLight;
  ctx.font = 'bold 80px Tahoma, Arial, sans-serif';
  ctx.fillText('CHECK ناجح!', W / 2, 480);

  ctx.fillStyle = COLORS.sand;
  ctx.font = 'bold 44px Tahoma, Arial, sans-serif';
  ctx.fillText(callerName, W / 2, 545);

  ctx.fillStyle = COLORS.green;
  ctx.font = 'bold 36px Tahoma, Arial, sans-serif';
  ctx.fillText(`٠ نقاط هالجولة • المجموع ${callerCumulative}`, W / 2, 595);

  // ── Divider ─────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(232,201,122,0.30)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(180, 660);
  ctx.lineTo(W - 180, 660);
  ctx.stroke();

  // ── Opponents list ──────────────────────────────────────────────────
  ctx.fillStyle = COLORS.sandDim;
  ctx.font = '24px Tahoma, Arial, sans-serif';
  ctx.fillText('الخصوم دفعوا الثمن:', W / 2, 710);

  const startY = 760;
  const rowH = 80;
  const maxRows = Math.min(opponents.length, 6);
  for (let i = 0; i < maxRows; i++) {
    const o = opponents[i];
    const y = startY + i * rowH;

    // Row background
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(ctx, 120, y, W - 240, rowH - 14, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Name
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.sand;
    ctx.font = 'bold 30px Tahoma, Arial, sans-serif';
    ctx.fillText(o.displayName, W - 160, y + 42);

    // Score added this round
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.red;
    ctx.font = 'bold 32px Tahoma, Arial, sans-serif';
    ctx.fillText(`+${o.handSum}`, 160, y + 42);
  }

  if (opponents.length > maxRows) {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.sandDim;
    ctx.font = '22px Tahoma, Arial, sans-serif';
    ctx.fillText(`و ${opponents.length - maxRows} خصم آخر`, W / 2, startY + maxRows * rowH + 8);
  }

  // ── Footer brand ────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.goldDeep;
  ctx.font = 'bold 28px Cinzel, Georgia, serif';
  ctx.fillText('check-web.fly.dev', W / 2, H - 90);

  ctx.fillStyle = COLORS.sandDim;
  ctx.font = '20px Tahoma, Arial, sans-serif';
  ctx.fillText('لعبة Check الإماراتية', W / 2, H - 60);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function CheckWinShareModal({
  open, onClose,
  callerName, callerCumulative, opponents, roundNumber,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { addToast } = useUiStore();

  // Render the share image whenever inputs change while open.
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dateStr = new Date().toLocaleDateString('ar-AE', { year: 'numeric', month: 'numeric', day: 'numeric' });
    drawShareImage(ctx, callerName, callerCumulative, opponents, roundNumber, dateStr);
    setPreviewSrc(canvas.toDataURL('image/png'));
  }, [open, callerName, callerCumulative, opponents, roundNumber]);

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    soundService.playClick();
    try {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/png'));
      if (!blob) throw new Error('blob_failed');
      const file = new File([blob], `check-win-round-${roundNumber}.png`, { type: 'image/png' });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: 'CHECK ناجح!',
          text: `فزت بـ CHECK في لعبة Check 🏆`,
        });
        addToast('تمت المشاركة ✓', 'success');
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `check-win-round-${roundNumber}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('انحفظت الصورة 📥', 'success');
      }
    } catch (err: any) {
      // User cancelled is silent; real errors get a toast
      if (err?.name !== 'AbortError') {
        addToast('تعذّرت المشاركة', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(8,4,0,0.92)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="rounded-3xl border w-full"
        style={{
          background: 'linear-gradient(160deg, #2A1C0E 0%, #0E0905 100%)',
          borderColor: 'rgba(232,201,122,0.55)',
          maxWidth: 420,
          padding: '20px 18px 18px',
          boxShadow: '0 24px 70px rgba(0,0,0,0.85), 0 0 30px rgba(232,201,122,0.30)',
        }}
      >
        <p className="font-arabic font-bold text-center mb-1" style={{ fontSize: 20, color: '#FFE07A' }}>
          🎉 شارك انتصارك
        </p>
        <p className="font-arabic text-center mb-3" style={{ fontSize: 12, color: 'rgba(251,243,219,0.55)' }}>
          صورة جاهزة للسوشل ميديا
        </p>

        {/* Hidden canvas — actual rendering target */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Visible preview */}
        {previewSrc && (
          <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid rgba(232,201,122,0.30)' }}>
            <img src={previewSrc} alt="CHECK win share" style={{ display: 'block', width: '100%', height: 'auto' }} />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl font-arabic font-bold transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #FFE07A, #A07338)',
              color: '#100A05',
              border: '1.5px solid rgba(255,224,122,0.7)',
              boxShadow: '0 0 18px rgba(255,224,122,0.40)',
              fontSize: 15,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? '...' : '📤 شارك أو احفظ'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-arabic transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(251,243,219,0.65)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
