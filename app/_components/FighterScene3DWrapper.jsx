'use client';

/**
 * FighterScene3DWrapper
 *
 * Next.js dynamic import with ssr:false is mandatory for @react-three/fiber
 * because Three.js requires browser APIs (WebGL, canvas, window).
 *
 * While the 3D scene loads, we show a polished loading skeleton that matches
 * the final card dimensions so there's no layout shift.
 */

import dynamic from 'next/dynamic';

// Loading skeleton — matches FighterScene3D dimensions
function LoadingSkeleton({ isLight }) {
  const GOLD = isLight ? '#8a6e0c' : '#d4af37';
  const BG   = isLight ? '#f8f9fa' : '#111118';
  const border = isLight ? '#e2e8f0' : 'rgba(212,175,55,0.18)';

  return (
    <div style={{ background: BG, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', minHeight: 560 }}>
      {/* Header shimmer */}
      <div style={{ padding:'12px 20px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:15, height:15, borderRadius:'50%', background:`${GOLD}44` }} />
        <div style={{ width:160, height:12, borderRadius:6, background:`${GOLD}22` }} />
      </div>
      {/* Tab shimmer */}
      <div style={{ display:'flex', gap:4, padding:'10px 16px 6px' }}>
        {['punch','squat','slip','freestyle'].map(t => (
          <div key={t} style={{ flex:1, height:30, borderRadius:8, background:`${GOLD}11` }} />
        ))}
      </div>
      {/* Canvas area with animated center pulse */}
      <div style={{ height:340, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background: isLight ? '#f0f0f4' : '#0a0a10', gap:12 }}>
        <div style={{
          width:60, height:60, borderRadius:'50%',
          border:`3px solid ${GOLD}`,
          borderTopColor:'transparent',
          animation:'spin 1s linear infinite',
        }} />
        <p style={{ fontSize:12, color:`${GOLD}99`, fontStyle:'italic', letterSpacing:'0.1em' }}>
          Loading 3D Fighter...
        </p>
      </div>
      {/* Controls shimmer */}
      <div style={{ display:'flex', gap:8, padding:'10px 20px', borderTop:`1px solid ${border}` }}>
        <div style={{ width:80, height:32, borderRadius:8, background:`${GOLD}22` }} />
        <div style={{ width:40, height:32, borderRadius:6, background:`${GOLD}11` }} />
        <div style={{ width:40, height:32, borderRadius:6, background:`${GOLD}11` }} />
        <div style={{ width:40, height:32, borderRadius:6, background:`${GOLD}11` }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

const FighterScene3D = dynamic(
  () => import('./FighterScene3D'),
  {
    ssr: false,
    loading: ({ isLight }) => <LoadingSkeleton isLight={isLight} />,
  }
);

export default FighterScene3D;
