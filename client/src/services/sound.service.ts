// Web Audio API sound effects + SpeechSynthesis for CHECK voice

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private vol = 0.6;

  private get audioCtx(): AudioContext {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }
  isEnabled() { return this.enabled; }
  getVolume() { return this.vol; }
  setVolume(v: number) { this.vol = Math.max(0, Math.min(1, v)); }

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
      gain.gain.linearRampToValueAtTime(vol * this.vol, ctx.currentTime + startDelay + 0.01);
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

  // Voice "Check!" using SpeechSynthesis — per-character pitch/rate variation
  // avatarId determines the voice persona so each character sounds distinct
  playCheckVoice(avatarId?: string) {
    if (!this.enabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      // Map each avatar to a unique voice persona
      const personas: Record<string, { pitch: number; rate: number; voiceFilter?: (v: SpeechSynthesisVoice) => boolean }> = {
        avatar_1:  { pitch: 0.85, rate: 0.85 },                                // 🦅 deep, slow
        avatar_2:  { pitch: 0.95, rate: 1.0 },                                 // 🐪 calm baritone
        avatar_3:  { pitch: 1.05, rate: 0.95 },                                // 🌴 mid
        avatar_4:  { pitch: 0.7,  rate: 0.95 },                                // ⚔️ deepest, warrior
        avatar_5:  { pitch: 1.4,  rate: 1.0,  voiceFilter: v => /female/i.test(v.name) }, // 🌙 higher
        avatar_6:  { pitch: 1.6,  rate: 1.05, voiceFilter: v => /female/i.test(v.name) }, // ⭐ bright high
        avatar_7:  { pitch: 0.9,  rate: 1.2 },                                 // 🏜️ fast desert
        avatar_8:  { pitch: 1.3,  rate: 0.8,  voiceFilter: v => /female/i.test(v.name) }, // 🌊 slow elder
        avatar_9:  { pitch: 0.6,  rate: 0.75 },                                // 🦁 lion — deepest, slow
        avatar_10: { pitch: 1.1,  rate: 1.4 },                                 // 🔥 fast, intense
        avatar_11: { pitch: 1.5,  rate: 0.9,  voiceFilter: v => /female/i.test(v.name) }, // 💎 jewel
        avatar_12: { pitch: 1.25, rate: 1.1 },                                 // 🎭 theatrical
      };
      const persona = personas[avatarId || ''] || { pitch: 1.2, rate: 0.9 };

      const utt = new SpeechSynthesisUtterance('Check!');
      utt.lang = 'en-US';
      utt.pitch = persona.pitch;
      utt.rate = persona.rate;
      utt.volume = 1;
      if (persona.voiceFilter) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.lang.startsWith('en') && persona.voiceFilter!(v));
        if (match) utt.voice = match;
      }
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
