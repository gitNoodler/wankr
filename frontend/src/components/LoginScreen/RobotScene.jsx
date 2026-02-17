import React, { useRef, useState, useEffect } from 'react';
import { CANVAS, PANEL_BBOX_PCT } from './loginScreenConfig';
import OrbReflection from './OrbReflection';
import layer5Img from '@mascot/dashLayers/2ndFromBack.png';
import layer3Img from '@mascot/dashLayers/1BehindLoginPanel_shoulderLayer.png';
import handLeftImg from '@mascot/dashLayers/toplayer_hand_layer_Left.png';
import topelayerImg from '@mascot/dashLayers/topelayer.png';

export default function RobotScene({
  sceneRef,
  sceneUnitRef,
  sceneOffsetX,
  sceneOffsetY,
  sceneScaleX,
  sceneScaleY,
  backOffsetX,
  backOffsetY,
  backScaleX,
  backScaleY,
  robotOffsetX,
  robotOffsetY,
  robotScaleX,
  robotScaleY,
  shoulderOffsetX = 0,
  shoulderOffsetY = 0,
  shoulderScaleX = 100,
  shoulderScaleY = 100,
  handLeftOffsetX,
  handLeftOffsetY,
  handLeftScaleX,
  handLeftScaleY,
  handRightOffsetX,
  handRightOffsetY,
  handRightScaleX,
  handRightScaleY,
  showLayerBackground: _showLayerBackground = true,
  showLayerWankrBody = true,
  showLayerLogin: _showLayerLogin = true,
  showLayerHands = true,
  characterSharpness = 100,
  leftCushion,
  topCushion,
  loginBoxWidth,
  loginBoxHeight,
  scaleX,
  scaleY,
  panelBg,
  panelBorderBrightness,
  sparkActive,
  panelContent,
  panelContentOffsetX = 0,
  panelRightMargin = 100,
  buttonsBottomGap = 100,
  electricitySparks,
  ductTapeStrips = [],
  respectDuctTape = true,
  onRemoveDuctTape,
}) {
  const tapeOrigin = respectDuctTape && ductTapeStrips.length > 0
    ? (() => {
        const s = ductTapeStrips[0];
        const midX = (s.x1 + s.x2) / 2;
        const midY = (s.y1 + s.y2) / 2;
        return `${midX * 100}% ${midY * 100}%`;
      })()
    : 'center center';
  // #region agent log
  React.useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const aspectRatio = CANVAS.width / CANVAS.height;
    const sceneWidth = Math.min(vw, vh * aspectRatio);
    const sceneHeight = Math.min(vh, vw / aspectRatio);
    const leftGap = (vw - sceneWidth) / 2;
    const rightGap = leftGap;
    fetch('http://127.0.0.1:7244/ingest/2e3df805-3ed4-4d46-a74b-cedf907e4442',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RobotScene.jsx:75',message:'RobotScene dimensions',data:{viewportWidth:vw,viewportHeight:vh,sceneWidth,sceneHeight,leftGap,rightGap,aspectRatio},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  }, []);
  // #endregion

  const panelFloatRef = useRef(null);
  const [panelSize, setPanelSize] = useState(null);

  useEffect(() => {
    const el = panelFloatRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setPanelSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loginBoxWidth, loginBoxHeight, scaleX, scaleY, leftCushion, topCushion]);

  /* Aspect-fit: size so scene fits in viewport and preserves 1365:2048 (no stretch at 5173px or any width) */
  const aspectW = CANVAS.width / CANVAS.height;
  const aspectH = CANVAS.height / CANVAS.width;

  return (
    <div
      ref={sceneRef}
      className="login-scene"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        /* Fit inside container while preserving aspect (e.g. 5173px wide: limit width by height so no squash) */
        width: `min(100%, 100cqh * ${aspectW})`,
        height: `min(100cqh, 100% * ${aspectH})`,
        maxWidth: '100%',
        maxHeight: '100%',
        isolation: 'isolate',
        overflow: 'hidden',
      }}
    >
      <div
        ref={sceneUnitRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: `translate(${sceneOffsetX}%, ${sceneOffsetY}%) scaleX(${sceneScaleX / 100}) scaleY(${sceneScaleY / 100})`,
          transformOrigin: tapeOrigin,
        }}
      >
{showLayerWankrBody && (
          <>
            {/* Body only: Body scale/offset sliders control this */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                pointerEvents: 'none',
                transform: `translate(${backOffsetX}%, ${backOffsetY}%) scaleX(${backScaleX / 100}) scaleY(${backScaleY / 100})`,
                transformOrigin: tapeOrigin,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${layer5Img})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  filter: `${characterSharpness !== 100 ? `contrast(${characterSharpness / 100}) ` : ''}drop-shadow(0 0 3px rgba(0,255,65,0.1)) drop-shadow(0 0 10px rgba(0,255,65,0.08)) drop-shadow(0 -1px 4px rgba(0,255,80,0.06))`,
                }}
              />
            </div>
            {/* Robot (arms + hands): Robot scale/offset sliders control this wrapper — shoulder + hands */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 11,
                pointerEvents: 'none',
                transform: `translate(${robotOffsetX}%, ${robotOffsetY}%) scaleX(${robotScaleX / 100}) scaleY(${robotScaleY / 100})`,
                transformOrigin: tapeOrigin,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${layer3Img})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  transform: `translate(${shoulderOffsetX}%, ${shoulderOffsetY}%) scaleX(${shoulderScaleX / 100}) scaleY(${shoulderScaleY / 100})`,
                  transformOrigin: 'center center',
                  filter: `${characterSharpness !== 100 ? `contrast(${characterSharpness / 100}) ` : ''}drop-shadow(0 0 3px rgba(0,255,65,0.08)) drop-shadow(0 0 8px rgba(0,255,65,0.06))`,
                }}
              />
            </div>
          </>
        )}
        
        {/* Orb light reflection onto legs */}
        {showLayerWankrBody && <OrbReflection sparkActive={sparkActive} />}
        
        <div
          ref={panelFloatRef}
          className="login-scene-panel-float"
          style={{
            position: 'absolute',
            zIndex: 21,
            pointerEvents: 'auto',
            left: `${PANEL_BBOX_PCT.left + leftCushion}%`,
            top: `${PANEL_BBOX_PCT.top + topCushion}%`,
            width: `${PANEL_BBOX_PCT.width * (loginBoxWidth / 100)}%`,
            height: `${PANEL_BBOX_PCT.height * (loginBoxHeight / 100)}%`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
            transform: `scale(${scaleX / 100}, ${scaleY / 100})`,
            transformOrigin: 'center center',
            filter: sparkActive
              ? 'drop-shadow(0 0 12px rgba(0,255,65,0.35)) drop-shadow(0 0 28px rgba(0,255,65,0.2)) drop-shadow(0 0 40px rgba(200,255,120,0.25))'
              : 'drop-shadow(0 0 8px rgba(0,255,65,0.15)) drop-shadow(0 0 24px rgba(0,255,65,0.08))',
            transition: 'filter 0.1s ease-out',
          }}
        >
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div
              style={{
                width: panelSize ? `${panelSize.width}px` : '100%',
                height: panelSize ? `${panelSize.height}px` : '100%',
                maxWidth: '100%',
                minWidth: 0,
                minHeight: 0,
                containerType: 'size',
                padding: `${2 * (buttonsBottomGap / 100)}cqi ${1.25 * (panelRightMargin / 100)}cqi max(12px, ${2 * (buttonsBottomGap / 100)}cqi)`,
                marginLeft: panelContentOffsetX !== 0 ? `${panelContentOffsetX}%` : undefined,
                background: panelBg,
                borderRadius: '2.5cqi',
                border: `2px solid rgba(0, 255, 65, ${panelBorderBrightness / 100})`,
                boxShadow: sparkActive
                  ? `inset 0 1px 0 rgba(255,255,255,0.15), inset 0 4px 16px rgba(0,0,0,0.25), inset 0 -2px 8px rgba(0,0,0,0.35), inset 2px 0 8px rgba(0,0,0,0.15), inset -2px 0 8px rgba(0,0,0,0.15), 0 0 24px rgba(0,255,65,${panelBorderBrightness / 100 * 0.6}), 0 0 48px rgba(0,255,65,${panelBorderBrightness / 100 * 0.35}), 0 0 80px rgba(200,255,120,0.2), 0 0 120px rgba(200,255,100,0.1), 0 4px 0 rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.5)`
                  : `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 4px 14px rgba(0,0,0,0.22), inset 0 -2px 8px rgba(0,0,0,0.4), inset 2px 0 8px rgba(0,0,0,0.2), inset -2px 0 8px rgba(0,0,0,0.2), 0 0 20px rgba(0,255,65,${panelBorderBrightness / 100 * 0.4}), 0 0 40px rgba(0,255,65,${panelBorderBrightness / 100 * 0.2}), 0 0 80px rgba(0,255,65,0.1), 0 4px 0 rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.5)`,
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                position: 'relative',
                overflow: 'hidden',
                transition: 'box-shadow 0.1s ease-out',
              }}
            >
              {panelContent}
            </div>
          </div>
        </div>
        {showLayerHands && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 30,
              pointerEvents: 'none',
              transform: `translate(${robotOffsetX}%, ${robotOffsetY}%) scaleX(${robotScaleX / 100}) scaleY(${robotScaleY / 100})`,
              transformOrigin: tapeOrigin,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${handLeftImg})`,
                backgroundSize: 'contain',
                backgroundPosition: 'left center',
                backgroundRepeat: 'no-repeat',
                transform: `translate(${handLeftOffsetX}%, ${handLeftOffsetY}%) scaleX(${handLeftScaleX / 100}) scaleY(${handLeftScaleY / 100})`,
                transformOrigin: 'left center',
                filter: `${characterSharpness !== 100 ? `contrast(${characterSharpness / 100}) ` : ''}drop-shadow(0 0 4px rgba(0,255,65,0.15)) drop-shadow(0 0 12px rgba(0,255,65,0.1))`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${topelayerImg})`,
                backgroundSize: 'contain',
                backgroundPosition: 'right center',
                backgroundRepeat: 'no-repeat',
                transform: `translate(${handRightOffsetX}%, ${handRightOffsetY}%) scaleX(${handRightScaleX / 100}) scaleY(${handRightScaleY / 100})`,
                transformOrigin: 'right center',
                filter: `${characterSharpness !== 100 ? `contrast(${characterSharpness / 100}) ` : ''}drop-shadow(0 0 4px rgba(0,255,65,0.15)) drop-shadow(0 0 12px rgba(0,255,65,0.1))`,
              }}
            />
          </div>
        )}
        {electricitySparks}
        {ductTapeStrips.length > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {ductTapeStrips.map((s) => (
                <line
                  key={s.id}
                  x1={s.x1 * 100}
                  y1={s.y1 * 100}
                  x2={s.x2 * 100}
                  y2={s.y2 * 100}
                  stroke="rgba(180,180,180,0.95)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  filter="drop-shadow(0 0 1px rgba(0,0,0,0.5))"
                />
              ))}
            </svg>
            {ductTapeStrips.map((s) => {
              const midX = (s.x1 + s.x2) / 2;
              const midY = (s.y1 + s.y2) / 2;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemoveDuctTape?.(s.id); }}
                  style={{
                    position: 'absolute',
                    left: `${midX * 100}%`,
                    top: `${midY * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                  title={`Remove duct tape (click to remove)`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
