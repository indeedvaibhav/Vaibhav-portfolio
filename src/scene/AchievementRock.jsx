import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { createAsteroidGeometry } from '../utils/asteroidGeometry';
import { ASTEROID } from '../utils/constants';
import useStore from '../hooks/useStore';
import { useAudio } from '../hooks/useAudio';

/**
 * A single achievement asteroid with PBR rock textures.
 * Uses Rock023 maps (color, normal, roughness, AO) from /public/textures/rock/.
 * Each instance gets a unique UV rotation so no two look identical.
 * Slowly rotates in place; click is only handled when in focus.
 */
export default function AchievementRock({ achievement, index }) {
  const meshRef = useRef();
  const { playClickSound } = useAudio();

  // ── Geometry — cached by seed ─────────────────────────────────────────────
  const geometry = useMemo(
    () => createAsteroidGeometry(achievement.seed),
    [achievement.seed]
  );

  // ── Load PBR texture maps (shared across all instances via cache) ─────────
  const [colorMap, normalMap, roughnessMap, aoMap] = useTexture([
    '/textures/rock/color.jpg',
    '/textures/rock/normal.jpg',
    '/textures/rock/roughness.jpg',
    '/textures/rock/ao.jpg',
  ]);

  // ── Per-asteroid UV rotation — computed once from seed ───────────────────
  const uvRotation = useMemo(
    () => achievement.seed * Math.PI * 2,
    [achievement.seed]
  );

  // Apply UV rotation & repeat to every map (Three.js shares the cached texture
  // object, so we clone per instance to avoid overwriting each other's settings)
  const [cMap, nMap, rMap, aMap] = useMemo(() => {
    const clone = (t) => {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.rotation = uvRotation;
      c.center.set(0.5, 0.5);
      c.needsUpdate = true;
      return c;
    };
    return [clone(colorMap), clone(normalMap), clone(roughnessMap), clone(aoMap)];
  }, [colorMap, normalMap, roughnessMap, aoMap, uvRotation]);

  // ── Accent tint & emissive ─────────────────────────────────────────────────
  const accentTint = useMemo(
    () => new THREE.Color(achievement.color).multiplyScalar(0.35),
    [achievement.color]
  );
  const emissiveColor = useMemo(
    () => new THREE.Color(achievement.color),
    [achievement.color]
  );

  // ── Unique slow rotation axis derived from seed ───────────────────────────
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
        // ── PBR maps ──────────────────────────────────────────
        map={cMap}
        normalMap={nMap}
        normalMapType={THREE.TangentSpaceNormalMap}
        normalScale={new THREE.Vector2(2.5, 2.5)}
        roughnessMap={rMap}
        aoMap={aMap}
        aoMapIntensity={1.2}
        // ── Surface properties ─────────────────────────────────
        roughness={1.0}
        metalness={0.0}
        // Subtle accent tint — keeps rock dark & believable
        color={accentTint}
        // ── Emissive "charged" glow ────────────────────────────
        emissive={emissiveColor}
        emissiveIntensity={0.08}
        // ── Tone mapping handled by renderer ───────────────────
        toneMapped={true}
      />
    </mesh>
  );
}
