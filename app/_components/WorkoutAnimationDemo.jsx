'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Info, Sparkles } from 'lucide-react';

/**
 * Exercise demonstration definitions.
 * Contains kinematic keyframes (normalized coordinates [0..1]) for:
 * 1. Straight Left Jab & Cross Combo (punch)
 * 2. Combat Squat Drive (squat)
 * 3. Slip Defense & Duck Counter (slip)
 * 4. Freestyle Combat Flow (freestyle)
 */
const EXERCISE_DEMOS = {
  punch: {
    title: 'Lead Jab & Cross Execution',
    cue: 'Snap the lead jab from high guard, pivot rear foot on the cross, rotate knuckles over.',
    badge: 'Strike Biomechanics',
    targetMuscles: 'Deltoids, Triceps, Core Rotators',
    formKeys: [
      'Chin tucked, rear glove glued to cheek',
      'Extend lead fist to full extension without locking hyperextension',
      'Instant snap-retraction back to defensive guard',
    ],
    // Cycle duration in milliseconds
    duration: 2200,
    // Keyframe generator function based on progress (0 to 1)
    getKeyframes: (t) => {
      // Loop phase: 0..0.4 (jab extend & snap), 0.4..0.5 (brief reset), 0.5..0.9 (cross extend), 0.9..1.0 (reset)
      let leftPunchExt = 0;
      let rightPunchExt = 0;
      let torsoTwist = 0;

      if (t < 0.22) {
        // Jab throwing out
        leftPunchExt = Math.sin((t / 0.22) * (Math.PI / 2));
      } else if (t < 0.42) {
        // Jab returning
        leftPunchExt = Math.cos(((t - 0.22) / 0.2) * (Math.PI / 2));
      } else if (t >= 0.5 && t < 0.72) {
        // Cross throwing out with torso rotation
        const progress = (t - 0.5) / 0.22;
        rightPunchExt = Math.sin(progress * (Math.PI / 2));
        torsoTwist = progress * 12;
      } else if (t >= 0.72 && t < 0.92) {
        // Cross returning
        const progress = (t - 0.72) / 0.2;
        rightPunchExt = Math.cos(progress * (Math.PI / 2));
        torsoTwist = (1 - progress) * 12;
      }

      // Base pose coordinates (standing orthodox stance, front facing slightly angled)
      const head = { x: 0.50 + (torsoTwist * 0.001), y: 0.18 };
      const lShoulder = { x: 0.43 - (torsoTwist * 0.002), y: 0.28 };
      const rShoulder = { x: 0.57 + (torsoTwist * 0.002), y: 0.28 };

      // Left arm (Lead Jab):
      // Guard position: elbow at (0.42, 0.42), wrist at (0.47, 0.26)
      // Extended position: wrist punches forward & slightly inward (0.48, 0.24)
      const lElbow = {
        x: 0.42 + (leftPunchExt * 0.06),
        y: 0.40 - (leftPunchExt * 0.10),
      };
      const lWrist = {
        x: 0.47 - (leftPunchExt * 0.16),
        y: 0.28 - (leftPunchExt * 0.02),
      };

      // Right arm (Rear Cross):
      // Guard position: elbow at (0.58, 0.41), wrist at (0.54, 0.28)
      // Extended position: wrist shoots straight forward (0.50, 0.26)
      const rElbow = {
        x: 0.58 - (rightPunchExt * 0.06),
        y: 0.41 - (rightPunchExt * 0.11),
      };
      const rWrist = {
        x: 0.54 - (rightPunchExt * 0.12),
        y: 0.28 - (rightPunchExt * 0.02),
      };

      // Lower body: orthodox staggered stance
      const lHip = { x: 0.46, y: 0.54 };
      const rHip = { x: 0.54, y: 0.54 };

      const lKnee = { x: 0.44, y: 0.72 };
      const rKnee = { x: 0.57, y: 0.73 };

      const lAnkle = { x: 0.43, y: 0.90 };
      const rAnkle = { x: 0.59 + (rightPunchExt * 0.02), y: 0.90 - (rightPunchExt * 0.02) }; // Heel pivots up slightly on cross

      return {
        head, lShoulder, rShoulder,
        lElbow, rElbow, lWrist, rWrist,
        lHip, rHip, lKnee, rKnee, lAnkle, rAnkle,
        phase: leftPunchExt > 0.5 ? 'LEAD JAB EXTENSION' : rightPunchExt > 0.5 ? 'POWER CROSS DRIVE' : 'GUARD STANCE',
      };
    },
  },

  squat: {
    title: 'Combat Squat & Level Change',
    cue: 'Push hips back, sink thighs to 90 degrees parallel, drive forcefully upward through heels.',
    badge: 'Lower Chain Power',
    targetMuscles: 'Quadriceps, Glutes, Hamstrings, Erector Spinae',
    formKeys: [
      'Keep chest elevated and eyes facing straight ahead',
      'Hips sink below knee crease without knees caving inward',
      'Exhale explosively as you drive back to full stand',
    ],
    duration: 2600,
    getKeyframes: (t) => {
      // 0..0.45: descending, 0.45..0.55: bottom pause, 0.55..1.0: ascending
      let depth = 0;
      if (t < 0.45) {
        depth = Math.sin((t / 0.45) * (Math.PI / 2));
      } else if (t < 0.55) {
        depth = 1.0;
      } else {
        const asc = (t - 0.55) / 0.45;
        depth = Math.cos(asc * (Math.PI / 2));
      }

      // Height drop multiplier
      const drop = depth * 0.15;
      const kneeFlex = depth * 0.07;

      const head = { x: 0.50, y: 0.18 + drop };
      const lShoulder = { x: 0.42, y: 0.28 + drop };
      const rShoulder = { x: 0.58, y: 0.28 + drop };

      // Hands held at combat guard throughout
      const lElbow = { x: 0.40, y: 0.40 + drop };
      const rElbow = { x: 0.60, y: 0.40 + drop };
      const lWrist = { x: 0.47, y: 0.27 + drop };
      const rWrist = { x: 0.53, y: 0.27 + drop };

      // Hips drop down and widen slightly
      const lHip = { x: 0.45 - (depth * 0.02), y: 0.52 + drop };
      const rHip = { x: 0.55 + (depth * 0.02), y: 0.52 + drop };

      // Knees flare slightly outward on squat descent
      const lKnee = { x: 0.39 - (kneeFlex * 0.6), y: 0.70 + (drop * 0.4) };
      const rKnee = { x: 0.61 + (kneeFlex * 0.6), y: 0.70 + (drop * 0.4) };

      // Ankles stay grounded
      const lAnkle = { x: 0.42, y: 0.90 };
      const rAnkle = { x: 0.58, y: 0.90 };

      return {
        head, lShoulder, rShoulder,
        lElbow, rElbow, lWrist, rWrist,
        lHip, rHip, lKnee, rKnee, lAnkle, rAnkle,
        phase: depth > 0.85 ? 'DEEP DEPTH (90°)' : depth > 0.3 ? (t < 0.5 ? 'DESCENT PHASE' : 'EXPLOSIVE ASCENT') : 'TOP LOCKOUT',
      };
    },
  },

  slip: {
    title: 'Centerline Slip & Roll Defense',
    cue: 'Bend at knees and waist, displace head 4-6 inches off center, load the counter strike.',
    badge: 'Head Movement & Evasion',
    targetMuscles: 'Obliques, Transverse Abdominis, Glute Medius',
    formKeys: [
      'Never take eyes off opponent while slipping',
      'Rotate shoulders to load return hook or cross',
      'Keep gloves glued to high defensive guard',
    ],
    duration: 2400,
    getKeyframes: (t) => {
      // Slip left (0..0.4), center (0.4..0.5), slip right (0.5..0.9), center (0.9..1.0)
      let displacement = 0;
      let duckDrop = 0;

      if (t < 0.2) {
        displacement = -Math.sin((t / 0.2) * (Math.PI / 2));
      } else if (t < 0.4) {
        displacement = -Math.cos(((t - 0.2) / 0.2) * (Math.PI / 2));
      } else if (t >= 0.5 && t < 0.7) {
        displacement = Math.sin(((t - 0.5) / 0.2) * (Math.PI / 2));
      } else if (t >= 0.7 && t < 0.9) {
        displacement = Math.cos(((t - 0.7) / 0.2) * (Math.PI / 2));
      }

      duckDrop = Math.abs(displacement) * 0.05;
      const headShift = displacement * 0.12;
      const shoulderTilt = displacement * 0.03;

      const head = { x: 0.50 + headShift, y: 0.18 + duckDrop };
      const lShoulder = { x: 0.42 + (headShift * 0.6), y: 0.28 + shoulderTilt + duckDrop };
      const rShoulder = { x: 0.58 + (headShift * 0.6), y: 0.28 - shoulderTilt + duckDrop };

      const lElbow = { x: 0.40 + (headShift * 0.5), y: 0.41 + duckDrop };
      const rElbow = { x: 0.60 + (headShift * 0.5), y: 0.41 + duckDrop };

      const lWrist = { x: 0.46 + headShift, y: 0.26 + duckDrop };
      const rWrist = { x: 0.54 + headShift, y: 0.26 + duckDrop };

      const lHip = { x: 0.46 + (headShift * 0.2), y: 0.53 + (duckDrop * 0.4) };
      const rHip = { x: 0.54 + (headShift * 0.2), y: 0.53 + (duckDrop * 0.4) };

      const lKnee = { x: 0.43, y: 0.72 + (duckDrop * 0.2) };
      const rKnee = { x: 0.57, y: 0.72 + (duckDrop * 0.2) };

      const lAnkle = { x: 0.42, y: 0.90 };
      const rAnkle = { x: 0.58, y: 0.90 };

      return {
        head, lShoulder, rShoulder,
        lElbow, rElbow, lWrist, rWrist,
        lHip, rHip, lKnee, rKnee, lAnkle, rAnkle,
        phase: displacement < -0.4 ? 'SLIP LEFT (EVADE JAB)' : displacement > 0.4 ? 'SLIP RIGHT (EVADE CROSS)' : 'CENTERLINE GUARD',
      };
    },
  },

  freestyle: {
    title: 'Flow Combat & Combination Freestyle',
    cue: 'Blend punches, lateral slips, and level drops in a fluid, continuous combat rhythm.',
    badge: 'Dynamic Fusion',
    targetMuscles: 'Full Kinetic Chain & Cardiovascular Engine',
    formKeys: [
      'Maintain continuous guard integrity between shots',
      'Change levels right after punching combinations',
      'Stay light on the balls of your feet',
    ],
    duration: 3600,
    getKeyframes: (t) => {
      // 4 phases: Jab (0..0.25), Cross (0.25..0.5), Slip (0.5..0.75), Level-drop squat (0.75..1.0)
      if (t < 0.25) {
        return EXERCISE_DEMOS.punch.getKeyframes(t / 0.5);
      } else if (t < 0.5) {
        return EXERCISE_DEMOS.punch.getKeyframes(0.5 + ((t - 0.25) / 0.5));
      } else if (t < 0.75) {
        return EXERCISE_DEMOS.slip.getKeyframes((t - 0.5) / 0.25);
      } else {
        return EXERCISE_DEMOS.squat.getKeyframes((t - 0.75) / 0.25);
      }
    },
  },
};

