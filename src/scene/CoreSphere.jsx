import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CORE } from '../utils/constants';
import {
  SUN_SURFACE_VERTEX,
  SUN_SURFACE_FRAGMENT,
  FRESNEL_VERTEX,
  CORONA_FRAGMENT,
} from './shaders/coreSunShaders';

const FLARE_COUNT = 5;
const CORONA_SCALE = 1.18;
const SUN_DETAIL = 64;
const CORONA_DETAIL = 32;

function createFlareTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 200, 80, 0.9)');
  gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function randomSurfacePoint(radius) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

/**
 * Realistic shader-driven star at the origin.
 * Layers: plasma surface → corona → bloom halo → flare sprites → point lights.
 */
export default function CoreSphere() {
  const flareRefs = useRef([]);

  const sunGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(CORE.radius, SUN_DETAIL),
    [],
  );

  const coronaGeometry = useMemo(
    () => new THREE.IcosahedronGeometry(CORE.radius * CORONA_SCALE, CORONA_DETAIL),
    [],
  );

  const surfaceMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: SUN_SURFACE_VERTEX,
        fragmentShader: SUN_SURFACE_FRAGMENT,
        toneMapped: false,
      }),
    [],
  );

  const coronaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: FRESNEL_VERTEX,
        fragmentShader: CORONA_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    [],
  );



  const flareTexture = useMemo(() => createFlareTexture(), []);

  const flares = useMemo(
    () =>
      Array.from({ length: FLARE_COUNT }, (_, i) => {
        const basePos = randomSurfacePoint(CORE.radius * 1.02);
        const outward = basePos.clone().normalize();
        return {
          basePos,
          outward,
          scale: 0.3 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          period: 2 + Math.random() * 2,
          driftSpeed: 0.15 + Math.random() * 0.1,
          id: i,
        };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    surfaceMaterial.uniforms.uTime.value = t;

    flares.forEach((flare, i) => {
      const sprite = flareRefs.current[i];
      if (!sprite) return;

      const pulse =
        0.3 + 0.5 * (0.5 + 0.5 * Math.sin((t / flare.period) * Math.PI * 2 + flare.phase));
      sprite.material.opacity = pulse;

      const drift = Math.sin(t * flare.driftSpeed + flare.phase) * CORE.radius * 0.12;
      sprite.position.copy(flare.basePos).addScaledVector(flare.outward, drift);

      const scale = CORE.radius * flare.scale * (0.9 + pulse * 0.2);
      sprite.scale.set(scale, scale, 1);
    });
  });

  return (
    <group position={CORE.position}>
      {/* Layer 1 — plasma surface */}
      <mesh geometry={sunGeometry} material={surfaceMaterial} />

      {/* Layer 2 — corona glow */}
      <mesh geometry={coronaGeometry} material={coronaMaterial} />



      {/* Layer 4 — solar flare sprites */}
      {flares.map((flare, i) => (
        <sprite
          key={flare.id}
          ref={(el) => {
            flareRefs.current[i] = el;
          }}
          position={flare.basePos}
          scale={[CORE.radius * flare.scale, CORE.radius * flare.scale, 1]}
        >
          <spriteMaterial
            map={flareTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.5}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* Layer 5 — scene lighting from the star */}
      <pointLight color={0xffb454} intensity={3} distance={50} decay={1.5} />
      <pointLight color={0xff6600} intensity={0.8} distance={30} decay={2} />
    </group>
  );
}
