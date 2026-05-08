/**
 * haptic.service — small wrapper around navigator.vibrate so the rest of
 * the app can request a named haptic pattern instead of guessing the right
 * ms tuple. Silently no-ops on devices that don't expose Vibration API
 * (desktop Safari, most desktop browsers, iOS Safari).
 *
 * Patterns are short on purpose — long buzzes are jarring on a card game.
 * Tied to the same moments where soundService already plays a clip so the
 * audio + tactile cues match.
 */

const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const STORAGE_KEY = 'check.hapticEnabled';
let enabled: boolean | null = null;

function isEnabled(): boolean {
  if (!supported) return false;
  if (enabled !== null) return enabled;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    enabled = v === null ? true : v === '1';
  } catch {
    enabled = true;
  }
  return enabled!;
}

function fire(pattern: number | number[]): void {
  if (!isEnabled()) return;
  try { navigator.vibrate(pattern); } catch { /* noop */ }
}

export const hapticService = {
  /** Tap a button, draw a card — softest cue. */
  tap:        () => fire(8),
  /** Successful burn — short snappy double. */
  burnGood:   () => fire([14, 40, 14]),
  /** Failed burn → +1 card penalty — longer warning. */
  burnBad:    () => fire([24, 60, 24, 60, 24]),
  /** Your turn just started. */
  yourTurn:   () => fire(12),
  /** Someone called CHECK on the table. */
  checkCall:  () => fire([18, 50, 24]),
  /** You won the match. */
  win:        () => fire([18, 50, 18, 50, 60]),
  /** You lost / got eliminated. */
  loss:       () => fire([60, 80, 30]),
  /** First-win-of-day bonus / reward chest opens. */
  reward:     () => fire([10, 30, 16, 30, 22]),

  /** Toggle on/off — wired up to a future settings switch. */
  setEnabled(on: boolean) {
    enabled = !!on;
    try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch { /* noop */ }
  },
  isEnabled,
  isSupported: () => supported,
};
