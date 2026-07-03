import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import CinematicStar from '../../scene/star/CinematicStar';
import './HeroStar.css';

function HeroStarScene() {
  return (
    <>
      <ambientLight intensity={0.02} />
      <CinematicStar radius={1} />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.25}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/**
 * Fixed-size WebGL star for the hero overlay (120×120 px).
 * Does not increase visual footprint — replaces CSS gradient disc.
 */
export default function HeroStar() {
  return (
    <div className="hero-star" aria-hidden="true">
      <div className="hero-star__heat" />
      <Canvas
        className="hero-star__canvas"
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        camera={{ position: [0, 0, 3.15], fov: 36, near: 0.1, far: 20 }}
        dpr={[1, 2]}
        frameloop="always"
      >
        <HeroStarScene />
      </Canvas>
      <div className="hero-star__lens-ghost" />
    </div>
  );
}
