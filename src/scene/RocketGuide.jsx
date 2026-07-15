/**
 * RocketGuide.jsx
 *
 * Flies a low-poly rocket along the camera spline with:
 *  - Sine-wave Frenet-frame lateral/vertical offset for a natural weaving path
 *  - Quaternion slerp so orientation never snaps
 *  - Roll/banking on the local Z axis proportional to the curve's turn rate
 *  - An instanced particle exhaust trail (additive blending, amber → transparent)
 *
 * Reads scrollState.progress directly — no second RAF, no new scroll listener.
 * The rocket geometry is a placeholder group; swap in a useGLTF call and replace
 * the <RocketMesh /> sub-component to use a loaded GLTF model.
 *
 * Mount once inside <SpaceScene /> (inside the R3F Canvas):
 *   <RocketGuide />
 *
 * ── GLTF swap guide ──────────────────────────────────────────────────────────
 * 1. Add:  import { useGLTF } from '@react-three/drei';
 * 2. Replace RocketMesh() body with:
 *      const { scene } = useGLTF('/models/rocket.glb');
 *      return <primitive object={scene} />;
 * 3. Delete the placeholder geometry/material definitions below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../utils/scrollState';

// ─── Tuning knobs ────────────────────────────────────────────────────────────
//
// The rocket is positioned in CAMERA SPACE so it is always inside the frustum
// regardless of where the camera sits on the 3D spline.  Adjust these to taste:

/** Units ahead of the camera lens — keeps rocket well past the near-plane (0.1). */
const ROCKET_FORWARD_DIST  = 2.5;
/** Units to the right in camera space — plants rocket in right-side of frame. */
const ROCKET_RIGHT_OFFSET  = 0.80;
/**
 * Units below camera centre (negative = lower half of screen).
 * Combined with the forward placement this creates a lower-right anchor that
 * mirrors the paper-plane-follows-scroll feel on a vertical scroll site.
 */
const ROCKET_DOWN_OFFSET   = -0.45;

/** Lateral (camera-right) swirl amplitude — side-to-side wiggle visible in screen space. */
const SWIRL_AMPLITUDE_N = 0.22;
/** Vertical (camera-up) swirl amplitude — up/down bob visible in screen space. */
const SWIRL_AMPLITUDE_B = 0.10;
/** Full sine cycles over the entire 0→1 scroll journey. */
const SWIRL_FREQUENCY = 6.5;
/** Phase offset between lateral and vertical swirl (creates a gentle oval path). */
const SWIRL_PHASE_OFFSET = Math.PI / 2.3;

/** Quaternion slerp factor — lower is smoother, higher is snappier. */
const SLERP_FACTOR = 0.10;
/** Max roll (banking) angle from lateral swirl rate. */
const MAX_BANK_ANGLE = Math.PI / 3.5;

/** Uniform scale of the rocket group. Tune between 0.01–0.03 for desired size. */
const ROCKET_SCALE = 0.015;

// ─── Exhaust trail settings ───────────────────────────────────────────────────

const TRAIL_COUNT    = 90;   // total particle instances in the pool
const TRAIL_LIFETIME = 1.2;  // seconds each particle lives
const TRAIL_SPEED    = 0.9;  // rearward drift speed (world units/s)
const TRAIL_SPREAD   = 0.04; // random lateral jitter radius on emission
const TRAIL_EMIT_HZ  = 40;   // particles spawned per second

// Colour stops along particle lifetime (0=born → 1=dead)
const COLOR_HOT  = new THREE.Color('#ffb454');  // amber
const COLOR_WARM = new THREE.Color('#ff6a00');  // orange
const COLOR_COOL = new THREE.Color('#1a0a2e');  // deep purple/void

// ─── Low-poly rocket placeholder materials ───────────────────────────────────
//
// All materials are module-level so they're created once, not per render.

