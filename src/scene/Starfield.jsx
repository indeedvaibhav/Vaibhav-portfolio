import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STARFIELD } from '../utils/constants';

/**
 * Starfield distributed along the entire camera path (z = 30 to -180).
 * Uses a rectangular volume to ensure stars are visible at every point
 * in the scroll journey, not just around the origin.
 */
export default function Starfield() {
  const ref = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(STARFIELD.count * 3);
    for (let i = 0; i < STARFIELD.count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * STARFIELD.spreadX;
      arr[i * 3 + 1] = (Math.random() - 0.5) * STARFIELD.spreadY;
      arr[i * 3 + 2] =
        STARFIELD.zMin +
        Math.random() * (STARFIELD.zMax - STARFIELD.zMin);
    }
    return arr;
  }, []);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.00003;
    }
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={STARFIELD.count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}
