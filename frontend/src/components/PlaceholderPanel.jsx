import React from 'react';

function PlaceholderPanel() {
  return (
    <div
      className="placeholder-panel training-panel wankr-panel sidebar-panel"
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="font-wankr"
        style={{
          fontSize: '18px',
          color: 'var(--accent)',
          opacity: 0.5,
          letterSpacing: '2px',
        }}
      >
        Tools
      </div>
    </div>
  );
}

export default PlaceholderPanel;
