import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import Starfield from './Starfield';
import Nebula from './Nebula';
import CoreSphere from './CoreSphere';
import AchievementField from './AchievementField';
import CameraController from './CameraController';
import { CAMERA, POSTPROCESSING, SCENE } from '../utils/constants';

/**
 * The main 3D scene canvas — fixed behind everything.
 * Camera is driven by scroll via CameraController.
 */
export default function SpaceScene() {
  return (
    <Canvas
      camera={{
        fov: CAMERA.fov,
        near: CAMERA.near,
        far: CAMERA.far,
        position: [0, 0, 10],
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        alpha: false,
      }}
      style={{ width: '100%', height: '100%' }}
      dpr={[1, 1.5]}
      performance={{ min: 0.5 }}
      onCreated={({ scene }) => {
        scene.fog = new THREE.FogExp2(SCENE.fogColor, SCENE.fogDensity);
      }}
    >
      <color attach="background" args={[SCENE.bgColor]} />

      {/* Ambient fill — raise intensity so the dark rock side isn't pure black */}
      <ambientLight intensity={SCENE.ambientIntensity} />

      {/* Core glow — warm point light at origin */}
      <pointLight
        position={[0, 0, 0]}
        color={SCENE.pointLightColor}
        intensity={SCENE.pointLightIntensity}
        distance={50}
        decay={2}
      />

      {/* Directional light at 45° — essential for normal maps to show depth */}
      <directionalLight
        position={[6, 8, 4]}
        color="#c8d8ff"
        intensity={1.4}
        castShadow={false}
      />

      {/* Subtle fill light from the opposite side to soften hard shadows */}
      <directionalLight
        position={[-4, -3, -6]}
        color="#1a0a2e"
        intensity={0.4}
      />

      <Suspense fallback={null}>
        <Nebula />
        <Starfield />
        
        {/* Continuous Environmental Dust */}
        <group position={[0, 0, -75]}>
          {/* 500 large */}
          <Sparkles count={500} scale={[40, 20, 180]} size={6} speed={0.2} opacity={0.12} color="#8899bb" />
          {/* 1500 medium */}
          <Sparkles count={1500} scale={[50, 30, 200]} size={3} speed={0.1} opacity={0.18} color="#aaccff" />
          {/* 800 micro */}
          <Sparkles count={800} scale={[60, 40, 220]} size={1.5} speed={0.05} opacity={0.25} color="#ffffff" />
        </group>

        <CoreSphere />
        <AchievementField />
      </Suspense>

      <CameraController />

      {/* Post-processing */}
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={POSTPROCESSING.bloom.intensity}
          luminanceThreshold={POSTPROCESSING.bloom.luminanceThreshold}
          luminanceSmoothing={POSTPROCESSING.bloom.luminanceSmoothing}
          mipmapBlur={POSTPROCESSING.bloom.mipmapBlur}
        />
        <Vignette
          offset={POSTPROCESSING.vignette.offset}
          darkness={POSTPROCESSING.vignette.darkness}
          blendFunction={BlendFunction.NORMAL}
        />
        <ChromaticAberration
          offset={new THREE.Vector2(...POSTPROCESSING.chromaticAberration.offset)}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </Canvas>
  );
}
