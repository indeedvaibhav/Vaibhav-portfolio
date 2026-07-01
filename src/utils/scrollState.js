/**
 * Shared scroll state — updated by GSAP ScrollTrigger, read by useFrame.
 * Using a plain object (not React state) to avoid re-renders on every frame.
 */
export const scrollState = {
  progress: 0,  // 0-1, smoothed via GSAP scrub
};
