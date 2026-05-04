// Web Audio API sound effects + SpeechSynthesis for CHECK voice

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private get audioCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }
  isEnabled() { return this.enabled; }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.3, startDelay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startDelay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
      osc.start(ctx.currentTime + startDelay);
      osc.stop(ctx.currentTime + startDelay + duration + 0.05);
    } catch {}
  }

  // Soft card swoosh
  playCardDraw() {
    if (!this.enabled) return;
    try {
      const ctx = this.audioCtx;
      const bufSize = ctx.sampleRate * 0.18;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3) * 0.35;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      src.connect(filter);
      filter.connect(ctx.destination);
      src.start();
    } catch {}
  }

  // Card flip
  playCardFlip() {
    if (!this.enabled) return;
    try {
      const ctx = this.audioCtx;
      const bufSize = ctx.sampleRate * 0.08;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2) * 0.2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 5000;
      src.connect(filter);
      filter.connect(ctx.destination);
      src.start();
    } catch {}
  }

  // Card burn (fire-like)
  playBurn() {
    if (!this.enabled) return;
    try {
      const ctx = this.audioCtx;
      const bufSize = ctx.sampleRate * 0.4;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        const env = i < bufSize * 0.1 ? i / (bufSize * 0.1) : Math.pow(1 - (i - bufSize * 0.1) / (bufSize * 0.9), 1.5);
        data[i] = (Math.random() * 2 - 1) * env * 0.3;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      src.connect(filter);
      filter.connect(ctx.destination);
      src.start();
    } catch {}
  }

  // Coins/points sound
  playCoins() {
    if (!this.enabled) return;
    [600, 800, 1000, 1200].forEach((f, i) => this.playTone(f, 'sine', 0.15, 0.2, i * 0.07));
  }

  // Error/penalty
  playError() {
    if (!this.enabled) return;
    this.playTone(200, 'sawtooth', 0.25, 0.25, 0);
    this.playTone(160, 'sawtooth', 0.3, 0.25, 0.15);
  }

  // Turn start notification
  playTurnStart() {
    if (!this.enabled) return;
    this.playTone(880, 'sine', 0.12, 0.25, 0);
    this.playTone(1100, 'sine', 0.12, 0.2, 0.13);
  }

  // Win fanfare
  playWin() {
    if (!this.enabled) return;
    const melody = [523, 659, 784, 1047];
    melody.forEach((f, i) => this.playTone(f, 'triangle', 0.3, 0.3, i * 0.15));
  }

  // Elimination sound
  playElimination() {
    if (!this.enabled) return;
    this.playTone(400, 'sawtooth', 0.2, 0.2, 0);
    this.playTone(300, 'sawtooth', 0.25, 0.2, 0.2);
    this.playTone(200, 'sawtooth', 0.3, 0.2, 0.4);
  }

  // Voice "Check!" using SpeechSynthesis
  playCheckVoice() {
    if (!this.enabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const utt = new SpeechSynthesisUtterance('Check!');
      utt.lang = 'en-US';
      utt.pitch = 1.2;
      utt.rate = 0.9;
      utt.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    } catch {}
  }

  // Special action (J or Q)
  playSpecialAction() {
    if (!this.enabled) return;
    this.playTone(660, 'sine', 0.15, 0.3, 0);
    this.playTone(990, 'sine', 0.15, 0.25, 0.12);
    this.playTone(1320, 'sine', 0.12, 0.2, 0.22);
  }

  // Button click
  playClick() {
    if (!this.enabled) return;
    this.playTone(1200, 'sine', 0.06, 0.15, 0);
  }
}

export const soundService = new SoundService();
