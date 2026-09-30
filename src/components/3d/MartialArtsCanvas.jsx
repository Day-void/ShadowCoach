import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useCoachStore } from '@/lib/store/useCoachStore';

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

/**
 * Builds martial arts animations:
 * - stance: Active orthodox rhythm with rhythmic weight transfer and high guard
 * - jab: Lead snap with pronating knuckles & instant retraction
 * - cross: Power rear cross pivoting through the rear hip & ball of the foot
 * - kick: Full Thai roundhouse kick with pivoting plant foot and hip rotation
 * - squat: Level change & combat squat drive
 * - slip: Centerline defensive deflection & roll
 */
function createMartialArtsClip(action) {
  const act = (action || 'stance').toLowerCase();

  if (act === 'jab') {
    const dur = 1.4;
    return new THREE.AnimationClip('jab', dur, [
      qt('spine', [0, 0.15, 0.35, 0.6, dur],
         [[5, 0, 0], [6, 4, 0], [6, 0, 0], [5, 0, 0], [5, 0, 0]]),
      qt('l_shoulder', [0, 0.15, 0.3, 0.55, dur],
         [[-10, -20, 0], [-45, -10, 0], [-85, 0, 0], [-25, -18, 0], [-10, -20, 0]]),
      qt('l_elbow', [0, 0.15, 0.3, 0.55, dur],
         [[-45, 0, 0], [-20, 0, 0], [0, 0, 0], [-35, 0, 0], [-45, 0, 0]]),
      qt('r_shoulder', [0, 0.3, dur],
         [[-12, 22, 0], [-12, 25, 0], [-12, 22, 0]]),
      qt('r_elbow', [0, dur], [[-48, 0, 0], [-48, 0, 0]]),
      pt('hips', [0, 0.25, 0.5, dur],
         [[0, 0.95, 0], [0, 0.94, 0.05], [0, 0.95, 0], [0, 0.95, 0]]),
    ]);
  }

  if (act === 'cross') {
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

  if (act === 'kick') {
    const dur = 2.2;
    return new THREE.AnimationClip('kick', dur, [
      pt('hips', [0, 0.5, 1.1, 1.6, dur],
         [[0, 0.95, 0], [0, 0.98, -0.04], [0, 1.0, -0.02], [0, 0.96, 0], [0, 0.95, 0]]),
      qt('spine', [0, 0.4, 1.0, 1.5, dur],
         [[5, 0, 0], [-8, 20, -12], [-10, 25, -15], [0, 6, -2], [5, 0, 0]]),
      // Plant left foot and pivot
      qt('l_ankle', [0, 0.5, 1.1, 1.6, dur],
         [[0, 0, 0], [0, 45, 0], [0, 50, 0], [0, 10, 0], [0, 0, 0]]),
      // Chamber & extend right roundhouse
      qt('r_hip', [0, 0.35, 0.7, 1.1, 1.6, dur],
         [[0, 0, -6], [-40, -15, 30], [-75, -25, 70], [-70, -20, 65], [0, 0, -6], [0, 0, -6]]),
      qt('r_knee', [0, 0.35, 0.75, 1.1, 1.6, dur],
         [[0, 0, 0], [60, 0, 0], [10, 0, 0], [45, 0, 0], [0, 0, 0], [0, 0, 0]]),
      // Arm swing for counter-momentum
      qt('r_shoulder', [0, 0.6, 1.1, 1.6, dur],
         [[-10, 20, 0], [25, 10, 0], [30, 5, 0], [-5, 18, 0], [-10, 20, 0]]),
      qt('l_shoulder', [0, 0.6, 1.1, dur],
         [[-10, -20, 0], [-25, -15, 0], [-25, -15, 0], [-10, -20, 0]]),
    ]);
  }

  if (act === 'squat') {
    const dur = 2.4;
    return new THREE.AnimationClip('squat', dur, [
      pt('hips', [0, 0.6, 1.2, 1.7, dur],
         [[0, 0.95, 0], [0, 0.95, 0], [0, 0.58, 0], [0, 0.95, 0], [0, 0.95, 0]]),
      qt('spine', [0, 0.6, 1.2, 1.7, dur],
         [[5, 0, 0], [5, 0, 0], [20, 0, 0], [5, 0, 0], [5, 0, 0]]),
      qt('l_hip', [0, 0.6, 1.2, 1.7, dur],
         [[0, 0, 6], [0, 0, 6], [-42, 0, 14], [0, 0, 6], [0, 0, 6]]),
      qt('r_hip', [0, 0.6, 1.2, 1.7, dur],
         [[0, 0, -6], [0, 0, -6], [-42, 0, -14], [0, 0, -6], [0, 0, -6]]),
      qt('l_knee', [0, 0.6, 1.2, 1.7, dur],
         [[0, 0, 0], [0, 0, 0], [84, 0, 0], [0, 0, 0], [0, 0, 0]]),
      qt('r_knee', [0, 0.6, 1.2, 1.7, dur],
         [[0, 0, 0], [0, 0, 0], [84, 0, 0], [0, 0, 0], [0, 0, 0]]),
      qt('l_shoulder', [0, 0.6, 1.2, 1.7, dur],
         [[-8, -20, 0], [-8, -20, 0], [-65, -8, 0], [-8, -20, 0], [-8, -20, 0]]),
      qt('r_shoulder', [0, 0.6, 1.2, 1.7, dur],
         [[-8, 20, 0], [-8, 20, 0], [-65, 8, 0], [-8, 20, 0], [-8, 20, 0]]),
    ]);
  }

  if (act === 'slip') {
    const dur = 1.8;
    return new THREE.AnimationClip('slip', dur, [
      qt('spine', [0, 0.3, 0.6, 0.9, 1.2, 1.5, dur],
         [[5, 0, 0], [5, 0, -18], [6, 0, -6], [5, 0, 0], [5, 0, 18], [5, 0, 0], [5, 0, 0]]),
      qt('chest', [0, 0.3, 0.6, 0.9, 1.2, 1.5, dur],
         [[0, 0, 0], [0, 0, -12], [8, 0, -4], [0, 0, 0], [0, 0, 12], [0, 0, 0], [0, 0, 0]]),
      pt('hips', [0, 0.3, 0.6, 0.9, 1.2, dur],
         [[0, 0.95, 0], [0, 0.91, 0.04], [0, 0.88, 0], [0, 0.95, 0], [0, 0.91, -0.04], [0, 0.95, 0]]),
    ]);
  }

  // Default: Orthodox Stance rhythm
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

function buildRiggedTrainerMesh(colorHex) {
  const gold = new THREE.Color(colorHex);
  const mat = new THREE.MeshStandardMaterial({
    color: gold,
    roughness: 0.32,
    metalness: 0.45,
    emissive: gold,
    emissiveIntensity: 0.08,
  });

  const makeB = (name, x, y, z) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    return b;
  };

  const root = makeB('root', 0, 0, 0);
  const hips = makeB('hips', 0, 0.95, 0);
  const spine = makeB('spine', 0, 0.20, 0);
  const chest = makeB('chest', 0, 0.25, 0);
  const neck = makeB('neck', 0, 0.22, 0);
  const head = makeB('head', 0, 0.13, 0);

  const lShoulder = makeB('l_shoulder', -0.18, 0, 0);
  const lElbow = makeB('l_elbow', -0.23, 0, 0);
  const lWrist = makeB('l_wrist', -0.22, 0, 0);
  const rShoulder = makeB('r_shoulder', 0.18, 0, 0);
  const rElbow = makeB('r_elbow', 0.23, 0, 0);
  const rWrist = makeB('r_wrist', 0.22, 0, 0);

  const lHip = makeB('l_hip', -0.10, -0.05, 0);
  const lKnee = makeB('l_knee', 0, -0.43, 0);
  const lAnkle = makeB('l_ankle', 0, -0.41, 0);
  const rHip = makeB('r_hip', 0.10, -0.05, 0);
  const rKnee = makeB('r_knee', 0, -0.43, 0);
  const rAnkle = makeB('r_ankle', 0, -0.41, 0);

  root.add(hips);
  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);
  chest.add(lShoulder); lShoulder.add(lElbow); lElbow.add(lWrist);
  chest.add(rShoulder); rShoulder.add(rElbow); rElbow.add(rWrist);
  hips.add(lHip); lHip.add(lKnee); lKnee.add(lAnkle);
  hips.add(rHip); rHip.add(rKnee); rKnee.add(rAnkle);

  const bones = [
    root, hips, spine, chest, neck, head,
    lShoulder, lElbow, lWrist,
    rShoulder, rElbow, rWrist,
    lHip, lKnee, lAnkle,
    rHip, rKnee, rAnkle,
  ];
  const skeleton = new THREE.Skeleton(bones);
  const B = {};
  bones.forEach((b, i) => { B[b.name] = i; });

  const segments = [];
  const addSegment = (geo, boneIdx) => {
    const count = geo.attributes.position.count;
    const si = new Float32Array(count * 4);
    const sw = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      si[i * 4] = boneIdx;
      sw[i * 4] = 1.0;
    }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    segments.push(geo);
  };

  const cyl = (rt, rb, h, wx, wy, wz, rx=0, ry=0, rz=0, bIdx=0) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, 10, 2);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(wx, wy, wz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1)
    );
    g.applyMatrix4(m);
    addSegment(g, bIdx);
  };

  const sph = (r, wx, wy, wz, bIdx=0) => {
    const g = new THREE.SphereGeometry(r, 10, 8);
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(wx, wy, wz));
    addSegment(g, bIdx);
  };

  const PI2 = Math.PI / 2;
  // Torso
  cyl(0.12, 0.10, 0.22, 0, 1.15, 0, 0, 0, 0, B.spine);
  cyl(0.13, 0.12, 0.25, 0, 1.37, 0, 0, 0, 0, B.chest);
  cyl(0.045, 0.045, 0.10, 0, 1.62, 0, 0, 0, 0, B.neck);
  sph(0.11, 0, 1.73, 0, B.head);

  // Arms
  sph(0.068, -0.18, 1.52, 0, B.l_shoulder);
  cyl(0.052, 0.046, 0.21, -0.30, 1.51, 0, 0, 0, PI2, B.l_shoulder);
  cyl(0.044, 0.036, 0.19, -0.54, 1.51, 0, 0, 0, PI2, B.l_elbow);
  sph(0.05, -0.67, 1.51, 0, B.l_wrist);

  sph(0.068, 0.18, 1.52, 0, B.r_shoulder);
  cyl(0.052, 0.046, 0.21, 0.30, 1.51, 0, 0, 0, -PI2, B.r_shoulder);
  cyl(0.044, 0.036, 0.19, 0.54, 1.51, 0, 0, 0, -PI2, B.r_elbow);
  sph(0.05, 0.67, 1.51, 0, B.r_wrist);

  // Legs
  cyl(0.072, 0.062, 0.44, -0.10, 0.73, 0, 0, 0, 0, B.l_hip);
  cyl(0.056, 0.047, 0.40, -0.10, 0.30, 0, 0, 0, 0, B.l_knee);
  cyl(0.046, 0.046, 0.10, -0.10, 0.07, 0.04, 0, 0, 0, B.l_ankle);

  cyl(0.072, 0.062, 0.44, 0.10, 0.73, 0, 0, 0, 0, B.r_hip);
  cyl(0.056, 0.047, 0.40, 0.10, 0.30, 0, 0, 0, 0, B.r_knee);
  cyl(0.046, 0.046, 0.10, 0.10, 0.07, -0.04, 0, 0, 0, B.r_ankle);

  // Merge segments
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of segments) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const sIdx = new Float32Array(totalVerts * 4);
  const sWt = new Float32Array(totalVerts * 4);
  const idx = new Uint32Array(totalIndices);

  let vOff = 0;
  let iOff = 0;
  for (const g of segments) {
    const vc = g.attributes.position.count;
    pos.set(g.attributes.position.array, vOff * 3);
    if (g.attributes.normal) norm.set(g.attributes.normal.array, vOff * 3);
    sIdx.set(g.attributes.skinIndex.array, vOff * 4);
    sWt.set(g.attributes.skinWeight.array, vOff * 4);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) idx[iOff + i] = g.index.array[i] + vOff;
      iOff += g.index.count;
    } else {
      for (let i = 0; i < vc; i++) idx[iOff + i] = i + vOff;
      iOff += vc;
    }
    vOff += vc;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(sIdx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sWt, 4));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();

  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.add(root);
  mesh.bind(skeleton);
  mesh.castShadow = true;
  mesh.normalizeSkinWeights();

  return { mesh, skeleton };
}