const bodyMat = new THREE.MeshStandardMaterial({
  color:             new THREE.Color('#2a2030'),
  emissive:          new THREE.Color('#ff7a20'),
  emissiveIntensity: 0.05,
  roughness:         0.55,
  metalness:         0.6,
  toneMapped:        true,
});

const engineMat = new THREE.MeshStandardMaterial({
  color:             new THREE.Color('#ffb454'),
  emissive:          new THREE.Color('#ffb454'),
  emissiveIntensity: 2.8,
  roughness:         0.3,
  metalness:         0.8,
  toneMapped:        false,   // let bloom pick this up
});

const finMat = new THREE.MeshStandardMaterial({
  color:     new THREE.Color('#1c1428'),
  roughness: 0.8,
  metalness: 0.2,
});

// ─── Placeholder rocket mesh ──────────────────────────────────────────────────
//
// The rocket points along local +Y so that Three.js quaternion math (which
// treats Y as "up" by default) aligns it naturally to the tangent vector.
// Swap this component for a useGLTF primitive to use a real model.

function RocketMesh() {
  const noseCone  = useMemo(() => new THREE.ConeGeometry(0.18, 0.7, 6),     []);
  const fuselage  = useMemo(() => new THREE.CylinderGeometry(0.18, 0.22, 1.1, 6), []);
  const bellGeo   = useMemo(() => new THREE.CylinderGeometry(0.22, 0.28, 0.25, 6), []);
  const glowDisc  = useMemo(() => new THREE.CircleGeometry(0.20, 12),        []);
  const finGeo    = useMemo(() => new THREE.BoxGeometry(0.06, 0.40, 0.35),   []);
  const finAngles = useMemo(
    () => [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2],
    []
  );

  return (
    <group>
      {/* Nose cone — tip of rocket */}
      <mesh geometry={noseCone} material={bodyMat} position={[0, 1.1, 0]} />

      {/* Main fuselage */}
      <mesh geometry={fuselage} material={bodyMat} position={[0, 0.3, 0]} />

      {/* Engine bell */}
      <mesh geometry={bellGeo} material={bodyMat} position={[0, -0.38, 0]} />

      {/* Engine glow face — visible from behind */}
      <mesh
        geometry={glowDisc}
        material={engineMat}
        position={[0, -0.51, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* 4 swept fins, evenly spaced around the fuselage */}
      {finAngles.map((rot, i) => (
        <mesh
          key={i}
          geometry={finGeo}
          material={finMat}
          position={[
            Math.sin(rot) * 0.22,
            -0.55,
            Math.cos(rot) * 0.22,
          ]}
          rotation={[0, rot, 0]}
        />
      ))}
    </group>
  );
}

// ─── Instanced exhaust trail ──────────────────────────────────────────────────

function makeParticle() {
  return {
    active:   false,
    age:      0,
    lifetime: 0,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  };
}

/**
 * Renders up to TRAIL_COUNT particle instances.
 * Colour fades from hot amber → orange → dark purple as the particle ages.
 * Uses AdditiveBlending so overlapping particles bloom naturally without
 * needing separate transparency sorting.
 *
 * @param {{ rocketRef: React.RefObject }} props
 */
function ExhaustTrail({ rocketRef }) {
  const meshRef    = useRef();
  const pool       = useRef(Array.from({ length: TRAIL_COUNT }, makeParticle));
  const emitAcc    = useRef(0);

  // Scratch objects — one allocation, reused every frame
  const dummy      = useMemo(() => new THREE.Object3D(), []);
  const col        = useMemo(() => new THREE.Color(),    []);
  const worldPos   = useMemo(() => new THREE.Vector3(),  []);
  const worldDir   = useMemo(() => new THREE.Vector3(),  []);
  // FIX #4 — world-space quaternion scratch (avoids using local .quaternion)
  const _wq        = useMemo(() => new THREE.Quaternion(), []);

  const sphereGeo  = useMemo(() => new THREE.SphereGeometry(1, 4, 4), []);
  const trailMat   = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent:  true,
        depthWrite:   false,
        blending:     THREE.AdditiveBlending,
        toneMapped:   false,
      }),
    []
  );

  useFrame((_, delta) => {
    const mesh   = meshRef.current;
    const rocket = rocketRef.current;
    if (!mesh || !rocket) return;

    // Always emit — the canvas is only rendered during idle phase, so there
    // is no need to gate on t here.  Particles naturally die before piling up.

    // ── Emission ──────────────────────────────────────────────────────────
    if (true) {
      emitAcc.current += delta * TRAIL_EMIT_HZ;

      while (emitAcc.current >= 1) {
        emitAcc.current -= 1;

        const slot = pool.current.find((p) => !p.active);
        if (!slot) break;

        // World position of the rocket group
        rocket.getWorldPosition(worldPos);

        // FIX #4 — rearward direction uses *world* quaternion, not local.
        // rocket.quaternion is in parent-local space; if the parent group has
        // any rotation the trail would point in the wrong direction.
        rocket.getWorldQuaternion(_wq);
        worldDir.set(0, -1, 0).applyQuaternion(_wq);

        // Spawn slightly behind the engine bell mouth
        slot.position.copy(worldPos).addScaledVector(worldDir, 0.55);

        // Random rearward velocity with slight spread
        slot.velocity
          .copy(worldDir)
          .multiplyScalar(TRAIL_SPEED * (0.6 + Math.random() * 0.8));
        slot.velocity.x += (Math.random() - 0.5) * TRAIL_SPREAD;
        slot.velocity.y += (Math.random() - 0.5) * TRAIL_SPREAD;
        slot.velocity.z += (Math.random() - 0.5) * TRAIL_SPREAD;

        slot.age      = 0;
        slot.lifetime = TRAIL_LIFETIME * (0.7 + Math.random() * 0.6);
        slot.active   = true;
      }
    }

    // ── Update + upload to GPU ────────────────────────────────────────────
    let activeCount = 0;

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const p = pool.current[i];

      if (!p.active) continue;

      p.age += delta;

      if (p.age >= p.lifetime) {
        p.active = false;
        continue;
      }

      const life = p.age / p.lifetime;    // 0 = brand new, 1 = expired

      // Drift rearward
      p.position.addScaledVector(p.velocity, delta);

      // Scale: start fat, shrink as it dies
      const size = (0.04 + 0.10 * (1 - life)) * Math.max(0, 1 - life * 0.6);

      dummy.position.copy(p.position);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      mesh.setMatrixAt(activeCount, dummy.matrix);

      // Colour ramp + alpha (encoded as darkening, works naturally with additive)
      if (life < 0.3) {
        col.lerpColors(COLOR_HOT, COLOR_WARM, life / 0.3);
      } else {
        col.lerpColors(COLOR_WARM, COLOR_COOL, (life - 0.3) / 0.7);
      }
      const alpha = Math.max(0, 1 - life * 1.15);
      col.multiplyScalar(alpha);
      mesh.setColorAt(activeCount, col);

      activeCount++;
    }

    // Zero-scale any unused slots so they don't appear at the origin
    for (let i = activeCount; i < TRAIL_COUNT; i++) {
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = TRAIL_COUNT;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[sphereGeo, trailMat, TRAIL_COUNT]}
      frustumCulled={false}
    />
  );
}

