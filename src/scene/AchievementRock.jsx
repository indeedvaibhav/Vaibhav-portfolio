import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { createAsteroidGeometry } from '../utils/asteroidGeometry';
import { ASTEROID } from '../utils/constants';
import useStore from '../hooks/useStore';
import { useAudio } from '../hooks/useAudio';

export default function AchievementRock({ achievement, index }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const tooltipRef = useRef();
  const { playClickSound } = useAudio();

  // ── Geometry & Textures ──
  const geometry = useMemo(() => createAsteroidGeometry(achievement.seed), [achievement.seed]);

  const [colorMap, normalMap, roughnessMap, aoMap] = useTexture([
    '/textures/rock/color.jpg',
    '/textures/rock/normal.jpg',
    '/textures/rock/roughness.jpg',
    '/textures/rock/ao.jpg',
  ]);

  const uvRotation = useMemo(() => achievement.seed * Math.PI * 2, [achievement.seed]);

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

  const neutralColor = useMemo(() => new THREE.Color(0x888888), []);
  const emissiveColor = useMemo(() => new THREE.Color(achievement.color), [achievement.color]);

  // ── Glow Material ──
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(achievement.color) },
        opacity: { value: 0.03 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Keep glow facing camera
          vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mvPosition.xy += position.xy;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, dist) * opacity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [achievement.color]);

  const rotAxis = useMemo(() => {
    return new THREE.Vector3(
      Math.sin(achievement.seed * 1.7) * 0.5 + 0.5,
      Math.cos(achievement.seed * 2.3) * 0.5 + 0.5,
      Math.sin(achievement.seed * 0.9) * 0.5 + 0.5
    ).normalize();
  }, [achievement.seed]);

  const hoverState = useRef({ intensity: 0, tiltX: 0, tiltY: 0 });

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Base rotation
    if (meshRef.current) {
      meshRef.current.rotateOnAxis(rotAxis, ASTEROID.rotationSpeed);
    }

    // Distance check to mouse
    const meshPos = new THREE.Vector3().copy(achievement.position);
    meshPos.project(state.camera);
    
    // NDC to pixels
    const px = (meshPos.x * 0.5 + 0.5) * window.innerWidth;
    const py = -(meshPos.y * 0.5 - 0.5) * window.innerHeight;
    
    // Mouse in pixels
    const mx = (state.pointer.x * 0.5 + 0.5) * window.innerWidth;
    const my = -(state.pointer.y * 0.5 - 0.5) * window.innerHeight;
    
    const dist = Math.hypot(mx - px, my - py);
    const isNear = dist < 150;

    // Smooth hover state
    const targetIntensity = isNear ? 1 : 0;
    hoverState.current.intensity = THREE.MathUtils.lerp(hoverState.current.intensity, targetIntensity, delta * 8);

    // Apply glow only if active
    if (glowRef.current) {
      const isActive = useStore.getState().activeIndex === index;
      glowRef.current.material.uniforms.opacity.value = isActive ? 0.03 : 0;
    }

    // Apply HTML reticle opacity
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = hoverState.current.intensity;
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
    <group position={achievement.position}>
      <mesh ref={meshRef} geometry={geometry} onClick={handleClick} scale={0.75}>
        <meshStandardMaterial
          map={cMap}
          normalMap={nMap}
          normalMapType={THREE.TangentSpaceNormalMap}
          normalScale={new THREE.Vector2(2.5, 2.5)}
          roughnessMap={rMap}
          aoMap={aMap}
          aoMapIntensity={1.2}
          roughness={0.95}
          metalness={0.0}
          color={neutralColor}
          emissive={emissiveColor}
          emissiveIntensity={0.04}
          toneMapped={true}
        />
      </mesh>
      
      {/* Background glow */}
      <mesh ref={glowRef} position={[0, 0, -20]}>
        <planeGeometry args={[120, 120]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>

      {/* HTML Overlay */}
      <Html center style={{ pointerEvents: 'none', zIndex: 5 }}>
        <div ref={tooltipRef} style={{ opacity: 0, transition: 'none' }}>
          {/* Reticle Brackets */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: '180px', height: '180px',
            transform: 'translate(-50%, -50%)',
            border: `1px solid ${achievement.color}80`,
            maskImage: 'linear-gradient(to right, black 20%, transparent 20%, transparent 80%, black 80%), linear-gradient(to bottom, black 20%, transparent 20%, transparent 80%, black 80%)',
            WebkitMaskImage: 'linear-gradient(to right, black 20%, transparent 20%, transparent 80%, black 80%), linear-gradient(to bottom, black 20%, transparent 20%, transparent 80%, black 80%)',
            WebkitMaskComposite: 'intersect',
            maskComposite: 'intersect'
          }} />
        </div>
      </Html>
    </group>
  );
}
