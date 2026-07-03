import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CORE } from '../utils/constants';

/**
 * Central glowing core sphere at the origin.
 * The hero moment at scroll=0 — warm gold, pulsing, real bloom.
 */
export default function CoreSphere() {
  const meshRef = useRef();
  const glowRef = useRef();

  const coreColor = useMemo(() => new THREE.Color(CORE.color), []);
  const emissiveColor = useMemo(() => new THREE.Color(CORE.emissiveColor), []);

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(CORE.color) },
        intensity: { value: 1.0 },
      },
      vertexShader: `
        varying float vIntensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vIntensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        varying float vIntensity;
        void main() {
          vec3 glow = glowColor * vIntensity * intensity;
          gl_FragColor = vec4(glow, vIntensity * 0.5);
        }
      `,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const pulse =
      CORE.pulseMin +
      (CORE.pulseMax - CORE.pulseMin) * (0.5 + 0.5 * Math.sin(t * CORE.pulseSpeed));

    if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = pulse;
    }
    if (glowRef.current) {
      glowRef.current.material.uniforms.intensity.value = pulse * 0.8;
    }
  });

  return (
    <group position={CORE.position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[CORE.radius, 4]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={emissiveColor}
          emissiveIntensity={1.0}
          roughness={0.3}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={glowRef} material={glowMaterial} scale={CORE.glowScale}>
        <icosahedronGeometry args={[CORE.radius, 4]} />
      </mesh>
    </group>
  );
}
