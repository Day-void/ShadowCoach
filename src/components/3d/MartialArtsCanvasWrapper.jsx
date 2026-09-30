'use client';

import dynamic from 'next/dynamic';

const MartialArtsCanvas = dynamic(
  () => import('./MartialArtsCanvas'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%',
        height: 350,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        borderRadius: 12,
        border: '1px solid rgba(212,175,55,0.2)',
        gap: 12,
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid #d4af37',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite',
        }} />
        <span style={{ fontSize: 12, color: '#d4af37', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Initializing 3D Telemetry Canvas...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    ),
  }
);

export default MartialArtsCanvas;
