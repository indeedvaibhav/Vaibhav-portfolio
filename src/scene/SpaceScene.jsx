import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
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

      {/* Lighting */}
      <ambientLight intensity={SCENE.ambientIntensity} />
      <pointLight
        position={[0, 0, 0]}
        color={SCENE.pointLightColor}
        intensity={SCENE.pointLightIntensity}
        distance={50}
        decay={2}
      />

      <Suspense fallback={null}>
        <Nebula />
        <Starfield />
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
