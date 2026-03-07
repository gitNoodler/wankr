import { useState, useEffect } from 'react';

const MOBILE = 767;
const TABLET = 1023;

function getBreakpoint(w) {
  if (w <= MOBILE) return 'mobile';
  if (w <= TABLET) return 'tablet';
  return 'desktop';
}

export function useResponsive() {
  const [state, setState] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    return { width: w, bp: getBreakpoint(w) };
  });

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setState((prev) => {
        const bp = getBreakpoint(w);
        if (prev.width === w && prev.bp === bp) return prev;
        return { width: w, bp };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    isMobile: state.bp === 'mobile',
    isTablet: state.bp === 'tablet',
    isDesktop: state.bp === 'desktop',
    width: state.width,
  };
}
