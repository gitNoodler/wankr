import React, { useEffect, useRef, useState } from 'react';
import notesImg from '@mascot/dashLayers/notes.png';

/**
 * MusicNotes — Spawns floating music notes from boombox position.
 * Processes notes.png to remove white background via canvas pixel manipulation.
 * Falls back to mix-blend-mode: screen if canvas fails (e.g. CORS).
 *
 * Notes use position: fixed + viewport coords from getBoundingClientRect()
 * to avoid coordinate issues caused by ancestor CSS transforms (sceneUnit).
 */
export default function MusicNotes({ playing, boomboxRef }) {
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const processedSrcRef = useRef(null);
  const [processedSrc, setProcessedSrc] = useState(null);
  const [useFallbackBlend, setUseFallbackBlend] = useState(false);

  // Process notes.png on mount — remove white background via canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const bright = (r + g + b) / 3;
          if (bright > 235) {
            px[i + 3] = 0;
          } else if (bright > 210) {
            px[i + 3] = Math.round(px[i + 3] * (1 - (bright - 210) / 25));
          } else if (r > 200 && g > 200 && b > 200 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
            px[i + 3] = Math.round(px[i + 3] * 0.15);
          }
        }
        ctx.putImageData(data, 0, 0);
        const dataUrl = c.toDataURL('image/png');
        processedSrcRef.current = dataUrl;
        setProcessedSrc(dataUrl);
      } catch {
        // Canvas processing failed (CORS), fall back to screen blend
        processedSrcRef.current = notesImg;
        setProcessedSrc(notesImg);
        setUseFallbackBlend(true);
      }
    };
    img.onerror = () => {
      processedSrcRef.current = notesImg;
      setProcessedSrc(notesImg);
      setUseFallbackBlend(true);
    };
    img.src = notesImg;
  }, []);

  // Spawn notes when playing
  useEffect(() => {
    if (!playing || !processedSrc) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const spawnNote = () => {
      const boom = boomboxRef?.current;
      const container = containerRef.current;
      if (!boom || !container) return;

      const r = boom.getBoundingClientRect();

      const el = document.createElement('div');
      /* Use fixed positioning — immune to ancestor transforms (sceneUnit scale/translate) */
      el.style.position = 'fixed';
      el.style.zIndex = '999';
      el.style.pointerEvents = 'none';
      el.style.opacity = '0';
      if (useFallbackBlend) {
        el.style.mixBlendMode = 'screen';
      }

      const size = 30 + Math.random() * 35;
      const rise = -(110 + Math.random() * 110);
      const drift = -30 + Math.random() * 60;
      const spin = -18 + Math.random() * 36;
      const duration = 2500 + Math.random() * 1800;

      /* Use viewport coords directly from getBoundingClientRect (position: fixed) */
      const x = r.left + r.width * 0.12 + Math.random() * r.width * 0.76;
      const y = r.top - 8;

      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.setProperty('--size', size + 'px');
      el.style.setProperty('--rise', rise + 'px');
      el.style.setProperty('--drift', drift + 'px');
      el.style.setProperty('--spin', spin + 'deg');
      el.style.setProperty('--duration', duration + 'ms');
      el.style.animation = `noteFloat ${duration}ms ease-out forwards`;

      const img = document.createElement('img');
      img.src = processedSrcRef.current;
      img.draggable = false;
      img.style.width = size + 'px';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.filter = 'drop-shadow(0 0 6px rgba(0,255,65,0.25))';
      el.appendChild(img);

      container.appendChild(el);
      setTimeout(() => {
        if (el.parentNode) el.remove();
      }, duration + 100);
    };

    // Initial burst: 3 notes staggered
    const t1 = setTimeout(spawnNote, 60);
    const t2 = setTimeout(spawnNote, 350);
    const t3 = setTimeout(spawnNote, 750);

    // Regular interval
    intervalRef.current = setInterval(spawnNote, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, processedSrc, boomboxRef, useFallbackBlend]);

  // Clear all notes when stopping
  useEffect(() => {
    if (!playing && containerRef.current) {
      const container = containerRef.current;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  }, [playing]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    />
  );
}
