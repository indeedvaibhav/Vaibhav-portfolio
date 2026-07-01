import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../utils/scrollState';
import {
  CAMERA_PATH_POINTS,
  ASTEROID_POSITIONS,
  ASTEROID_SCROLL_CENTERS,
  FOCUS_RADIUS,
  FADE_RADIUS,
  CAMERA,
} from '../utils/constants';
import useStore from '../hooks/useStore';

/**
 * Scroll-driven camera controller.
 *
 * Reads scrollState.progress (set by GSAP ScrollTrigger scrub),
 * positions the camera on a CatmullRomCurve3 spline, and blends
 * the lookAt target between "forward on path" and "current asteroid."
 *
 * Also determines which asteroid is in focus and updates the store.
 */
export default function CameraController() {
  const { camera } = useFrame.length ? {} : {}; // just for type hints
  const currentLookAt = useRef(new THREE.Vector3(0, 0, -5));
  const prevActiveIndex = useRef(-1);

  // Build the camera spline once
  const spline = useMemo(() => {
    const points = CAMERA_PATH_POINTS.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z)
    );
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, []);

  // Asteroid positions as Vector3
  const asteroidVecs = useMemo(
    () => ASTEROID_POSITIONS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    []
  );

  useFrame(({ camera }) => {
    const t = Math.max(0, Math.min(1, scrollState.progress));

    // ── Position camera on spline ──
    const cameraPos = spline.getPoint(t);
    camera.position.copy(cameraPos);

    // ── Determine active asteroid ──
    let bestIndex = -1;
    let bestDist = Infinity;
    let bestOpacity = 0;

    for (let i = 0; i < ASTEROID_SCROLL_CENTERS.length; i++) {
      const center = ASTEROID_SCROLL_CENTERS[i];
      const dist = Math.abs(t - center);

      if (dist < FADE_RADIUS && dist < bestDist) {
        bestIndex = i;
        bestDist = dist;

        if (dist < FOCUS_RADIUS) {
          bestOpacity = 1;
        } else {
          // Fade in/out between FOCUS_RADIUS and FADE_RADIUS
          bestOpacity = 1 - (dist - FOCUS_RADIUS) / (FADE_RADIUS - FOCUS_RADIUS);
        }
      }
    }

    // Update store only when the active index or opacity changes meaningfully
    const store = useStore.getState();
    if (bestIndex !== prevActiveIndex.current || Math.abs(bestOpacity - store.activeOpacity) > 0.02) {
      store.setActive(bestIndex, bestOpacity);
      prevActiveIndex.current = bestIndex;
    }

    // Mark scrolled after first movement
    if (t > 0.01 && !store.hasScrolled) {
      store.markScrolled();
    }

    // ── Compute lookAt target ──
    // Default: look ahead on the spline
    const lookAheadT = Math.min(t + CAMERA.lookAheadT, 0.999);
    const forwardTarget = spline.getPoint(lookAheadT);

    let targetLookAt;
    if (bestIndex >= 0 && bestOpacity > 0.1) {
      // Blend toward the active asteroid
      const blendStrength = bestOpacity * CAMERA.lookBlendToAsteroid;
      targetLookAt = new THREE.Vector3().lerpVectors(
        forwardTarget,
        asteroidVecs[bestIndex],
        blendStrength
      );
    } else {
      targetLookAt = forwardTarget;
    }

    // Smooth the lookAt transition
    currentLookAt.current.lerp(targetLookAt, CAMERA.smoothing);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
