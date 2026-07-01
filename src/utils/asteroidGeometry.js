import { IcosahedronGeometry } from 'three';
import { createNoise3D } from 'simplex-noise';
import { ASTEROID } from './constants';

/**
 * Generate a procedural asteroid geometry by displacing an icosahedron
 * with layered simplex noise. Each seed produces a unique shape.
 */
export function createAsteroidGeometry(seed = 0) {
  // Seed the noise by using a pseudo-random function
  const alea = createAleaRNG(seed);
  const noise3D = createNoise3D(alea);

  const geometry = new IcosahedronGeometry(
    ASTEROID.baseRadius,
    ASTEROID.detail
  );

  const positions = geometry.attributes.position;
  const vertex = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < positions.count; i++) {
    vertex.x = positions.getX(i);
    vertex.y = positions.getY(i);
    vertex.z = positions.getZ(i);

    // Normalize to get direction
    const len = Math.sqrt(
      vertex.x * vertex.x + vertex.y * vertex.y + vertex.z * vertex.z
    );
    const nx = vertex.x / len;
    const ny = vertex.y / len;
    const nz = vertex.z / len;

    // Layer 1: large features
    const n1 = noise3D(
      nx * ASTEROID.noiseScale1,
      ny * ASTEROID.noiseScale1,
      nz * ASTEROID.noiseScale1
    );

    // Layer 2: small detail
    const n2 = noise3D(
      nx * ASTEROID.noiseScale2 + 100,
      ny * ASTEROID.noiseScale2 + 100,
      nz * ASTEROID.noiseScale2 + 100
    );

    const displacement = 1 + n1 * ASTEROID.noiseAmp1 + n2 * ASTEROID.noiseAmp2;

    positions.setXYZ(
      i,
      nx * ASTEROID.baseRadius * displacement,
      ny * ASTEROID.baseRadius * displacement,
      nz * ASTEROID.baseRadius * displacement
    );
  }

  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Simple Alea PRNG for deterministic noise seeding.
 */
function createAleaRNG(seed) {
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let c = 1;

  const mash = createMash();
  s0 = mash(' ');
  s1 = mash(' ');
  s2 = mash(' ');

  s0 -= mash(String(seed));
  if (s0 < 0) s0 += 1;
  s1 -= mash(String(seed));
  if (s1 < 0) s1 += 1;
  s2 -= mash(String(seed));
  if (s2 < 0) s2 += 1;

  return function () {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10;
    s0 = s1;
    s1 = s2;
    c = t | 0;
    s2 = t - c;
    return s2;
  };
}

function createMash() {
  let n = 0xefc8249d;
  return function (data) {
    const str = String(data);
    for (let i = 0; i < str.length; i++) {
      n += str.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000;
    }
    return (n >>> 0) * 2.3283064365386963e-10;
  };
}
