'use client';

/**
 * WorkoutAnimationDemo
 *
 * Upgraded from HTML5 canvas stick-figure to full real-time 3D animation.
 *
 * The 3D scene is rendered via React Three Fiber + Three.js inside a
 * dynamically imported component (ssr:false — WebGL requires the browser).
 *
 * Features:
 *  - Procedurally built skinned-mesh boxer character
 *  - 4 animation clips with bone-driven keyframes: punch, squat, slip, freestyle
 *  - Smooth 60fps AnimationMixer playback with crossfade
 *  - Orbit controls (drag to rotate, scroll to zoom)
 *  - Contact shadows, HDR environment, octagon floor ring
 *  - Phase HUD badge (High Guard → Jab Strike → Reset → Cross Strike…)
 *  - Play/Pause + 0.5×/1.0×/1.5× speed controls
 *  - Info panel: coaching cues, target muscles, form checklist
 *  - Full dark/light theme support via Zustand store
 *  - Loading skeleton prevents layout shift during WebGL initialization
 */

import FighterScene3DWrapper from './FighterScene3DWrapper';

export default function WorkoutAnimationDemo({ activeTrackingType }) {
  return (
    <FighterScene3DWrapper initialMode={activeTrackingType || 'punch'} />
  );
}
