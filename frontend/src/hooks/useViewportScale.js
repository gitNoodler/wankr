import { useEffect } from 'react';

/**
 * Locks zoom and sets --scale on document based on window proportions.
 * Design reference: 1440×900. Scale is clamped to stay visually pleasing.
 */
export function useViewportScale() {
  useEffect(() => {
    const REF_W = 1440;
    const REF_H = 900;
    const MIN_SCALE = 0.6;
    const MAX_SCALE = 1.2;

    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scaleByW = w / REF_W;
      const scaleByH = h / REF_H;
      const scale = Math.min(scaleByW, scaleByH);
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      document.documentElement.style.setProperty('--scale', String(clamped));
    };

    update();
    window.addEventListener('resize', update);

    const blockCtrlZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', blockCtrlZoom, { passive: false });

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('wheel', blockCtrlZoom);
    };
  }, []);
}
