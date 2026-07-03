import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../utils/scrollState';
import { INTRO_END } from '../../utils/constants';
import {
  STAR_NOISE_GLSL,
  starSurfaceVertex,
  starSurfaceFragment,
  coronaVertex,
  coronaFragment,
  flareVertex,
  flareFragment,
  heatVertex,
  heatFragment,
} from './starShaders';

const CORONA_LAYERS = [
  { scale: 1.14, intensity: 0.55, layer: 0.0 },
  { scale: 1.32, intensity: 0.32, layer: 1.0 },
  { scale: 1.58, intensity: 0.16, layer: 2.0 },
];

function makeFlareMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#ffcc66') },
    },
    vertexShader: flareVertex,
    fragmentShader: flareFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function randomFlare() {
  const theta = Math.random() * Math.PI * 2;
  const phi = (Math.random() - 0.5) * Math.PI * 0.65;
  return {
    id: Math.random(),
    theta,
    phi,
    length: 0.35 + Math.random() * 0.45,
    width: 0.04 + Math.random() * 0.04,
    birth: 0,
    duration: 2 + Math.random() * 3,
    arc: 0.25 + Math.random() * 0.5,
  };
}

/**
 * Physically-inspired cinematic star — surface, corona, flares, heat shimmer.
 * Reads scroll instability when `instability` prop is omitted.
 */
export default function CinematicStar({ radius = 1, instability: instabilityProp }) {
  const flaresRef = useRef([]);
  const flareMeshes = useRef([]);
  const nextFlareAt = useRef(2 + Math.random() * 3);
  const pulsePhase = useRef(Math.random() * Math.PI * 2);

  const surfaceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uInstability: { value: 0 },
      uPulse: { value: 0 },
    }),
    [],
  );

  const coronaUniforms = useMemo(
    () =>
      CORONA_LAYERS.map((layer) => ({
        uTime: { value: 0 },
        uIntensity: { value: layer.intensity },
        uLayer: { value: layer.layer },
        uInstability: { value: 0 },
        uColor: { value: new THREE.Color('#ffaa44') },
      })),
    [],
  );

  const surfaceMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: surfaceUniforms,
        vertexShader: STAR_NOISE_GLSL + starSurfaceVertex,
        fragmentShader: STAR_NOISE_GLSL + starSurfaceFragment,
        toneMapped: false,
      }),
    [surfaceUniforms],
  );

  const coronaMaterials = useMemo(
    () =>
      coronaUniforms.map(
        (uniforms) =>
          new THREE.ShaderMaterial({
            uniforms,
            vertexShader: STAR_NOISE_GLSL + coronaVertex,
            fragmentShader: STAR_NOISE_GLSL + coronaFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            toneMapped: false,
          }),
      ),
    [coronaUniforms],
  );

  const flareMaterials = useMemo(
    () => [makeFlareMaterial(), makeFlareMaterial()],
    [],
  );

  const heatMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0.6 },
        },
        vertexShader: STAR_NOISE_GLSL + heatVertex,
        fragmentShader: heatFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );

  const spawnFlare = useCallback((time) => {
    if (flaresRef.current.length >= 2) return;
    const flare = randomFlare();
    flare.birth = time;
    flaresRef.current.push(flare);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const instability =
      instabilityProp ?? Math.min(1, scrollState.progress / INTRO_END);

    const pulse = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2) / 10 + pulsePhase.current);
    surfaceUniforms.uTime.value = t;
    surfaceUniforms.uInstability.value = instability;
    surfaceUniforms.uPulse.value = pulse;

    coronaUniforms.forEach((u) => {
      u.uTime.value = t;
      u.uInstability.value = instability;
    });

    heatMaterial.uniforms.uTime.value = t;
    heatMaterial.uniforms.uOpacity.value = 0.45 + instability * 0.35 + pulse * 0.08;

    if (t >= nextFlareAt.current) {
      spawnFlare(t);
      nextFlareAt.current = t + (3.5 - instability * 1.5) + Math.random() * 4;
    }

    if (instability > 0.15 && Math.random() < 0.002 * instability) {
      spawnFlare(t);
    }

    flaresRef.current = flaresRef.current.filter((flare) => t - flare.birth < flare.duration);

    flareMeshes.current.forEach((mesh, i) => {
      const flare = flaresRef.current[i];
      const mat = flareMaterials[i];
      if (!flare || !mesh) {
        if (mesh) mesh.visible = false;
        return;
      }

      const age = t - flare.birth;
      const life = age / flare.duration;
      const fade = life < 0.15 ? life / 0.15 : life > 0.75 ? (1 - life) / 0.25 : 1;

      const x = Math.cos(flare.phi) * Math.cos(flare.theta);
      const y = Math.sin(flare.phi);
      const z = Math.cos(flare.phi) * Math.sin(flare.theta);
      const normal = new THREE.Vector3(x, y, z).normalize();

      mesh.position.copy(normal.clone().multiplyScalar(radius * 1.02));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), normal);
      mesh.rotateY(flare.arc * Math.sin(age * 2.5));
      mesh.scale.set(flare.length * radius, flare.width * radius, 1);
      mesh.visible = true;
      mat.uniforms.uOpacity.value = fade * (0.55 + instability * 0.25);
    });
  });

  return (
    <group>
      <mesh scale={radius * 2.35}>
        <ringGeometry args={[0.42, 0.62, 64]} />
        <primitive object={heatMaterial} attach="material" />
      </mesh>

      {CORONA_LAYERS.map((layer, i) => (
        <mesh
          key={layer.layer}
          scale={radius * layer.scale}
          material={coronaMaterials[i]}
        >
          <sphereGeometry args={[1, 48, 48]} />
        </mesh>
      ))}

      <mesh scale={radius} material={surfaceMaterial}>
        <sphereGeometry args={[1, 96, 96]} />
      </mesh>

      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(el) => { flareMeshes.current[i] = el; }}
          visible={false}
          material={flareMaterials[i]}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}
