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
import { CAMERA_PATH_POINTS } from '../utils/constants';

// ─── Tuning knobs ────────────────────────────────────────────────────────────

/** Lateral offset amplitude in world units (on the Frenet normal axis). */
const SWIRL_AMPLITUDE_N = 1.2;
/** Vertical offset amplitude in world units (on the Frenet binormal axis). */
const SWIRL_AMPLITUDE_B = 0.5;
/** How many full sine cycles happen over the entire spline length. */
const SWIRL_FREQUENCY = 6.5;
/** Phase difference between lateral and vertical swirl (creates figure-8/helix). */
const SWIRL_PHASE_OFFSET = Math.PI / 2.3;

/** Quaternion slerp factor per frame (lower = smoother but laggier). */
const SLERP_FACTOR = 0.12;
/** Banking gain: how many radians of roll per unit of turn rate. */
const BANK_GAIN = 1.8;
/** Clamp max roll so the rocket never flips. */
const MAX_BANK_ANGLE = Math.PI / 3;

/** Uniform scale applied to the entire rocket group. */
const ROCKET_SCALE = 0.04;

/**
 * Fixed lateral separation from the camera spline (world units, along the
 * Frenet normal). Keeps the rocket visibly to the side of the camera rather
 * than dead-ahead on the path. Increase to push it further off-screen-centre.
 */
const ROCKET_SIDE_OFFSET = 2.5;

/** Small t-delta used for finite-difference tangent sampling (banking). */
const BANK_DT = 0.004;

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

    const t       = scrollState.progress;
    const visible = t > 0.005 && t < 0.985;

    // ── Emission ──────────────────────────────────────────────────────────
    if (visible) {
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
  const groupRef    = useRef();
  const targetQuat  = useRef(new THREE.Quaternion());

  // Same spline as CameraController — built from identical parameters
  const spline = useMemo(() => {
    const pts = CAMERA_PATH_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }, []);

  // Persistent scratch objects (no GC pressure per frame)
  const _pos        = useMemo(() => new THREE.Vector3(),    []);
  const _tan        = useMemo(() => new THREE.Vector3(),    []);
  const _normal     = useMemo(() => new THREE.Vector3(),    []);
  const _binormal   = useMemo(() => new THREE.Vector3(),    []);
  const _mx         = useMemo(() => new THREE.Matrix4(),    []);
  const _qBase      = useMemo(() => new THREE.Quaternion(), []);
  const _qBank      = useMemo(() => new THREE.Quaternion(), []);
  const _tanA       = useMemo(() => new THREE.Vector3(),    []);
  const _tanB       = useMemo(() => new THREE.Vector3(),    []);
  const _cross      = useMemo(() => new THREE.Vector3(),    []);
  const _fwd        = useMemo(() => new THREE.Vector3(),    []);
  // FIX #3 — persistent up-vector refs; mutated via .set() each frame
  const _worldUp    = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  // FIX #3b — persistent lookAt origin/up refs so _mx.lookAt() allocates nothing
  const _lookOrigin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const _lookUp     = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  // FIX cleanup — _fixAxis was declared but never used; removed
  const _fixQ       = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.PI / 2
    ),
    []
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const t = THREE.MathUtils.clamp(scrollState.progress, 0, 0.999);

    // ── 1. Spline position ────────────────────────────────────────────────
    spline.getPoint(t, _pos);

    // ── 2. Frenet tangent ─────────────────────────────────────────────────
    spline.getTangentAt(t, _tan).normalize();

    // ── 3. Frenet normal & binormal (stable up-vector fallback) ──────────
    // FIX #3 — mutate _worldUp in place; no per-frame allocation.
    if (Math.abs(_tan.y) < 0.98) {
      _worldUp.set(0, 1, 0);
    } else {
      _worldUp.set(1, 0, 0);
    }

    _binormal.crossVectors(_tan, _worldUp).normalize();
    _normal.crossVectors(_binormal, _tan).normalize();

    // ── 4. Swirling offset + fixed side offset (sine wave in Frenet frame) ──
    const phase = t * Math.PI * 2 * SWIRL_FREQUENCY;
    // ROCKET_SIDE_OFFSET keeps the rocket off the camera centre-line;
    // the sine terms add the living, weaving motion on top of that.
    const offN  = ROCKET_SIDE_OFFSET + Math.sin(phase)                      * SWIRL_AMPLITUDE_N;
    const offB  =                      Math.sin(phase + SWIRL_PHASE_OFFSET) * SWIRL_AMPLITUDE_B;

    group.position
      .copy(_pos)
      .addScaledVector(_normal,   offN)
      .addScaledVector(_binormal, offB);

    // ── 5. Orientation: align local +Y → tangent direction ────────────────
    // lookAt gives Z→forward; RocketMesh is built along +Y, so we apply a
    // -90° X fix quaternion afterwards.
    _fwd.copy(_tan);
    // FIX #3b — reuse persistent _lookOrigin / _lookUp; no per-frame allocation.
    _mx.lookAt(_lookOrigin, _fwd, _lookUp);
    _qBase.setFromRotationMatrix(_mx);
    _qBase.multiply(_fixQ);

    // ── 6. Banking: proportional to signed turn rate ───────────────────────
    const tA = Math.max(0,     t - BANK_DT);
    const tB = Math.min(0.999, t + BANK_DT);
    spline.getTangentAt(tA, _tanA).normalize();
    spline.getTangentAt(tB, _tanB).normalize();

    _cross.crossVectors(_tanA, _tanB);
    const turnRate  = _cross.dot(_tan);   // signed curvature in forward direction
    const bankAngle = THREE.MathUtils.clamp(
      (turnRate * BANK_GAIN) / (BANK_DT * 2),
      -MAX_BANK_ANGLE,
      MAX_BANK_ANGLE
    );

    // Rotate around the forward axis (tangent)
    _qBank.setFromAxisAngle(_fwd.normalize(), -bankAngle);
    targetQuat.current.copy(_qBase).premultiply(_qBank);

    // ── 7. Slerp toward target quaternion ────────────────────────────────
    group.quaternion.slerp(targetQuat.current, SLERP_FACTOR);

    // ── 8. Visibility gate ────────────────────────────────────────────────
    group.visible = t > 0.005 && t < 0.985;
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
