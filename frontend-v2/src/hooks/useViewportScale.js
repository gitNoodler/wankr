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

    // iOS viewport height fix: sets --viewport-height to actual inner height
    // (accounts for address bar, keyboard, etc.)
    const updateVH = () => {
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${window.innerHeight}px`
      );
    };
    updateVH();

    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { update(); updateVH(); });
    };

    update();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', updateVH);

    const blockCtrlZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', blockCtrlZoom, { passive: false });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', updateVH);
      window.removeEventListener('wheel', blockCtrlZoom);
    };
  }, []);
}
