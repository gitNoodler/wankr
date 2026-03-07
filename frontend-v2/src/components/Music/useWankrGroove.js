import { useRef, useState, useEffect, useCallback } from 'react';

const GROOVE_URL = '/audio/wankrbot-groove.mp3';
const AUTOPLAY_DELAY_MS = 500;
const DEFAULT_VOLUME = 0.5;
const STORAGE_KEY = 'wankr-groove';

/**
 * useWankrGroove — manages "The WankrBot Groove" background audio.
 *
 * - Loops forever
 * - Auto-starts 5 s after mount (requires user gesture on most browsers,
 *   so we also attempt on first click/keydown as a fallback)
 * - Persists volume + mute preference to localStorage
 */
export default function useWankrGroove() {
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const gestureAttempted = useRef(false);

  /* Restore saved prefs */
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();

  const [volume, setVolumeState] = useState(saved.volume ?? DEFAULT_VOLUME);
  const [muted, setMutedState] = useState(saved.muted ?? false);
  const [playing, setPlaying] = useState(false);

  /* Persist prefs */
  const persist = useCallback((vol, mut) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: vol, muted: mut })); } catch { /* noop */ }
  }, []);

  /* Lazily create the <audio> element */
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(GROOVE_URL);
      a.loop = true;
      a.volume = muted ? 0 : volume;
      a.preload = 'auto';
      audioRef.current = a;
    }
    return audioRef.current;
  }, []); // volume/muted captured at creation; updated in effects

  /* Attempt to play (may fail without user gesture) */
  const tryPlay = useCallback(() => {
    const a = getAudio();
    a.play()
      .then(() => setPlaying(true))
      .catch(() => { /* browser blocked autoplay — we'll retry on gesture */ });
  }, [getAudio]);

  /* Auto-start after 5 s */
  useEffect(() => {
    timerRef.current = setTimeout(tryPlay, AUTOPLAY_DELAY_MS);
    return () => clearTimeout(timerRef.current);
  }, [tryPlay]);

  /* Fallback: start on first user gesture if autoplay was blocked */
  useEffect(() => {
    const handler = () => {
      if (gestureAttempted.current) return;
      gestureAttempted.current = true;
      const a = getAudio();
      if (a.paused) {
        a.play().then(() => setPlaying(true)).catch(() => {});
      }
    };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [getAudio]);

  /* Sync volume/muted to the audio element */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  /* Public setters */
  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    persist(clamped, muted);
  }, [muted, persist]);

  const setMuted = useCallback((m) => {
    setMutedState(m);
    persist(volume, m);
  }, [volume, persist]);

  const toggleMute = useCallback(() => {
    setMuted(!muted);
  }, [muted, setMuted]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  return { volume, muted, playing, setVolume, setMuted, toggleMute, getAudio };
}