function MartialArtsModel({ action = 'stance', playbackSpeed = 1.0, isPlaying = true, goldColor = '#d4af37' }) {
  const groupRef = useRef(null);
  const mixerRef = useRef(null);
  const actionRef = useRef(null);
  const clockRef = useRef(new THREE.Clock(false));

  const { mesh } = useMemo(() => buildRiggedTrainerMesh(goldColor), []); // Rebuild only on initial load

  useEffect(() => {
    if (!groupRef.current) return;

    if (!mixerRef.current) {
      while (groupRef.current.children.length) {
        groupRef.current.remove(groupRef.current.children[0]);
      }
      groupRef.current.add(mesh);

      const mixer = new THREE.AnimationMixer(mesh);
      const clip = createMartialArtsClip(action);
      const act = mixer.clipAction(clip);
      act.setLoop(THREE.LoopRepeat, Infinity);
      act.timeScale = playbackSpeed;
      if (isPlaying) {
        act.play();
        clockRef.current.start();
      }
      mixerRef.current = mixer;
      actionRef.current = act;
    } else {
      // Smooth cross-fade to new martial arts action (.fadeIn / .fadeOut / .crossFadeTo)
      const prevAction = actionRef.current;
      const nextClip = createMartialArtsClip(action);
      const nextAction = mixerRef.current.clipAction(nextClip);

      nextAction.reset();
      nextAction.setLoop(THREE.LoopRepeat, Infinity);
      nextAction.timeScale = playbackSpeed;
      nextAction.play();

      if (prevAction) {
        prevAction.crossFadeTo(nextAction, 0.3, true);
      }
      actionRef.current = nextAction;
    }
  }, [action]);

  useEffect(() => {
    if (!actionRef.current) return;
    actionRef.current.timeScale = playbackSpeed;
    if (isPlaying) {
      if (!clockRef.current.running) clockRef.current.start();
      actionRef.current.play();
    } else {
      clockRef.current.stop();
      actionRef.current.paused = true;
    }
  }, [playbackSpeed, isPlaying]);

  useFrame(() => {
    if (!mixerRef.current || !isPlaying) return;
    const dt = clockRef.current.getDelta();
    mixerRef.current.update(dt);
  });

  return <group ref={groupRef} position={[0, -0.95, 0]} />;
}

