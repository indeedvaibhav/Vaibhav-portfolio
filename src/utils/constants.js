import * as THREE from 'three';

// ─── Camera path ───────────────────────────────────────────
// CatmullRomCurve3 control points.
// Using getPoint(t) so that densely-packed points near asteroids
// make the camera linger there (slower per-scroll).
// Pattern: 2 intro pts, then per asteroid: approach / center / depart,
// plus transition gaps between asteroids, then 2 outro pts.
// Total: 26 control points → 25 segments.
export const CAMERA_PATH_POINTS = [
  // ── Intro ──
  [0, 0, 10],          // P0  start behind core
  [0, 0.5, 2],         // P1  hero: close to core
  [0, 1, -5],          // P2  pulling away

  // ── Asteroid 1 (RailSage) ──
  [2, 1.5, -19],       // P3  approach
  [2.5, 1.5, -22],     // P4  center
  [2, 1, -25],         // P5  depart

  // ── Asteroid 2 (TaskFlow) ──
  [-2, 0, -39],        // P6  approach
  [-2.5, -0.5, -42],   // P7  center
  [-2, 0, -45],        // P8  depart

  // ── Asteroid 3 (CivicSentinel) ──
  [2, 2, -59],         // P9  approach
  [2.5, 2.5, -62],     // P10 center
  [2, 1.5, -65],       // P11 depart

  // ── Asteroid 4 (ParkSense) ──
  [-2, -0.5, -79],     // P12 approach
  [-2.5, -1, -82],     // P13 center
  [-2, 0, -85],        // P14 depart

  // ── Asteroid 5 (Portfolio) ──
  [2, 3, -99],         // P15 approach
  [2.5, 3.5, -102],    // P16 center
  [2, 2, -105],        // P17 depart

  // ── Asteroid 6 (Certifications) ──
  [-2, 1.5, -119],     // P18 approach
  [-2.5, 1, -122],     // P19 center
  [-2, 1, -125],       // P20 depart

  // ── Asteroid 7 (Internships) ──
  [2, 0.5, -139],      // P21 approach
  [2.5, 0, -142],      // P22 center
  [2, 0, -145],        // P23 depart

  // ── Asteroid 8 (Tech Certs) ──
  [-2, 1, -159],       // P24 approach
  [-2.5, 0.5, -162],   // P25 center
  [-2, 0.5, -165],     // P26 depart

  // ── Asteroid 9 (Leadership) ──
  [2, -0.5, -179],     // P27 approach
  [2.5, -1, -182],     // P28 center
  [2, -1, -185],       // P29 depart

  // ── Outro ──
  [0, 5, -195],        // P30 pull-up
  [0, 12, -200],       // P31 final wide
];

// ─── Asteroid world positions ─────────────────────────────
// Offset ~2.5–3 units laterally from the camera path centers,
// alternating sides for visual variety.
export const ASTEROID_POSITIONS = [
  [5, 1.5, -22],       // A1 RailSage      — right side
  [0, -0.5, -42],      // A2 TaskFlow      — right side (camera is at x:-2.5)
  [5, 2.5, -62],       // A3 CivicSentinel — right side
  [0, -1, -82],        // A4 ParkSense     — right side (camera is at x:-2.5)
  [5, 3.5, -102],      // A5 Portfolio     — right side
  [0, 1, -122],        // A6 Certifications— right side (camera is at x:-2.5)
  [5, 0, -142],        // A7 Internships   — right side
  [0, 0.5, -162],      // A8 Tech Certs    — right side (camera is at x:-2.5)
  [5, -1, -182],       // A9 Leadership    — right side
];

// ─── Per-asteroid scroll focus ─────────────────────────────
// With 32 control points (31 segments), each segment = 0.032258 t.
// Each asteroid occupies 3 segments (approach/center/depart).
// Centers at midpoint of their 3-segment block.
export const ASTEROID_SCROLL_CENTERS = [
  0.1290,  // A1 — segments 3-5, center at segment 4
  0.2258,  // A2 — segments 6-8, center at segment 7
  0.3225,  // A3 — segments 9-11, center at segment 10
  0.4193,  // A4 — segments 12-14, center at segment 13
  0.5161,  // A5 — segments 15-17, center at segment 16
  0.6129,  // A6 — segments 18-20, center at segment 19
  0.7096,  // A7 — segments 21-23, center at segment 22
  0.8064,  // A8 — segments 24-26, center at segment 25
  0.9032,  // A9 — segments 27-29, center at segment 28
];

// Focus = caption visible & clickable. Fade = caption opacity ramps.
export const FOCUS_RADIUS = 0.032;   // |t - center| < this → fully in focus (~1 segment)
export const FADE_RADIUS = 0.052;    // |t - center| < this → caption fading in/out (~1.6 segments)
export const INTRO_END = 0.08;       // scroll progress when intro overlay fades out
export const OUTRO_START = 0.94;     // scroll progress when outro overlay fades in

// ─── Scene ─────────────────────────────────────────────────
export const SCENE = {
  bgColor: '#05060a',
  fogColor: '#05060a',
  fogDensity: 0.006,
  ambientIntensity: 0.18,
  pointLightIntensity: 2.5,
  pointLightColor: '#ffcc66',
};

// ─── Core sphere ───────────────────────────────────────────
export const CORE = {
  position: [0, -0.7, 0],
  radius: 0.96,
  color: '#ffaa33',
  emissiveColor: '#ff8800',
  pulseSpeed: 0.8,
  pulseMin: 0.7,
  pulseMax: 1.4,
  glowScale: 1.35,
};

// ─── Asteroid mesh ─────────────────────────────────────────
export const ASTEROID = {
  baseRadius: 0.7,
  detail: 2,
  noiseScale1: 1.5,
  noiseAmp1: 0.25,
  noiseScale2: 3.5,
  noiseAmp2: 0.08,
  rotationSpeed: 0.003,
};

// ─── Post-processing ──────────────────────────────────────
export const POSTPROCESSING = {
  bloom: {
    intensity: 2.0,
    luminanceThreshold: 0.15,
    luminanceSmoothing: 0.9,
    mipmapBlur: true,
  },
  vignette: {
    offset: 0.3,
    darkness: 0.7,
  },
  chromaticAberration: {
    offset: [0.0006, 0.0006],
  },
};

// ─── Starfield ─────────────────────────────────────────────
export const STARFIELD = {
  count: 3000,
  zMin: 30,       // stars start ahead of camera start
  zMax: -220,     // stars extend past the outro
  spreadX: 120,   // lateral spread
  spreadY: 80,    // vertical spread
  minSize: 0.03,
  maxSize: 0.15,
};

// ─── Camera ────────────────────────────────────────────────
export const CAMERA = {
  fov: 50,
  near: 0.1,
  far: 400,
  lookAheadT: 0.015,          // how far ahead on the spline the camera looks
  lookBlendToAsteroid: 0.65,  // how strongly to look at an in-focus asteroid (0-1)
  smoothing: 0.08,            // lerp factor for lookAt smoothing
};

export const CATEGORY_COLORS = {
  'Hackathon Build': '#6366f1',
  'Productivity Tool': '#10b981',
  'Civic Tech': '#f59e0b',
  'Smart Infrastructure': '#06b6d4',
  'Creative Engineering': '#ec4899',
  'Credentials': '#8b5cf6',
  'Experience': '#f43f5e',
  'Technical': '#8b5cf6',
  'Leadership': '#fbbf24',
};
