export const SUN_SURFACE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vUv = uv;

  // Normal in view space
  vNormal = normalize(normalMatrix * normal);

  // View direction in view space
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPosition.xyz);

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const SUN_SURFACE_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

// Permutation hash
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314*r; }

// Simplex 3D noise (better quality than hash noise)
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
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
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(
    dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y;
  p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(
    dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(
    dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// FBM with 6 octaves for rich detail
float fbm(vec3 p) {
  float f = 0.0;
  f += 0.500 * snoise(p);       p *= 2.01;
  f += 0.250 * snoise(p);       p *= 2.02;
  f += 0.125 * snoise(p);       p *= 2.03;
  f += 0.0625 * snoise(p);      p *= 2.04;
  f += 0.03125 * snoise(p);     p *= 2.05;
  f += 0.015625 * snoise(p);
  return f / 0.984375;
}

void main() {
  // View-space normal for lighting
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);

  // ── LIMB DARKENING ──────────────────────────
  // This is THE key to making it look 3D
  // dot(N,V) = 1 at center facing you, 0 at edges
  float NdotV = max(dot(N, V), 0.0);
  float limb = pow(NdotV, 0.5);
  // limb = 1.0 at center, ~0.0 at edges

  // ── SURFACE TEXTURE ─────────────────────────
  // Use view-space position to drive the noise
  // so it wraps naturally on the sphere surface
  vec3 samplePos = vNormal * 1.8 + uTime * 0.04;

  // Large scale plasma flow
  float plasma1 = fbm(samplePos);

  // Medium scale granulation
  float plasma2 = fbm(samplePos * 2.5 + vec3(4.2, 1.7, 3.3)
                  + uTime * 0.06);

  // Fine surface detail
  float plasma3 = fbm(samplePos * 6.0 + vec3(1.1, 8.4, 2.2)
                  + uTime * 0.09);

  // Combine noise layers
  float surface = plasma1 * 0.55
                + plasma2 * 0.30
                + plasma3 * 0.15;

  // Remap 0-1
  surface = surface * 0.5 + 0.5;

  // ── COLOR GRADIENT ──────────────────────────
  // Dark core → mid amber → bright yellow-white
  // These 4 colors create the depth gradient
  vec3 c0 = vec3(0.20, 0.04, 0.00); // very dark red (sunspot)
  vec3 c1 = vec3(0.70, 0.20, 0.00); // deep orange
  vec3 c2 = vec3(1.00, 0.65, 0.08); // bright amber
  vec3 c3 = vec3(1.00, 0.96, 0.70); // near-white yellow

  // Map surface noise to color
  vec3 surfaceColor;
  if (surface < 0.33) {
    surfaceColor = mix(c0, c1, surface / 0.33);
  } else if (surface < 0.66) {
    surfaceColor = mix(c1, c2, (surface - 0.33) / 0.33);
  } else {
    surfaceColor = mix(c2, c3, (surface - 0.66) / 0.34);
  }

  // ── APPLY LIMB DARKENING ────────────────────
  // Multiply by limb: edges go very dark,
  // center stays bright — THIS makes it 3D
  vec3 finalColor = surfaceColor * mix(0.15, 1.0, limb);

  // Boost brightness at center slightly
  finalColor += vec3(0.1, 0.05, 0.0) * pow(NdotV, 3.0);

  gl_FragColor = vec4(finalColor, 1.0);
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
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = 1.0 - max(dot(
    normalize(vNormal),
    normalize(vViewDir)
  ), 0.0);

  fresnel = pow(fresnel, 3.5);

  // Soft amber glow at the edge only
  vec3 coronaCol = mix(
    vec3(1.0, 0.5, 0.1),
    vec3(1.0, 0.8, 0.3),
    fresnel
  );

  gl_FragColor = vec4(coronaCol, fresnel * 0.45);
}
`;
