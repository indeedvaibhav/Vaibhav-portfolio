import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { createAsteroidGeometry } from '../utils/asteroidGeometry';
import { ASTEROID } from '../utils/constants';
import useStore from '../hooks/useStore';
import { useAudio } from '../hooks/useAudio';

export default function AchievementRock({ achievement, index }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const lightRef = useRef();
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

  // ── Atmospheric Fresnel Glow ──
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(achievement.color) },
        opacity: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          // Calculate fresnel (rim light)
          float intensity = pow(0.65 - dot(vNormal, vPositionNormal), 2.5);
          gl_FragColor = vec4(color, intensity * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
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

    // Apply environmental effects only if active
    const isActive = useStore.getState().activeIndex === index;
    const targetEnvOpacity = isActive ? 1.0 : 0.0;

    if (glowRef.current) {
      glowRef.current.material.uniforms.opacity.value = THREE.MathUtils.lerp(
        glowRef.current.material.uniforms.opacity.value,
        targetEnvOpacity * 0.9, // peak intensity for atmosphere
        delta * 3
      );
    }
    
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        targetEnvOpacity * 1.5,
        delta * 3
      );
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
      <mesh ref={meshRef} geometry={geometry} onClick={handleClick}>
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
      
      {/* Atmospheric Fresnel Edge Glow */}
      <mesh ref={glowRef} geometry={geometry} scale={1.08}>
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>

      {/* Space Dust / Particle Field */}
      <Sparkles 
        count={50} 
        scale={6} 
        size={3.5} 
        speed={0.15} 
        opacity={0.12} 
        color={achievement.color} 
      />

      {/* Local Soft Light Scattering */}
      <pointLight 
        ref={lightRef}
        position={[0, 0, 2]} 
        distance={12} 
        decay={2} 
        color={achievement.color} 
        intensity={0}
      />

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
