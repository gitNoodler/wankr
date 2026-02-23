import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * LofiEngine — Web Audio API procedural ambient pads + vinyl crackle.
 * Ported from the standalone HTML prototype.
 */
class LofiEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.timeout = null;
  }

  async init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.028;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -28;
    this.compressor.ratio.value = 4;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 800;
    this.filter.Q.value = 0.5;

    this.delay = this.ctx.createDelay();
    this.delay.delayTime.value = 0.4;
    this.delayFb = this.ctx.createGain();
    this.delayFb.gain.value = 0.14;
    this.delayWet = this.ctx.createGain();
    this.delayWet.gain.value = 0.2;

    this.filter.connect(this.compressor);
    this.compressor.connect(this.master);
    this.compressor.connect(this.delay);
    this.delay.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delay.connect(this.delayWet);
    this.delayWet.connect(this.master);
    this.master.connect(this.ctx.destination);

    this._crackle();
  }

  _crackle() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.008;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4500;
    const g = this.ctx.createGain();
    g.gain.value = 0.045;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start();
  }

  _chord(notes, start, dur) {
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      const atk = 0.5 + Math.random() * 0.3;
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.15 - i * 0.018, start + atk);
      env.gain.setValueAtTime(0.11 - i * 0.013, start + dur - 1.0);
      env.gain.linearRampToValueAtTime(0, start + dur);
      osc.connect(env);
      env.connect(this.filter);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  }

  _run() {
    if (!this.playing) return;
    const now = this.ctx.currentTime;
    const dur = 4.5;
    const chords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [110.00, 130.81, 164.81, 196.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [146.83, 174.61, 220.00, 261.63], // Dm7
    ];
    chords.forEach((c, i) => this._chord(c, now + i * dur, dur));

    // Sparse high melody
    [523.25, 493.88, 440.00, 392.00].forEach((f, i) => {
      if (Math.random() > 0.4) {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f * 0.5;
        const s = now + i * dur + 1.2 + Math.random() * 1.2;
        env.gain.setValueAtTime(0, s);
        env.gain.linearRampToValueAtTime(0.045, s + 0.35);
        env.gain.linearRampToValueAtTime(0, s + 2.0);
        osc.connect(env);
        env.connect(this.filter);
        osc.start(s);
        osc.stop(s + 2.3);
      }
    });

    this.timeout = setTimeout(() => this._run(), (chords.length * dur - 0.1) * 1000);
  }

  async start() {
    if (!this.ctx) await this.init();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.playing = true;
    this._run();
  }

  stop() {
    this.playing = false;
    clearTimeout(this.timeout);
  }

  destroy() {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

/**
 * React hook for procedural lofi music.
 * Returns { playing, toggle, start, stop }.
 */
export default function useLofiMusic() {
  const engineRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new LofiEngine();
    }
    return engineRef.current;
  }, []);

  const start = useCallback(async () => {
    const engine = getEngine();
    await engine.start();
    setPlaying(true);
  }, [getEngine]);

  const stop = useCallback(() => {
    const engine = getEngine();
    engine.stop();
    setPlaying(false);
  }, [getEngine]);

  const toggle = useCallback(async () => {
    const engine = getEngine();
    if (engine.playing) {
      stop();
    } else {
      await start();
    }
  }, [getEngine, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  return { playing, toggle, start, stop };
}
