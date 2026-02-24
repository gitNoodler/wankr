import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * useKickDetector — real-time kick drum detection via Web Audio API.
 *
 * Connects to an <audio> element, runs an AnalyserNode, and watches
 * low-frequency bins (40-200 Hz) for transient spikes that indicate
 * a kick drum hit.
 *
 * Returns:
 *   kick      — 0..1 "hit intensity" that decays each frame (use for scale)
 *   isKicking — boolean, true on the frame a kick is detected
 *   connect() — call with an HTMLAudioElement to wire up the analyser
 */
export default function useKickDetector() {
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataRef = useRef(null);
  const rafRef = useRef(null);
  const connectedElRef = useRef(null);

  // Kick state — decaying intensity 0..1
  const [kick, setKick] = useState(0);
  const [isKicking, setIsKicking] = useState(false);

  // Tuning knobs
  const thresholdRef = useRef(145);   // byte value 0-255 to trigger
  const cooldownRef = useRef(100);    // ms between consecutive detections
  const decayRef = useRef(0.88);      // per-frame multiplier for decay
  const lastKickRef = useRef(0);
  const kickIntensityRef = useRef(0);

  const connect = useCallback((audioEl) => {
    if (!audioEl || connectedElRef.current === audioEl) return;

    // Lazy AudioContext
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = ctxRef.current;

    // Resume if suspended (autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();

    // Only create source once per element
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* ok */ }
    }

    const source = ctx.createMediaElementSource(audioEl);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.4;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    sourceRef.current = source;
    analyserRef.current = analyser;
    connectedElRef.current = audioEl;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, []);

  // Animation loop: read frequency data, detect kicks
  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;

      const analyser = analyserRef.current;
      const data = dataRef.current;

      if (analyser && data) {
        analyser.getByteFrequencyData(data);

        // Kick detection: average energy in bins 2-8 (≈ 40-180 Hz at 44.1kHz/2048 FFT)
        // Bin resolution ≈ 21.5 Hz
        const ctx = ctxRef.current;
        const binHz = ctx ? ctx.sampleRate / analyser.fftSize : 21.5;
        const lowBin = Math.max(1, Math.floor(40 / binHz));
        const highBin = Math.min(data.length - 1, Math.ceil(200 / binHz));

        let sum = 0;
        for (let i = lowBin; i <= highBin; i++) sum += data[i];
        const avg = sum / (highBin - lowBin + 1);

        const now = performance.now();
        const threshold = thresholdRef.current;
        const cooldown = cooldownRef.current;

        if (avg > threshold && now - lastKickRef.current > cooldown) {
          lastKickRef.current = now;
          // Intensity scaled from threshold..255 → 0.5..1.0
          const intensity = 0.5 + 0.5 * Math.min(1, (avg - threshold) / (255 - threshold));
          kickIntensityRef.current = intensity;
          setKick(intensity);
          setIsKicking(true);
        } else {
          // Decay
          kickIntensityRef.current *= decayRef.current;
          if (kickIntensityRef.current < 0.01) kickIntensityRef.current = 0;
          setKick(kickIntensityRef.current);
          setIsKicking(false);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch { /* ok */ }
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return { kick, isKicking, connect };
}