// ─── RocketGuide (main export) ────────────────────────────────────────────────

/**
 * Mount once inside the R3F Canvas (e.g. in SpaceScene.jsx alongside
 * CameraController).  No props required.
 */
export default function RocketGuide() {
  const groupRef   = useRef();
  const targetQuat = useRef(new THREE.Quaternion());

  // Persistent scratch objects — allocated once, mutated every frame (zero GC).
  // Camera-relative approach: no spline or Frenet-frame refs needed.
  const _camFwd     = useMemo(() => new THREE.Vector3(),    []);
  const _worldUp    = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const _camRight   = useMemo(() => new THREE.Vector3(),    []);
  const _camUp      = useMemo(() => new THREE.Vector3(),    []);
  const _mx         = useMemo(() => new THREE.Matrix4(),    []);
  const _qBase      = useMemo(() => new THREE.Quaternion(), []);
  const _qBank      = useMemo(() => new THREE.Quaternion(), []);
  const _lookOrigin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const _lookUp     = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  // Corrects lookAt (gives Z-forward) → rocket is built Y-up, so rotate -90° on X.
  const _fixQ       = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.PI / 2
    ),
    []
  );

  useFrame(({ camera }) => {
    const group = groupRef.current;
    if (!group) return;

    const t = THREE.MathUtils.clamp(scrollState.progress, 0, 0.999);

    // ── 1. Camera world-space axes ────────────────────────────────────────
    // Derive camera-right and camera-up from world-up so the rocket stays
    // level even if the camera rolls slightly — prevents unexpected spinning.
    camera.getWorldDirection(_camFwd);
    _worldUp.set(0, 1, 0);
    _camRight.crossVectors(_camFwd, _worldUp).normalize();
    _camUp.crossVectors(_camRight, _camFwd).normalize();

    // ── 2. Sine-wave swirl in camera space ────────────────────────────────
    // Both axes are screen-space (right = screen X, up = screen Y), so the
    // weave reads as side-to-side / up-down motion matching the scroll direction.
    const phase  = t * Math.PI * 2 * SWIRL_FREQUENCY;
    const swirlR = Math.sin(phase)                      * SWIRL_AMPLITUDE_N;
    const swirlU = Math.sin(phase + SWIRL_PHASE_OFFSET) * SWIRL_AMPLITUDE_B;

    // ── 3. Position: fixed camera-relative anchor + swirl ─────────────────
    // ROCKET_FORWARD_DIST ensures the rocket is always inside the frustum
    // (camera near-plane is 0.1, so 2.5 units ahead is safely visible).
    group.position
      .copy(camera.position)
      .addScaledVector(_camFwd,   ROCKET_FORWARD_DIST)
      .addScaledVector(_camRight, ROCKET_RIGHT_OFFSET  + swirlR)
      .addScaledVector(_camUp,    ROCKET_DOWN_OFFSET   + swirlU);

    // ── 4. Orientation: rocket faces the camera's forward direction ────────
    _mx.lookAt(_lookOrigin, _camFwd, _lookUp);
    _qBase.setFromRotationMatrix(_mx);
    _qBase.multiply(_fixQ); // align Y-up mesh to Z-forward lookAt convention

    // ── 5. Banking: cos(phase) is the exact derivative of sin(phase) ───────
    // Positive cosine → swirling right → bank right (negative roll).
    // No spline sampling needed — purely analytic from the swirl function.
    const bankAngle = THREE.MathUtils.clamp(
      -Math.cos(phase) * MAX_BANK_ANGLE * 0.55,
      -MAX_BANK_ANGLE,
      MAX_BANK_ANGLE
    );
    _qBank.setFromAxisAngle(_camFwd.normalize(), bankAngle);
    targetQuat.current.copy(_qBase).premultiply(_qBank);

    // ── 6. Slerp toward target ────────────────────────────────────────────
    group.quaternion.slerp(targetQuat.current, SLERP_FACTOR);

    // ── 7. Always visible — canvas only renders during idle phase anyway ──
    group.visible = true;
  });

  return (
    <group ref={groupRef} scale={ROCKET_SCALE} frustumCulled={false}>

      {/* ── Placeholder rocket body — replace with useGLTF primitive ── */}
      <RocketMesh />

      {/* ── Point light from engine bell (casts amber glow on nearby rocks) ── */}
      <pointLight
        position={[0, -1.0, 0]}
        color="#ff8833"
        intensity={2.5}
        distance={3.5}
        decay={2}
      />

      {/* ── Exhaust particle trail ── */}
      <ExhaustTrail rocketRef={groupRef} />

    </group>
  );
}
