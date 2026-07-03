export const SUN_SURFACE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SUN_SURFACE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform int uOctaves;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    if (i >= uOctaves) break;
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return value;
}

void main() {
  vec3 p = vPosition * 2.5 + uTime * 0.08;

  float n = fbm(p);
  float n2 = fbm(p * 1.8 + vec3(1.7, 9.2, 3.1) + uTime * 0.05);
  float plasma = n * 0.6 + n2 * 0.4;

  float granules = fbm(vPosition * 8.0 + uTime * 0.12);
  plasma = mix(plasma, granules, 0.25);

  vec3 deepColor   = vec3(0.85, 0.28, 0.0);
  vec3 midColor    = vec3(1.0,  0.60, 0.05);
  vec3 brightColor = vec3(1.0,  0.92, 0.4);

  vec3 color = mix(deepColor, midColor, plasma);
  color = mix(color, brightColor, pow(plasma, 2.2));

  float limb = dot(vNormal, vec3(0.0, 0.0, 1.0));
  limb = pow(max(limb, 0.0), 0.4);
  color *= mix(0.6, 1.0, limb);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const FRESNEL_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const CORONA_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.8);
  vec3 coronaColor = mix(vec3(1.0, 0.5, 0.05), vec3(1.0, 0.9, 0.3), fresnel);
  gl_FragColor = vec4(coronaColor, fresnel * 0.25);
}
`;

export const HALO_FRAGMENT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 4.0);
  vec3 haloColor = mix(vec3(1.0, 0.65, 0.1), vec3(1.0, 0.4, 0.0), fresnel);
  gl_FragColor = vec4(haloColor, fresnel * 0.12);
}
`;
