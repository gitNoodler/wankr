import React from 'react';

/** Wraps effect layers; always renders full viewport (no mask) for seamless display across the entire width. */
export default function EffectsBoundsLayer({ children, version = 0, zIndex = 0 }) {
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EffectsBoundsLayer.jsx:5',message:'EffectsBoundsLayer rendered',data:{zIndex,childrenCount:React.Children.count(children)},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  }, [zIndex, children]);
  // #endregion

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
      }}
      data-effects-version={version}
    >
      {children}
    </div>
  );
}
