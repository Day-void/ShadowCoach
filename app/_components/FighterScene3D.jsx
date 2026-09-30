'use client';

/**
 * FighterScene3D — A full 3D procedural martial arts demonstration.
 *
 * Architecture:
 *  - React Three Fiber <Canvas> renders a real-time 3D scene at 60fps
 *  - A procedurally generated skinned-mesh fighter built from Three.js geometry
 *  - 4 AnimationClip objects (punch, squat, slip, freestyle) with keyframe curves
 *  - AnimationMixer drives smooth crossfaded transitions between clips
 *  - @react-three/drei: OrbitControls, ContactShadows, Environment
 *  - Zustand theme integration for dark/light scene
 *
 * No external model files required — fighter is 100% code-generated.
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';
import { Info, Sparkles, RotateCcw, Activity } from 'lucide-react';
import { useCoachStore } from '@/lib/store/useCoachStore';
import { useRealtimeTelemetryBridge } from '@/lib/hooks/useRealtimeTelemetryBridge';

// ─── Geometry merge utility (no external dep) ─────────────────────────────

function mergeBufferGeometries(geos) {
  let totalVerts   = 0;
  let totalIndices = 0;
  for (const g of geos) {
    totalVerts   += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals   = new Float32Array(totalVerts * 3);
  const skinIdxs  = new Float32Array(totalVerts * 4);
  const skinWts   = new Float32Array(totalVerts * 4);
  const indices   = new Uint32Array(totalIndices);

  let vOff = 0;
  let iOff = 0;

  for (const g of geos) {
    const vc = g.attributes.position.count;
    positions.set(g.attributes.position.array, vOff * 3);
    if (g.attributes.normal) normals.set(g.attributes.normal.array, vOff * 3);
    skinIdxs.set(g.attributes.skinIndex.array, vOff * 4);
    skinWts.set(g.attributes.skinWeight.array, vOff * 4);

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[iOff + i] = g.index.array[i] + vOff;
      }
      iOff += g.index.count;
    } else {
      for (let i = 0; i < vc; i++) indices[iOff + i] = i + vOff;
      iOff += vc;
    }
    vOff += vc;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',   new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal',     new THREE.BufferAttribute(normals,   3));
  geo.setAttribute('skinIndex',  new THREE.BufferAttribute(skinIdxs,  4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWts,   4));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

// ─── Bone helper ──────────────────────────────────────────────────────────

function makeBone(name, x, y, z) {
  const b = new THREE.Bone();
  b.name = name;
  b.position.set(x, y, z);
  return b;
}

// ─── Build skinned fighter ────────────────────────────────────────────────

function buildFighter(goldColor) {
  const gold = new THREE.Color(goldColor);
  const mat  = new THREE.MeshStandardMaterial({
    color: gold,
    roughness: 0.3,
    metalness: 0.5,
    emissive: gold,
    emissiveIntensity: 0.07,
  });

  // ── Skeleton ──
  const root      = makeBone('root', 0, 0, 0);
  const hips      = makeBone('hips', 0, 0.95, 0);
  const spine     = makeBone('spine', 0, 0.20, 0);
  const chest     = makeBone('chest', 0, 0.25, 0);
  const neck      = makeBone('neck', 0, 0.22, 0);
  const head      = makeBone('head', 0, 0.13, 0);

  const lShoulder = makeBone('l_shoulder', -0.18, 0, 0);
  const lElbow    = makeBone('l_elbow',    -0.23, 0, 0);
  const lWrist    = makeBone('l_wrist',    -0.22, 0, 0);
  const rShoulder = makeBone('r_shoulder',  0.18, 0, 0);
  const rElbow    = makeBone('r_elbow',     0.23, 0, 0);
  const rWrist    = makeBone('r_wrist',     0.22, 0, 0);

  const lHip      = makeBone('l_hip',    -0.10, -0.05, 0);
  const lKnee     = makeBone('l_knee',    0, -0.43, 0);
  const lAnkle    = makeBone('l_ankle',   0, -0.41, 0);
  const rHip      = makeBone('r_hip',     0.10, -0.05, 0);
  const rKnee     = makeBone('r_knee',    0, -0.43, 0);
  const rAnkle    = makeBone('r_ankle',   0, -0.41, 0);

  root.add(hips);
  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);
  chest.add(lShoulder); lShoulder.add(lElbow); lElbow.add(lWrist);
  chest.add(rShoulder); rShoulder.add(rElbow); rElbow.add(rWrist);
  hips.add(lHip); lHip.add(lKnee); lKnee.add(lAnkle);
  hips.add(rHip); rHip.add(rKnee); rKnee.add(rAnkle);

  const allBones = [
    root, hips, spine, chest, neck, head,        // 0-5
    lShoulder, lElbow, lWrist,                    // 6-8
    rShoulder, rElbow, rWrist,                    // 9-11
    lHip, lKnee, lAnkle,                          // 12-14
    rHip, rKnee, rAnkle,                          // 15-17
  ];
  const skeleton = new THREE.Skeleton(allBones);

  // ── Bone index map ──
  const B = {};
  allBones.forEach((b, i) => { B[b.name] = i; });

  // ── Geometry helpers ──
  const segments = [];

  function seg(geo, boneIdx) {
    const count = geo.attributes.position.count;
    const si = new Float32Array(count * 4);
    const sw = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      si[i * 4] = boneIdx;
      sw[i * 4] = 1.0;
    }
    geo.setAttribute('skinIndex',  new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    segments.push(geo);
  }

  // Helper to create a cylinder segment in world space
  function cyl(rt, rb, h, wx, wy, wz, rx=0, ry=0, rz=0, bIdx=0) {
    const g = new THREE.CylinderGeometry(rt, rb, h, 10, 2);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(wx, wy, wz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1,1,1)
    );
    g.applyMatrix4(m);
    seg(g, bIdx);
  }

  function sph(r, wx, wy, wz, bIdx=0) {
    const g = new THREE.SphereGeometry(r, 10, 8);
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(wx, wy, wz));
    seg(g, bIdx);
  }

  const PI2 = Math.PI / 2;

  // Torso
  cyl(0.115, 0.10, 0.22, 0, 1.15, 0, 0, 0, 0, B['spine']);
  cyl(0.125, 0.115, 0.25, 0, 1.37, 0, 0, 0, 0, B['chest']);
  // Neck
  cyl(0.042, 0.042, 0.10, 0, 1.62, 0, 0, 0, 0, B['neck']);
  // Head
  sph(0.11, 0, 1.73, 0, B['head']);

  // Left arm
  sph(0.068, -0.18, 1.52, 0, B['l_shoulder']);
  cyl(0.052, 0.046, 0.21, -0.30, 1.51, 0, 0, 0, PI2, B['l_shoulder']);
  cyl(0.044, 0.036, 0.19, -0.54, 1.51, 0, 0, 0, PI2, B['l_elbow']);
  sph(0.046, -0.67, 1.51, 0, B['l_wrist']);

  // Right arm
  sph(0.068, 0.18, 1.52, 0, B['r_shoulder']);
  cyl(0.052, 0.046, 0.21, 0.30, 1.51, 0, 0, 0, -PI2, B['r_shoulder']);
  cyl(0.044, 0.036, 0.19, 0.54, 1.51, 0, 0, 0, -PI2, B['r_elbow']);
  sph(0.046, 0.67, 1.51, 0, B['r_wrist']);

  // Left leg
  cyl(0.072, 0.062, 0.44, -0.10, 0.73, 0, 0, 0, 0, B['l_hip']);
  cyl(0.056, 0.047, 0.40, -0.10, 0.30, 0, 0, 0, 0, B['l_knee']);
  cyl(0.046, 0.046, 0.10, -0.10, 0.07, 0.04, 0, 0, 0, B['l_ankle']);

  // Right leg
  cyl(0.072, 0.062, 0.44, 0.10, 0.73, 0, 0, 0, 0, B['r_hip']);
  cyl(0.056, 0.047, 0.40, 0.10, 0.30, 0, 0, 0, 0, B['r_knee']);
  cyl(0.046, 0.046, 0.10, 0.10, 0.07, -0.04, 0, 0, 0, B['r_ankle']);

  const merged = mergeBufferGeometries(segments);
  const mesh = new THREE.SkinnedMesh(merged, mat);
  mesh.add(root);
  mesh.bind(skeleton);
  mesh.castShadow = true;
  mesh.normalizeSkinWeights();

  return { mesh, skeleton };
}

// ─── Animation Clip builders ──────────────────────────────────────────────

const DEG = Math.PI / 180;

function qt(name, times, eulers) {
  const vals = [];
  for (const [x, y, z] of eulers) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x * DEG, y * DEG, z * DEG));
    vals.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, vals);
}

function pt(name, times, positions) {
  return new THREE.VectorKeyframeTrack(`${name}.position`, times, positions.flat());
}

function buildClip(mode) {
  const m = (mode || 'stance').toLowerCase();

  if (m === 'jab' || m === 'punch') {
    const dur = 1.6;
    return new THREE.AnimationClip('punch', dur, [
      // Spine rotates for cross
      qt('spine', [0, 0.2, 0.4, 0.5, 0.75, 0.95, dur],
         [[5,0,0],[5,0,0],[5,0,0],[5,10,0],[5,10,0],[5,0,0],[5,0,0]]),
      // LEFT jab — snaps forward with knuckles pronating
      qt('l_shoulder', [0, 0.12, 0.22, 0.38, 0.42, dur],
         [[-8,-20,0],[-35,-12,0],[-85,-2,0],[-18,-20,0],[-8,-20,0],[-8,-20,0]]),
      qt('l_elbow', [0, 0.12, 0.22, 0.38, 0.42, dur],
         [[-42,0,0],[-18,0,0],[0,0,0],[-32,0,0],[-42,0,0],[-42,0,0]]),
      // RIGHT cross — power hip & shoulder rotation
      qt('r_shoulder', [0, 0.45, 0.58, 0.75, 0.9, 0.95, dur],
         [[-8,20,0],[-8,20,0],[-18,14,0],[-80,2,0],[-14,20,0],[-8,20,0],[-8,20,0]]),
      qt('r_elbow', [0, 0.45, 0.58, 0.75, 0.9, 0.95, dur],
         [[-42,0,0],[-42,0,0],[-28,0,0],[0,0,0],[-28,0,0],[-42,0,0],[-42,0,0]]),
      // Rear foot pivot on cross
      qt('r_ankle', [0, 0.45, 0.75, 0.95, dur],
         [[0,0,0], [0,0,0], [-15, 20, 0], [0,0,0], [0,0,0]]),
      pt('l_hip', [0, dur], [[-0.10, -0.05, 0.12], [-0.10, -0.05, 0.12]]),
      pt('r_hip', [0, dur], [[0.10, -0.05, -0.12], [0.10, -0.05, -0.12]]),
    ]);
  }

  if (m === 'cross') {
    const dur = 1.8;
    return new THREE.AnimationClip('cross', dur, [
      qt('spine', [0, 0.25, 0.55, 0.85, dur],
         [[5, 0, 0], [6, 16, 0], [6, 18, 0], [5, 4, 0], [5, 0, 0]]),
      qt('r_shoulder', [0, 0.25, 0.5, 0.8, dur],
         [[-10, 20, 0], [-40, 10, 0], [-82, 0, 0], [-25, 18, 0], [-10, 20, 0]]),
      qt('r_elbow', [0, 0.25, 0.5, 0.8, dur],
         [[-45, 0, 0], [-20, 0, 0], [0, 0, 0], [-35, 0, 0], [-45, 0, 0]]),
      qt('l_shoulder', [0, 0.5, dur],
         [[-12, -22, 0], [-15, -25, 0], [-12, -22, 0]]),
      qt('r_hip', [0, 0.25, 0.5, 0.8, dur],
         [[0, 0, -6], [10, 15, -6], [12, 18, -6], [2, 4, -6], [0, 0, -6]]),
      qt('r_ankle', [0, 0.25, 0.5, 0.8, dur],
         [[0, 0, 0], [-15, 20, 0], [-20, 25, 0], [-5, 5, 0], [0, 0, 0]]),
    ]);
  }

  if (m === 'kick') {
    const dur = 2.2;
    return new THREE.AnimationClip('kick', dur, [
      pt('hips', [0, 0.45, 1.0, 1.5, dur],
         [[0, 0.95, 0], [0, 0.98, -0.04], [0, 1.0, -0.02], [0, 0.96, 0], [0, 0.95, 0]]),
      qt('spine', [0, 0.4, 0.95, 1.5, dur],
         [[5, 0, 0], [-8, 20, -12], [-10, 25, -15], [0, 6, -2], [5, 0, 0]]),
      // Plant left foot and pivot 45 degrees
      qt('l_ankle', [0, 0.45, 1.0, 1.5, dur],
         [[0, 0, 0], [0, 45, 0], [0, 50, 0], [0, 10, 0], [0, 0, 0]]),
      // Chamber & extend right roundhouse kick
      qt('r_hip', [0, 0.35, 0.7, 1.1, 1.6, dur],
         [[0, 0, -6], [-40, -15, 30], [-75, -25, 70], [-70, -20, 65], [0, 0, -6], [0, 0, -6]]),
      qt('r_knee', [0, 0.35, 0.75, 1.1, 1.6, dur],
         [[0, 0, 0], [60, 0, 0], [10, 0, 0], [45, 0, 0], [0, 0, 0], [0, 0, 0]]),
      // Arm swing for counter-momentum
      qt('r_shoulder', [0, 0.55, 1.0, 1.5, dur],
         [[-10, 20, 0], [25, 10, 0], [30, 5, 0], [-5, 18, 0], [-10, 20, 0]]),
      qt('l_shoulder', [0, 0.55, 1.0, dur],
         [[-10, -20, 0], [-25, -15, 0], [-25, -15, 0], [-10, -20, 0]]),
    ]);
  }

  if (m === 'squat') {
    const dur = 2.4;
    return new THREE.AnimationClip('squat', dur, [
      pt('hips', [0, 0.6, 1.2, 1.7, dur],
         [[0,0.95,0],[0,0.95,0],[0,0.58,0],[0,0.95,0],[0,0.95,0]]),
      qt('spine', [0, 0.6, 1.2, 1.7, dur],
         [[5,0,0],[5,0,0],[20,0,0],[5,0,0],[5,0,0]]),
      qt('l_hip', [0, 0.6, 1.2, 1.7, dur],
         [[0,0,6],[0,0,6],[-42,0,14],[0,0,6],[0,0,6]]),
      qt('r_hip', [0, 0.6, 1.2, 1.7, dur],
         [[0,0,-6],[0,0,-6],[-42,0,-14],[0,0,-6],[0,0,-6]]),
      qt('l_knee', [0, 0.6, 1.2, 1.7, dur],
         [[0,0,0],[0,0,0],[84,0,0],[0,0,0],[0,0,0]]),
      qt('r_knee', [0, 0.6, 1.2, 1.7, dur],
         [[0,0,0],[0,0,0],[84,0,0],[0,0,0],[0,0,0]]),
      qt('l_shoulder', [0, 0.6, 1.2, 1.7, dur],
         [[-8,-20,0],[-8,-20,0],[-65,-8,0],[-8,-20,0],[-8,-20,0]]),
      qt('r_shoulder', [0, 0.6, 1.2, 1.7, dur],
         [[-8,20,0],[-8,20,0],[-65,8,0],[-8,20,0],[-8,20,0]]),
      qt('l_elbow', [0, 0.6, 1.2, 1.7, dur],
         [[-42,0,0],[-42,0,0],[-8,0,0],[-42,0,0],[-42,0,0]]),
      qt('r_elbow', [0, 0.6, 1.2, 1.7, dur],
         [[-42,0,0],[-42,0,0],[-8,0,0],[-42,0,0],[-42,0,0]]),
    ]);
  }

  if (m === 'slip') {
    const dur = 1.8;
    return new THREE.AnimationClip('slip', dur, [
      qt('spine', [0, 0.28, 0.56, 0.84, 1.12, 1.40, 1.68, dur],
         [[5,0,0],[5,0,-20],[5,0,-8],[5,0,0],[5,0,8],[5,0,20],[5,0,5],[5,0,0]]),
      qt('chest', [0, 0.28, 0.56, 0.84, 1.12, 1.40, 1.68, dur],
         [[0,0,0],[0,0,-10],[8,0,-4],[5,0,0],[8,0,4],[0,0,10],[0,0,4],[0,0,0]]),
      qt('neck', [0, 0.28, 0.56, 0.84, 1.12, 1.40, 1.68, dur],
         [[0,0,0],[0,0,8],[0,0,3],[0,0,0],[0,0,-3],[0,0,-8],[0,0,-3],[0,0,0]]),
      pt('hips', [0, 0.28, 0.56, 0.84, 1.12, 1.40, 1.68, dur],
         [[0,0.95,0],[0,0.90,0.04],[0,0.86,0],[0,0.95,0],[0,0.90,-0.04],[0,0.90,0.04],[0,0.92,0],[0,0.95,0]]),
      qt('l_shoulder', [0, dur], [[-8,-20,0], [-8,-20,0]]),
      qt('r_shoulder', [0, dur], [[-8,20,0],  [-8,20,0]]),
      qt('l_elbow', [0, dur], [[-42,0,0], [-42,0,0]]),
      qt('r_elbow', [0, dur], [[-42,0,0], [-42,0,0]]),
    ]);
  }

  if (m === 'stance') {
    const dur = 2.0;
    return new THREE.AnimationClip('stance', dur, [
      pt('hips', [0, 0.5, 1.0, 1.5, dur],
         [[0, 0.95, 0], [0, 0.965, 0.02], [0, 0.95, 0], [0, 0.94, -0.02], [0, 0.95, 0]]),
      qt('spine', [0, 0.5, 1.0, 1.5, dur],
         [[5, 0, 0], [4, 1.5, 0], [5, 0, 0], [6, -1.5, 0], [5, 0, 0]]),
      qt('l_shoulder', [0, 0.5, 1.0, 1.5, dur],
         [[-10, -20, 0], [-12, -21, 0], [-10, -20, 0], [-8, -19, 0], [-10, -20, 0]]),
      qt('r_shoulder', [0, 0.5, 1.0, 1.5, dur],
         [[-10, 20, 0], [-8, 19, 0], [-10, 20, 0], [-12, 21, 0], [-10, 20, 0]]),
      qt('l_elbow', [0, 1.0, dur], [[-45, 0, 0], [-42, 0, 0], [-45, 0, 0]]),
      qt('r_elbow', [0, 1.0, dur], [[-48, 0, 0], [-45, 0, 0], [-48, 0, 0]]),
      pt('l_hip', [0, dur], [[-0.10, -0.05, 0.12], [-0.10, -0.05, 0.12]]),
      pt('r_hip', [0, dur], [[0.10, -0.05, -0.12], [0.10, -0.05, -0.12]]),
    ]);
  }

  // freestyle — jab → cross → kick → slip → squat (4.4s loop)
  const dur = 4.4;
  return new THREE.AnimationClip('freestyle', dur, [
    qt('spine', [0, 0.25, 0.5, 0.75, 1.1, 1.6, 2.1, 2.7, 3.4, dur],
       [[5,0,0],[5,0,0],[5,7,0],[5,7,0],[-8,18,-10],[5,0,-16],[5,0,-6],[20,0,0],[5,0,0],[5,0,0]]),
    qt('l_shoulder', [0, 0.12, 0.22, 0.42, 1.6, 2.7, dur],
       [[-8,-20,0],[-85,-3,0],[-8,-20,0],[-8,-20,0],[-8,-20,0],[-60,-8,0],[-8,-20,0]]),
    qt('l_elbow', [0, 0.12, 0.22, 0.42, 2.7, dur],
       [[-42,0,0],[0,0,0],[-42,0,0],[-42,0,0],[-10,0,0],[-42,0,0]]),
    qt('r_shoulder', [0, 0.55, 0.68, 0.80, 1.1, 2.7, dur],
       [[-8,20,0],[-8,20,0],[-12,13,0],[-78,3,0],[25,8,0],[-60,8,0],[-8,20,0]]),
    qt('r_elbow', [0, 0.55, 0.68, 0.80, 1.1, 2.7, dur],
       [[-42,0,0],[-42,0,0],[-26,0,0],[0,0,0],[-42,0,0],[-10,0,0],[-42,0,0]]),
    qt('r_hip', [0, 0.9, 1.25, 1.6, 2.7, dur],
       [[0,0,-6], [-35,-15,25], [-75,-25,65], [0,0,-6], [-40,0,-14], [0,0,-6]]),
    qt('r_knee', [0, 0.9, 1.25, 1.6, 2.7, dur],
       [[0,0,0], [50,0,0], [10,0,0], [0,0,0], [82,0,0], [0,0,0]]),
    pt('hips', [0, 1.6, 2.1, 2.7, 3.4, dur],
       [[0,0.95,0],[0,0.95,0],[0,0.90,0],[0,0.58,0],[0,0.95,0],[0,0.95,0]]),
  ]);
}

const PHASES = {
  stance:    ['Orthodox Stance', 'Weight Transfer', 'Guard Rhythm', 'Active Balance', 'Breathing Rhythm'],
  punch:     ['High Guard', 'Jab Loading', 'Jab Strike', 'Jab Snap', 'Reset', 'Cross Loading', 'Cross Strike', 'Cross Snap'],
  kick:      ['Guard', 'Plant & Pivot', 'Chamber Knee', 'Roundhouse Extension', 'Hip Drive', 'Chamber Return', 'Guard'],
  squat:     ['Standing', 'Initiating', 'Descent', 'Parallel Depth', 'Drive Phase', 'Lock Out'],
  slip:      ['High Guard', 'Slip Left', 'Roll Under', 'Center Reset', 'Slip Right', 'Roll Under', 'Recover'],
  freestyle: ['Guard', 'Jab Strike', 'Reset', 'Cross Strike', 'Kick Drive', 'Slip', 'Squat Load', 'Explode', 'Flow'],
};

// ─── FighterModel — lives inside Canvas ───────────────────────────────────

function FighterModel({ mode, isPlaying, speed, onPhase, goldColor }) {
  const groupRef  = useRef();
  const mixerRef  = useRef();
  const actionRef = useRef();
  const clockRef  = useRef(new THREE.Clock(false));
  const frameRef  = useRef(0);

  // Build fighter once, update gold color via material
  const { mesh } = useMemo(() => buildFighter(goldColor), []); // intentional: rebuild only once

  useEffect(() => {
    if (!groupRef.current) return;

    if (!mixerRef.current) {
      // First mount: clear and initialize
      while (groupRef.current.children.length) groupRef.current.remove(groupRef.current.children[0]);
      groupRef.current.add(mesh);

      const clip = buildClip(mode);
      const mixer = new THREE.AnimationMixer(mesh);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.timeScale = speed;
      if (isPlaying) {
        action.play();
        clockRef.current.start();
      }

      mixerRef.current = mixer;
      actionRef.current = action;
    } else {
      // Smooth crossfade transition between movement modes
      const oldAction = actionRef.current;
      const newClip = buildClip(mode);
      const newAction = mixerRef.current.clipAction(newClip);
      newAction.reset();
      newAction.setLoop(THREE.LoopRepeat, Infinity);
      newAction.timeScale = speed;
      newAction.play();

      if (oldAction) {
        oldAction.crossFadeTo(newAction, 0.35, true);
      }

      actionRef.current = newAction;
    }

    return () => {
      // Clean up on component unmount
    };
  }, [mode]); // Re-crossfade smoothly on mode change

  // Sync playback
  useEffect(() => {
    if (!actionRef.current) return;
    actionRef.current.timeScale = speed;
    if (isPlaying) {
      if (!clockRef.current.running) clockRef.current.start();
      actionRef.current.play();
    } else {
      clockRef.current.stop();
      actionRef.current.paused = true;
    }
  }, [isPlaying, speed]);

  useFrame(() => {
    if (!mixerRef.current || !isPlaying) return;
    const dt = clockRef.current.getDelta();
    mixerRef.current.update(dt);

    // Report phase every 6 frames to avoid excessive re-renders
    frameRef.current++;
    if (frameRef.current % 6 === 0 && actionRef.current && onPhase) {
      const t    = actionRef.current.time % actionRef.current.getClip().duration;
      const frac = t / actionRef.current.getClip().duration;
      const arr  = PHASES[mode] || ['Active'];
      onPhase(arr[Math.floor(frac * arr.length) % arr.length]);
    }
  });

  return <group ref={groupRef} position={[0, -0.95, 0]} />;
}

// ─── Exercise info ────────────────────────────────────────────────────────

const INFO = {
  stance: {
    badge: 'Fundamental Stance',
    muscles: 'Calves · Core Stabilisers · Postural Erectors',
    cue: 'Orthodox combat guard: lead shoulder turned 45°, chin tucked, weight distributed 55/45.',
    tips: [
      'Elbows tucked tight against the ribcage to protect the liver and spleen',
      'Weight resting primarily on the balls of the feet with knees slightly soft',
      'Rear heel slightly elevated off the floor for explosive forward or backward propulsion',
      'Hands at eye level with relaxed shoulders until strike initiation',
    ],
  },
  punch: {
    badge: 'Strike Biomechanics',
    muscles: 'Deltoids · Triceps · Core Rotators · Lats',
    cue: 'Snap from high guard, pivot rear foot on the cross, rotate knuckles at full extension.',
    tips: [
      'Chin tucked — rear glove glued to cheek at all times',
      'Full extension without hyperextending the elbow joint',
      'Instant snap-retraction back to guard after each strike',
      'Drive power from hip rotation, not just the shoulder',
    ],
  },
  kick: {
    badge: 'Thai Roundhouse & Pivot',
    muscles: 'Hip Flexors · Glutes · Abdominals · Calves',
    cue: 'Step out 45°, pivot on the ball of the lead foot, turn hip over like swinging a baseball bat.',
    tips: [
      'Pivot support foot at least 90° to open hips fully for power delivery',
      'Swing trailing arm down along the hip to generate counter-torque momentum',
      'Keep lead hand glued to cheek or frame out to shield against counter-crosses',
      'Drive with the lower third of the shin bone rather than the foot',
    ],
  },
  squat: {
    badge: 'Lower Body Power',
    muscles: 'Quads · Glutes · Hamstrings · Core Stabilisers',
    cue: 'Sit hips to 90° parallel, drive through heels, explode upward — neutral spine throughout.',
    tips: [
      'Feet shoulder-width, toes 15-30° outward',
      'Knees track over toes — no cave-in on the drive',
      'Arms extend forward to counterbalance the descent',
      'Inhale down, exhale forcefully on the explosive drive',
    ],
  },
  slip: {
    badge: 'Head Movement',
    muscles: 'Obliques · Erector Spinae · Hip Flexors · Adductors',
    cue: 'Move entire body 4 inches off centerline, roll underneath, exit opposite side.',
    tips: [
      'Move whole body — not just head — off the centerline',
      'Eyes stay up and on target through the slip',
      'Knees slightly bent — use hips and legs, not just waist',
      'Return to high guard immediately after exiting the slip',
    ],
  },
  freestyle: {
    badge: 'Full Combination Flow',
    muscles: 'Full Body — Cardiovascular + Strength + Coordination',
    cue: 'Continuous output: jab → cross → kick → slip → squat. Never stop between techniques.',
    tips: [
      'Maintain forward pressure and constant ring presence',
      'Link each technique to the next with no dead time',
      'Feet always in motion — constant rhythmic weight transfer',
      'Every combo finishes back in high guard before the next',
    ],
  },
};

// ─── Main Component ───────────────────────────────────────────────────────

export default function FighterScene3D({ initialMode = 'punch' }) {
  const { theme } = useCoachStore();
  const isLight = theme === 'light';

  const [mode,      setMode]      = useState(initialMode);
  const [isPlaying, setPlaying]   = useState(true);
  const [speed,     setSpeed]     = useState(1.0);
  const [phase,     setPhase]     = useState('High Guard');
  const [showInfo,  setShowInfo]  = useState(false);
  const [showGrid,  setShowGrid]  = useState(true);
  const [autoSync,  setAutoSync]  = useState(false);
  const controlsRef               = useRef(null);

  // Real-time backend state synchronization
  const {
    currentAction: backendAction,
    playbackSpeed: backendSpeed,
    isConnected: isBackendConnected,
    setAction: setBackendAction,
  } = useRealtimeTelemetryBridge({
    initialAction: initialMode,
    initialSpeed: 1.0,
    autoSync,
    syncIntervalMs: 3500,
  });

  // When live sync is active, react to incoming backend states
  useEffect(() => {
    if (autoSync && backendAction) {
      const normalized = backendAction === 'jab' ? 'punch' : backendAction;
      setMode(normalized);
    }
  }, [autoSync, backendAction]);

  useEffect(() => {
    if (autoSync && typeof backendSpeed === 'number') {
      setSpeed(backendSpeed);
    }
  }, [autoSync, backendSpeed]);

  const GOLD = isLight ? '#8a6e0c' : '#d4af37';
  const BG   = isLight ? '#f0f0f4' : '#0a0a10';

  const cardBg     = isLight ? '#ffffff' : '#111118';
  const cardBorder = isLight ? '#e2e8f0' : 'rgba(212,175,55,0.18)';
  const textCol    = isLight ? '#1a1a2e' : '#f0f0f8';
  const mutedCol   = isLight ? '#64748b' : '#9ca3af';
  const tabIdle    = isLight ? { bg:'#f1f5f9', color:'#64748b', border:'#e2e8f0' }
                             : { bg:'#1a1a24', color:'#6b7280', border:'#2a2a38' };

  const info = INFO[mode] || INFO.stance;
  const TABS = ['stance', 'punch', 'kick', 'squat', 'slip', 'freestyle'];
  const LABELS = { stance: 'Stance', punch: 'Punch', kick: 'Kick', squat: 'Squat', slip: 'Slip', freestyle: 'Combo' };

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:`1px solid ${cardBorder}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Sparkles size={15} color={GOLD} />
          <span style={{ fontSize:12, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color: GOLD }}>
            3D Form Demonstration
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Real-time backend sync toggle */}
          <button
            onClick={() => setAutoSync((v) => !v)}
            title="Toggle Live Backend Telemetry Synchronization"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 14,
              cursor: 'pointer',
              background: autoSync ? 'rgba(34,197,94,0.15)' : tabIdle.bg,
              border: `1px solid ${autoSync ? '#22c55e' : tabIdle.border}`,
              color: autoSync ? '#22c55e' : mutedCol,
            }}
          >
            <Activity size={11} className={autoSync ? 'animate-pulse' : ''} />
            <span>{autoSync ? (isBackendConnected ? 'LIVE SYNC' : 'CONNECTING...') : 'MANUAL'}</span>
          </button>

          <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20, background:`${GOLD}22`, color:GOLD, border:`1px solid ${GOLD}44` }}>
            {phase}
          </span>
          <button
            onClick={() => setShowInfo(v => !v)}
            style={{ background:'none', border:'none', cursor:'pointer', color: showInfo ? GOLD : mutedCol, padding:4 }}
            aria-label="Toggle info">
            <Info size={15} />
          </button>
        </div>
      </div>

      {/* ── Mode tabs ── */}
      <div style={{ display:'flex', gap:4, padding:'10px 16px 6px' }}>
        {TABS.map(t => (
          <button key={t}
            onClick={() => {
              setMode(t);
              setPhase('High Guard');
              setBackendAction(t);
            }}
            style={{
              flex:1, padding:'6px 4px', borderRadius:8, fontSize:11, fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.08em', cursor:'pointer', transition:'all 0.18s',
              ...(mode === t
                ? { background: GOLD, color: isLight ? '#fff' : '#0a0a10', border:`1px solid ${GOLD}` }
                : { background: tabIdle.bg, color: tabIdle.color, border:`1px solid ${tabIdle.border}` })
            }}>
            {LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── 3D Canvas ── */}
      <div style={{ height: 340, background: BG, position:'relative' }}>
        <Canvas
          shadows
          camera={{ position: [0, 1.5, 2.8], fov: 44 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          style={{ background: BG }}
          frameloop="always"
        >
          {/* Studio Lighting - 100% self-contained, no external network fetch */}
          <ambientLight intensity={isLight ? 1.2 : 0.65} />
          <directionalLight
            position={[3, 6, 3]} intensity={isLight ? 1.8 : 2.5}
            castShadow
            shadow-mapSize-width={1024} shadow-mapSize-height={1024}
            color={isLight ? '#fff9f0' : '#fff5cc'}
          />
          {/* Key & rim lights for realistic fighter definition */}
          <directionalLight position={[-3, 4, -2]} intensity={isLight ? 0.6 : 1.2} color={GOLD} />
          <pointLight position={[-2.5, 3, -1]} intensity={0.8} color={GOLD} />
          <pointLight position={[2.5, 2, 2]} intensity={0.5} color={isLight ? '#ffffff' : '#ffd060'} />
          <hemisphereLight
            skyColor={isLight ? '#f8fafc' : '#1e1b4b'}
            groundColor={isLight ? '#e2e8f0' : '#0a0a10'}
            intensity={isLight ? 0.7 : 0.4}
          />

          {/* Soft contact shadows on the floor */}
          <ContactShadows
            position={[0, 0.002, 0]}
            opacity={isLight ? 0.30 : 0.60}
            scale={4} blur={2.8} far={1.8}
            color={isLight ? '#667' : '#c8a020'}
          />

          {/* The 3D Fighter */}
          <FighterModel
            mode={mode}
            isPlaying={isPlaying}
            speed={speed}
            onPhase={setPhase}
            goldColor={GOLD}
          />

          {/* Footwork Grid Mapping Floor */}
          {showGrid && (
            <gridHelper
              args={[6, 12, GOLD, isLight ? '#cbd5e1' : '#27272a']}
              position={[0, 0.001, 0]}
            />
          )}

          {/* Octagon floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[7, 7]} />
            <meshStandardMaterial color={isLight ? '#dde' : '#09090e'} roughness={0.95} />
          </mesh>

          {/* Octagon ring border */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <ringGeometry args={[2.0, 2.04, 8]} />
            <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.4} />
          </mesh>

          {/* Inner ring line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <ringGeometry args={[1.5, 1.52, 8]} />
            <meshStandardMaterial color={GOLD} opacity={0.4} transparent roughness={0.5} />
          </mesh>

          {/* Orbit controls */}
          <OrbitControls
            ref={controlsRef}
            target={[0, 0.85, 0]}
            enablePan={false}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2.05}
            minDistance={1.5}
            maxDistance={5.5}
            enableDamping
            dampingFactor={0.07}
          />
        </Canvas>

        {/* Canvas hint overlay */}
        <div style={{
          position:'absolute', bottom:10, right:12,
          fontSize:10, color:`${mutedCol}aa`, pointerEvents:'none',
          fontStyle:'italic', letterSpacing:'0.04em',
        }}>
          Drag to orbit · Scroll to zoom
        </div>
      </div>

      {/* ── Playback controls ── */}
      <div style={{ display:'flex', alignItems:'center', flexWrap: 'wrap', gap:8, padding:'10px 20px', borderTop:`1px solid ${cardBorder}` }}>
        <button
          onClick={() => setPlaying(v => !v)}
          style={{
            display:'flex', alignItems:'center', gap:6, padding:'6px 16px',
            borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer',
            background: GOLD, color: isLight ? '#fff' : '#0a0a10', border:'none',
          }}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <button
          onClick={() => {
            if (controlsRef.current) {
              controlsRef.current.reset();
            }
          }}
          title="Reset Camera Angle"
          style={{
            display:'flex', alignItems:'center', gap:4, padding:'6px 12px',
            borderRadius:8, fontWeight:600, fontSize:11, cursor:'pointer',
            background: tabIdle.bg, color: tabIdle.color, border:`1px solid ${tabIdle.border}`,
          }}>
          <RotateCcw size={12} />
          Reset View
        </button>

        <button
          onClick={() => setShowGrid(v => !v)}
          title="Toggle Footwork Positioning Grid"
          style={{
            display:'flex', alignItems:'center', gap:4, padding:'6px 12px',
            borderRadius:8, fontWeight:600, fontSize:11, cursor:'pointer',
            background: showGrid ? `${GOLD}22` : tabIdle.bg,
            color: showGrid ? GOLD : tabIdle.color,
            border: `1px solid ${showGrid ? GOLD : tabIdle.border}`,
          }}>
          Grid: {showGrid ? 'ON' : 'OFF'}
        </button>

        <span style={{ fontSize:11, fontWeight:600, color: mutedCol, marginLeft: 4 }}>Speed:</span>
        {[0.25, 0.5, 1.0, 1.5].map(s => (
          <button key={s} onClick={() => setSpeed(s)}
            style={{
              padding:'5px 9px', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
              ...(speed === s
                ? { background: GOLD, color: isLight ? '#fff' : '#0a0a10' }
                : { background: tabIdle.bg, color: tabIdle.color, border:`1px solid ${tabIdle.border}` })
            }}>
            {s === 0.25 ? '0.25× (Slow-Mo)' : `${s}×`}
          </button>
        ))}
      </div>

      {/* ── Info panel ── */}
      {showInfo && (
        <div style={{ padding:'8px 20px 18px', borderTop:`1px solid ${cardBorder}` }}>
          <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color:GOLD, marginBottom:6 }}>
            {info.badge}
          </p>
          <p style={{ fontSize:12, fontStyle:'italic', color:mutedCol, marginBottom:10, lineHeight:1.55 }}>
            &ldquo;{info.cue}&rdquo;
          </p>
          <p style={{ fontSize:12, fontWeight:600, color:textCol, marginBottom:8 }}>
            🎯 <span style={{ color:GOLD }}>{info.muscles}</span>
          </p>
          <ul style={{ margin:0, padding:0, listStyle:'none', display:'grid', gap:4 }}>
            {info.tips.map((tip, i) => (
              <li key={i} style={{ display:'flex', gap:8, fontSize:11, color:mutedCol, lineHeight:1.5 }}>
                <span style={{ color:GOLD, flexShrink:0 }}>✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
