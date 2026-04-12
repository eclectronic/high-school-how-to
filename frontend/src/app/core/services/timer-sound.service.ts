import { Injectable } from '@angular/core';

/**
 * Synthesizes a short chime using the Web Audio API — no audio files required.
 * Plays a two-note ascending ding (C6 → E6) with a quick decay, similar to
 * the iOS timer completion sound.
 */
@Injectable({ providedIn: 'root' })
export class TimerSoundService {
  playChime(): void {
    try {
      const ctx = new AudioContext();
      this.note(ctx, 1046.50, 0,    0.18); // C6
      this.note(ctx, 1318.51, 0.18, 0.22); // E6
      this.note(ctx, 1568.00, 0.36, 0.45); // G6 — held longer
      // Close the context after the last note fades out
      setTimeout(() => ctx.close(), 1200);
    } catch { /* Web Audio not available */ }
  }

  private note(ctx: AudioContext, freq: number, startOffset: number, duration: number): void {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

    // Quick attack, exponential decay
    gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + startOffset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);

    osc.start(ctx.currentTime + startOffset);
    osc.stop(ctx.currentTime + startOffset + duration);
  }
}
