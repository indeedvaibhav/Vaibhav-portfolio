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
  [0.5, 1.5, -19],     // P3  approach
  [1, 1.5, -22],       // P4  center
  [0.5, 1, -25],       // P5  depart

  // ── Asteroid 2 (TaskFlow) ──
  [-0.5, 0, -39],      // P6  approach
  [-1, -0.5, -42],     // P7  center
  [-0.5, 0, -45],      // P8  depart

  // ── Asteroid 3 (CivicSentinel) ──
  [0.5, 2, -59],       // P9  approach
  [1, 2.5, -62],       // P10 center
  [0.5, 1.5, -65],     // P11 depart

  // ── Asteroid 4 (ParkSense) ──
  [-0.5, -0.5, -79],   // P12 approach
  [-1, -1, -82],       // P13 center
  [-0.5, 0, -85],      // P14 depart

  // ── Asteroid 5 (Portfolio) ──
  [0.5, 3, -99],       // P15 approach
  [1, 3.5, -102],      // P16 center
  [0.5, 2, -105],      // P17 depart

  // ── Asteroid 6 (Certifications) ──
  [-0.5, 1.5, -119],   // P18 approach
  [-1, 1, -122],       // P19 center
  [-0.5, 1, -125],     // P20 depart

  // ── Asteroid 7 (Internships) ──
  [0.5, 0.5, -139],    // P21 approach
  [1, 0, -142],        // P22 center
  [0.5, 0, -145],      // P23 depart

  // ── Outro ──
  [0, 5, -155],        // P24 pull-up
  [0, 12, -160],       // P25 final wide
];

// ─── Asteroid world positions ──────────────────────────────
// Offset ~2.5–3 units laterally from the camera path centers,
// alternating sides for visual variety.
export const ASTEROID_POSITIONS = [
  [5.5, 2, -22],         // A1 RailSage      — right of path
  [-5.5, -1, -42],       // A2 TaskFlow      — left
  [5.5, 3, -62],         // A3 CivicSentinel — right
  [-5.5, -2, -82],       // A4 ParkSense     — left
  [5.5, 4, -102],        // A5 Portfolio     — right
  [-5.5, 1, -122],       // A6 Certifications— left
  [5.5, 0, -142],        // A7 Internships   — right
];

// ─── Per-asteroid scroll focus ─────────────────────────────
// With 26 control points (25 segments), each segment = 0.04 t.
// Each asteroid occupies 3 segments (approach/center/depart) = 0.12 t range.
// Centers at midpoint of their 3-segment block.
export const ASTEROID_SCROLL_CENTERS = [
  0.16,  // A1 — segments 3-5, center at segment 4
  0.28,  // A2 — segments 6-8, center at segment 7
  0.40,  // A3 — segments 9-11, center at segment 10
  0.52,  // A4 — segments 12-14, center at segment 13
  0.64,  // A5 — segments 15-17, center at segment 16
  0.76,  // A6 — segments 18-20, center at segment 19
  0.88,  // A7 — segments 21-23, center at segment 22
];

// Focus = caption visible & clickable. Fade = caption opacity ramps.
export const FOCUS_RADIUS = 0.04;   // |t - center| < this → fully in focus
export const FADE_RADIUS = 0.065;   // |t - center| < this → caption fading in/out
export const INTRO_END = 0.10;      // scroll progress when intro overlay fades out
export const OUTRO_START = 0.93;    // scroll progress when outro overlay fades in

// ─── Scene ─────────────────────────────────────────────────
export const SCENE = {
  bgColor: '#050510',
  fogColor: '#050510',
  fogDensity: 0.012,
  ambientIntensity: 0.25,
  pointLightIntensity: 2.5,
  pointLightColor: '#ffcc66',
};

// ─── Core sphere ───────────────────────────────────────────
export const CORE = {
  position: [0, 0, 0],
  radius: 0.85,
  color: '#ffaa33',
  emissiveColor: '#ff8800',
  pulseSpeed: 0.8,
  pulseMin: 0.7,
  pulseMax: 1.2,
  glowScale: 1.2,
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
  zMax: -180,     // stars extend past the outro
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
  smoothing: 0.045,           // lerp factor for lookAt smoothing
};

// ─── Category colors ──────────────────────────────────────
export const CATEGORY_COLORS = {
  'AI Project': '#6366f1',
  'Full-Stack': '#10b981',
  'Civic Tech': '#f59e0b',
  'Smart Systems': '#06b6d4',
  'Creative Dev': '#ec4899',
  'Credentials': '#8b5cf6',
  'Experience': '#f43f5e',
};
