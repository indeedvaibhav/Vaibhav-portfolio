/**
 * GLSL simplex noise + cinematic star surface / corona shaders.
 */

export const STAR_NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  mat3 rot = mat3(0.8, 0.6, 0.0, -0.6, 0.8, 0.0, 0.0, 0.0, 1.0);
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p = rot * p * 2.1 + 0.55;
    a *= 0.5;
  }
  return v;
}
`;

export const starSurfaceVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying vec2 vUv;

uniform float uTime;
uniform float uInstability;
uniform float uPulse;

void main() {
  vUv = uv;
  vec3 pos = position;

  float warp = fbm(normal * 4.0 + uTime * 0.12) * 0.018;
  warp += uInstability * fbm(normal * 7.0 + uTime * 0.35) * 0.03;
  pos += normal * warp * (1.0 + uPulse * 0.5);
  pos *= 1.0 + uPulse * 0.012;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const starSurfaceFragment = /* glsl */ `
uniform float uTime;
uniform float uInstability;
uniform float uPulse;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying vec2 vUv;

void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(vViewDir);

  float limb = max(dot(n, viewDir), 0.0);
  float limbDarken = pow(limb, 0.38);
  float rim = pow(1.0 - limb, 2.8);

  vec3 p = n * 2.4;
  float t = uTime;

  float convection = fbm(p * 1.1 + vec3(t * 0.06, t * 0.05, t * 0.04));
  float granulation = fbm(p * 5.5 + vec3(t * 0.22, t * 0.18, 0.0));
  float micro = snoise(p * 14.0 + t * 0.45) * 0.5 + 0.5;
  float turbulence = fbm(p * 2.8 + vec3(t * 0.14, -t * 0.11, t * 0.09));

  float surface = convection * 0.42 + granulation * 0.28 + turbulence * 0.22 + micro * 0.08;
  surface += uInstability * fbm(p * 3.6 + t * 0.4) * 0.35;
  surface = clamp(surface * 0.5 + 0.5, 0.0, 1.0);

  vec3 hot = vec3(1.0, 0.98, 0.82);
  vec3 mid = vec3(1.0, 0.62, 0.12);
  vec3 cool = vec3(0.55, 0.12, 0.02);
  vec3 deep = vec3(0.18, 0.04, 0.01);

  vec3 col = mix(deep, cool, smoothstep(0.0, 0.35, surface));
  col = mix(col, mid, smoothstep(0.25, 0.72, surface));
  col = mix(col, hot, pow(surface, 2.2) * limbDarken);

  float darkPatch = smoothstep(0.15, 0.55, 1.0 - convection) * 0.22;
  col *= 1.0 - darkPatch;

  col *= 0.55 + limbDarken * 0.55;
  col += vec3(1.0, 0.72, 0.28) * rim * (1.15 + uInstability * 0.55);

  float bloom = pow(limb, 4.0) * 0.35;
  col += vec3(1.0, 0.8, 0.4) * bloom;

  float flicker = 0.97 + granulation * 0.05 * sin(t * 9.0 + micro * 12.0);
  col *= flicker * (1.0 + uPulse * 0.08);

  float ca = rim * 0.04;
  col.r += ca * 1.2;
  col.b -= ca * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const coronaVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

uniform float uTime;
uniform float uLayer;
uniform float uInstability;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vNoise = snoise(position * 3.0 + vec3(uTime * 0.08, uLayer, 0.0));
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const coronaFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uLayer;
uniform float uInstability;
uniform vec3 uColor;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

void main() {
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 3.2 + uLayer);
  float pulse = 0.88 + 0.12 * sin(uTime * 0.55 + uLayer * 2.1);
  float uneven = 0.75 + vNoise * 0.35;
  float alpha = fresnel * uneven * uIntensity * pulse;
  alpha *= 1.0 + uInstability * 0.55;
  vec3 col = uColor * (0.85 + fresnel * 0.4);
  gl_FragColor = vec4(col, alpha);
}
`;

export const flareVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const flareFragment = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  float along = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.55, vUv.x);
  float across = exp(-pow((vUv.y - 0.5) * 3.0, 2.0));
  float alpha = along * across * uOpacity;
  vec3 col = uColor * (0.8 + along * 0.4);
  gl_FragColor = vec4(col, alpha);
}
`;

export const heatVertex = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
void main() {
  vUv = uv;
  vec3 pos = position;
  float wave = snoise(vec3(uv * 4.0, uTime * 0.25)) * 0.04;
  pos.xy += normal.xy * wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const heatFragment = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;

void main() {
  float ring = smoothstep(0.35, 0.55, length(vUv - 0.5));
  ring *= smoothstep(0.95, 0.65, length(vUv - 0.5));
  float shimmer = 0.5 + 0.5 * sin(uTime * 2.5 + vUv.x * 12.0);
  float alpha = ring * shimmer * uOpacity * 0.18;
  gl_FragColor = vec4(1.0, 0.75, 0.35, alpha);
}
`;
