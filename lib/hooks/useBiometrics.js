import { useCallback } from 'react';

export function useBiometrics() {
  const calculateAngle = useCallback((p1, p2, p3) => {
    if (!p1 || !p2 || !p3) return 0;

    // Strict numerical verification
    const isValidCoord = (p) =>
      typeof p.x === 'number' && Number.isFinite(p.x) &&
      typeof p.y === 'number' && Number.isFinite(p.y);

    if (!isValidCoord(p1) || !isValidCoord(p2) || !isValidCoord(p3)) return 0;

    const z1 = typeof p1.z === 'number' && Number.isFinite(p1.z) ? p1.z : 0;
    const z2 = typeof p2.z === 'number' && Number.isFinite(p2.z) ? p2.z : 0;
    const z3 = typeof p3.z === 'number' && Number.isFinite(p3.z) ? p3.z : 0;

    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: z1 - z2 };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: z3 - z2 };
    const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

    if (mag1 * mag2 === 0 || !Number.isFinite(mag1) || !Number.isFinite(mag2)) return 0;
    const ratio = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
    const angleRad = Math.acos(ratio);
    return Number.isFinite(angleRad) ? (angleRad * 180) / Math.PI : 0;
  }, []);

  return { calculateAngle };
}
