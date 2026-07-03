import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import CinematicStar from '../../scene/star/CinematicStar';
import './HeroStar.css';

function HeroStarScene() {
  return (
    <>
      <ambientLight intensity={0.02} />
      <CinematicStar radius={1} compact />
    </>
  );
}

/**
 * Fixed-size WebGL star for the hero overlay (120×120 px).
 * No post-processing composer — bloom is baked in shaders to avoid rectangular artifacts.
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
          premultipliedAlpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.18,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
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
