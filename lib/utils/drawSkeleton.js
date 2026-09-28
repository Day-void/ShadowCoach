// Skeleton topology — parsed once at module load, not per-frame
const CONNECTIONS = '11-12,11-13,13-15,12-14,14-16,11-23,12-24,23-24,23-25,25-27,24-26,26-28'
  .split(',').map((pair) => pair.split('-').map(Number));
const CORE_JOINTS = [11,12,13,14,15,16,23,24,25,26,27,28];

export function drawSkeleton(ctx, landmarks, isCalibrated) {
  if (!landmarks || landmarks.length === 0) return;

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Black & Gold Biometric Palette
  // Calibrated: Radiant Championship Gold (#D4AF37) with warm amber glow
  // Uncalibrated: Deep bronze-amber (#92400E) alerting to reposition
  const goldColor = isCalibrated ? '#D4AF37' : '#B45309';
  const glowColor = isCalibrated ? 'rgba(212, 175, 55, 0.5)' : 'rgba(180, 83, 9, 0.35)';

  ctx.save();
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;

  // Draw bone lines
  CONNECTIONS.forEach(([start, end]) => {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    if (p1 && p2 && p1.visibility > 0.55 && p2.visibility > 0.55) {
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
  });

  // Draw golden joint nodes with deep obsidian center
  CORE_JOINTS.forEach((idx) => {
    const landmark = landmarks[idx];
    if (!landmark || landmark.visibility < 0.55) return;

    const cx = landmark.x * width;
    const cy = landmark.y * height;

    // Outer gold ring
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#09090C'; // Obsidian black core
    ctx.fill();
    ctx.strokeStyle = isCalibrated ? '#F59E0B' : '#78350F';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Center gold pinpoint
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
    ctx.fillStyle = isCalibrated ? '#FDE68A' : '#D97706';
    ctx.fill();
  });

  ctx.restore();
}