export default function MartialArtsCanvas({
  currentAction = 'stance',
  playbackSpeed = 1.0,
  isPlaying = true,
  showGrid = true,
  onResetView = null,
}) {
  const { theme } = useCoachStore();
  const isLight = theme === 'light';
  const controlsRef = useRef(null);

  const GOLD = isLight ? '#8a6e0c' : '#d4af37';
  const BG = isLight ? '#f4f5f8' : '#08080c';

  return (
    <div style={{ width: '100%', height: 350, position: 'relative', background: BG, borderRadius: 12, overflow: 'hidden' }}>
      <Canvas
        shadows
        camera={{ position: [0, 1.45, 2.7], fov: 45 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={isLight ? 1.2 : 0.6} />
        <directionalLight
          position={[3, 5, 3]}
          intensity={isLight ? 1.7 : 2.4}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          color={isLight ? '#fffdf7' : '#fff5cc'}
        />
        <directionalLight position={[-3, 4, -2]} intensity={isLight ? 0.7 : 1.3} color={GOLD} />
        <pointLight position={[0, 4, 1]} intensity={0.6} color={isLight ? '#ffffff' : '#ffd060'} />

        {/* Footwork Grid Positioning Floor */}
        {showGrid && (
          <gridHelper
            args={[6, 12, GOLD, isLight ? '#cbd5e1' : '#27272a']}
            position={[0, 0.001, 0]}
          />
        )}

        <ContactShadows
          position={[0, 0.002, 0]}
          opacity={isLight ? 0.35 : 0.65}
          scale={4}
          blur={2.5}
          far={1.6}
          color={isLight ? '#64748b' : '#ca8a04'}
        />

        <MartialArtsModel
          action={currentAction}
          playbackSpeed={playbackSpeed}
          isPlaying={isPlaying}
          goldColor={GOLD}
        />

        {/* Orbit Controls with bounded angles */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 0.85, 0]}
          enablePan={false}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={1.4}
          maxDistance={5.0}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>

      <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6, zIndex: 10 }}>
        <button
          onClick={() => {
            if (controlsRef.current) controlsRef.current.reset();
            if (onResetView) onResetView();
          }}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: `1px solid ${GOLD}44`,
            color: GOLD,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 10,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Reset View
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: isLight ? '#64748b' : '#a1a1aa', pointerEvents: 'none' }}>
        Drag to orbit · Scroll to zoom
      </div>
    </div>
  );
}