export default function WorkoutAnimationDemo({ trackingType = 'punch', onClose }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentType, setCurrentType] = useState(trackingType || 'punch');
  const [currentPhase, setCurrentPhase] = useState('');
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);

  // Sync prop changes
  useEffect(() => {
    if (trackingType && EXERCISE_DEMOS[trackingType]) {
      setCurrentType(trackingType);
    }
  }, [trackingType]);

  const activeDemo = EXERCISE_DEMOS[currentType] || EXERCISE_DEMOS.punch;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    startTimeRef.current = performance.now();

    const render = (now) => {
      if (!isRunning) return;

      const elapsed = (now - startTimeRef.current) * speedMultiplier;
      const progress = (elapsed % activeDemo.duration) / activeDemo.duration;

      const kf = activeDemo.getKeyframes(progress);
      setCurrentPhase(kf.phase);

      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark subtle gradient backdrop
      ctx.clearRect(0, 0, width, height);

      // Floor grid / shadow zone
      const gradient = ctx.createRadialGradient(
        width * 0.5, height * 0.90, 10,
        width * 0.5, height * 0.90, width * 0.4
      );
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0.15)');
      gradient.addColorStop(0.5, 'rgba(212, 175, 55, 0.04)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(width * 0.5, height * 0.90, width * 0.35, height * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();

      // Centerline alignment guide
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.10);
      ctx.lineTo(width * 0.5, height * 0.90);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Convert normalized point to canvas pixels
      const pt = (p) => ({ x: p.x * width, y: p.y * height });

      const head = pt(kf.head);
      const lSh = pt(kf.lShoulder);
      const rSh = pt(kf.rShoulder);
      const lEl = pt(kf.lElbow);
      const rEl = pt(kf.rElbow);
      const lWr = pt(kf.lWrist);
      const rWr = pt(kf.rWrist);
      const lHp = pt(kf.lHip);
      const rHp = pt(kf.rHip);
      const lKn = pt(kf.lKnee);
      const rKn = pt(kf.rKnee);
      const lAn = pt(kf.lAnkle);
      const rAn = pt(kf.rAnkle);

      // Bones connections
      const bones = [
        [lSh, rSh],
        [lSh, lEl], [lEl, lWr],
        [rSh, rEl], [rEl, rWr],
        [lSh, lHp], [rSh, rHp],
        [lHp, rHp],
        [lHp, lKn], [lKn, lAn],
        [rHp, rKn], [rKn, rAn],
      ];

      // Draw bone linkages with glowing gold styling
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Soft glow pass
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#D4AF37';
      ctx.shadowBlur = 14;
      bones.forEach(([p1, p2]) => {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Sharp core gold line
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 0;
      bones.forEach(([p1, p2]) => {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Neck link to head
      const neckX = (lSh.x + rSh.x) / 2;
      const neckY = (lSh.y + rSh.y) / 2;
      ctx.beginPath();
      ctx.moveTo(neckX, neckY);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();

      ctx.restore();

      // Head rendering
      ctx.save();
      // Outer aura
      ctx.beginPath();
      ctx.arc(head.x, head.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#09090C';
      ctx.fill();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center head icon / visor
      ctx.beginPath();
      ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FDE68A';
      ctx.fill();
      ctx.restore();

      // Joint Nodes
      const joints = [
        lSh, rSh, lEl, rEl, lWr, rWr,
        lHp, rHp, lKn, rKn, lAn, rAn
      ];

      joints.forEach((j, i) => {
        const isWrist = i === 4 || i === 5;
        const radius = isWrist ? 6.5 : 5;

        ctx.save();
        ctx.beginPath();
        ctx.arc(j.x, j.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#09090C';
        ctx.fill();

        ctx.strokeStyle = isWrist ? '#F59E0B' : '#D4AF37';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(j.x, j.y, isWrist ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isWrist ? '#FDE68A' : '#D4AF37';
        ctx.fill();
        ctx.restore();
      });

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeDemo, isPlaying, speedMultiplier]);

  const handleRestart = () => {
    startTimeRef.current = performance.now();
  };

  return (
    <div className="rounded-2xl p-5 border text-white transition-all shadow-2xl relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #0e0e12, #14141a)',
        borderColor: 'rgba(212,175,55,0.22)',
      }}
    >
      {/* Decorative Gold Header Aura */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'linear-gradient(90deg, #d4af37, #f59e0b, #d4af37)' }}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            <Sparkles className="w-4 h-4" style={{ color: '#d4af37' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Biomechanical Form Demo
              </h3>
              <span
                className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border font-bold"
                style={{
                  color: '#d4af37',
                  borderColor: 'rgba(212,175,55,0.4)',
                  background: 'rgba(212,175,55,0.08)',
                }}
              >
                {activeDemo.badge}
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Interactive kinetic guidance for championship precision
            </p>
          </div>
        </div>

        {/* Tab Switcher for all 4 movements */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#09090c] border border-[#2a2a36]">
          {Object.keys(EXERCISE_DEMOS).map((key) => {
            const isSelected = currentType === key;
            return (
              <button
                key={key}
                onClick={() => setCurrentType(key)}
                className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-all"
                style={{
                  background: isSelected ? 'linear-gradient(135deg, #b7962e, #f59e0b)' : 'transparent',
                  color: isSelected ? '#000' : '#888899',
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage & Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Visualizer Canvas Area */}
        <div className="md:col-span-6 flex flex-col items-center">
          <div
            className="relative w-full max-w-[280px] aspect-[3/4] rounded-xl overflow-hidden bg-black/80 flex items-center justify-center"
            style={{
              border: '1.5px solid rgba(212,175,55,0.3)',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9), 0 0 20px rgba(212,175,55,0.08)',
            }}
          >
            {/* Live Movement Phase Badge */}
            <div
              className="absolute top-2.5 left-2.5 right-2.5 text-center text-[10px] font-mono font-black uppercase px-2 py-1 rounded-md tracking-wider backdrop-blur-md"
              style={{
                background: 'rgba(9,9,12,0.75)',
                border: '1px solid rgba(212,175,55,0.25)',
                color: '#fde68a',
              }}
            >
              {currentPhase || 'SYNCHRONIZING FORM'}
            </div>

            <canvas
              ref={canvasRef}
              width={280}
              height={360}
              className="w-full h-full object-contain block"
            />

            {/* Corner crosshairs */}
            <span className="absolute top-2 left-2 w-2 h-2 border-t border-l border-amber-500/50" />
            <span className="absolute top-2 right-2 w-2 h-2 border-t border-r border-amber-500/50" />
            <span className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-amber-500/50" />
            <span className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-amber-500/50" />
          </div>

          {/* Interactive Player Controls */}
          <div className="flex items-center gap-2 mt-3 w-full max-w-[280px] justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="p-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#252530] text-stone-200 border border-[#2a2a36] transition"
                title={isPlaying ? 'Pause animation' : 'Play animation'}
                aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
              </button>
              <button
                onClick={handleRestart}
                className="p-1.5 rounded-lg bg-[#1a1a22] hover:bg-[#252530] text-stone-200 border border-[#2a2a36] transition"
                title="Restart movement loop"
                aria-label="Restart movement loop"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <span className="text-stone-500 mr-1">Speed:</span>
              {[0.5, 1.0, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMultiplier(spd)}
                  className="px-1.5 py-0.5 rounded border text-[9px] font-bold transition"
                  style={{
                    borderColor: speedMultiplier === spd ? '#d4af37' : '#2a2a36',
                    background: speedMultiplier === spd ? 'rgba(212,175,55,0.15)' : '#09090c',
                    color: speedMultiplier === spd ? '#d4af37' : '#777788',
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Breakdown & Coaching Keys */}
        <div className="md:col-span-6 space-y-3.5">
          <div>
            <h4 className="text-base font-black text-white flex items-center gap-2">
              {activeDemo.title}
            </h4>
            <p className="text-xs text-amber-400/90 mt-1 font-medium leading-relaxed italic">
              &ldquo;{activeDemo.cue}&rdquo;
            </p>
          </div>

          {/* Primary target muscles */}
          <div className="p-2.5 rounded-xl bg-[#09090c] border border-[#2a2a36]">
            <div className="text-[10px] font-black uppercase tracking-wider text-stone-500 mb-0.5">
              Target Kinetic Group
            </div>
            <div className="text-xs font-semibold text-stone-300">
              {activeDemo.targetMuscles}
            </div>
          </div>

          {/* Golden Rules / Checklist */}
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
              <Info className="w-3 h-3" /> AI Biometric Alignment Keys
            </div>
            <ul className="space-y-1.5">
              {activeDemo.formKeys.map((rule, idx) => (
                <li
                  key={idx}
                  className="text-xs text-stone-300 flex items-start gap-2 leading-snug p-1.5 rounded-lg bg-[#0e0e14] border border-[#1e1e28]"
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5"
                    style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }}
                  >
                    {idx + 1}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 rounded-xl text-xs font-bold text-stone-400 hover:text-white bg-[#14141a] hover:bg-[#1a1a24] border border-[#2a2a36] transition"
            >
              Hide Demonstration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
