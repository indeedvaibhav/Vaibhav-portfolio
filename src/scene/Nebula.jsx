import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Background nebula — a very large inside-facing sphere centered
 * midway along the camera path, with a gradient shader.
 * Provides atmospheric depth without distraction.
 */
export default function Nebula() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color('#0c0525') },
        colorMid: { value: new THREE.Color('#050510') },
        colorBot: { value: new THREE.Color('#051018') },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorMid;
        uniform vec3 colorBot;
        varying vec3 vWorldPosition;
        void main() {
          float y = normalize(vWorldPosition).y;
          vec3 color = y > 0.0
            ? mix(colorMid, colorTop, y)
            : mix(colorMid, colorBot, -y);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, []);

  return (
    <mesh material={material} position={[0, 0, -75]}>
      <sphereGeometry args={[250, 32, 32]} />
    </mesh>
  );
}
