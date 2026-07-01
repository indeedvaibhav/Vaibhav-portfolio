import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createAsteroidGeometry } from '../utils/asteroidGeometry';
import { ASTEROID } from '../utils/constants';
import useStore from '../hooks/useStore';
import { useAudio } from '../hooks/useAudio';

/**
 * A single achievement asteroid.
 * Slowly rotates in place. Click is only handled when in focus
 * (activeIndex matches this asteroid's index).
 */
export default function AchievementRock({ achievement, index }) {
  const meshRef = useRef();
  const { playClickSound } = useAudio();

  const geometry = useMemo(
    () => createAsteroidGeometry(achievement.seed),
    [achievement.seed]
  );

  const color = useMemo(() => new THREE.Color(achievement.color), [achievement.color]);
  const emissiveColor = useMemo(
    () => new THREE.Color(achievement.color).multiplyScalar(0.5),
    [achievement.color]
  );

  // Unique rotation axis
  const rotAxis = useMemo(() => {
    const a = new THREE.Vector3(
      Math.sin(achievement.seed * 1.7) * 0.5 + 0.5,
      Math.cos(achievement.seed * 2.3) * 0.5 + 0.5,
      Math.sin(achievement.seed * 0.9) * 0.5 + 0.5
    );
    return a.normalize();
  }, [achievement.seed]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotateOnAxis(rotAxis, ASTEROID.rotationSpeed);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    const store = useStore.getState();
    // Only respond if this asteroid is the active (in-focus) one
    if (store.activeIndex === index) {
      store.setExpandedIndex(index);
      playClickSound();
    }
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={achievement.position}
      onClick={handleClick}
    >
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={0.2}
        roughness={0.65}
        metalness={0.3}
        toneMapped={false}
      />
    </mesh>
  );
}
