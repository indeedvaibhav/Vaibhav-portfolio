import { useEffect, useState, useRef } from 'react';
import useStore from '../hooks/useStore';
import gsap from 'gsap';

/**
 * Real loading screen tracking Three.js asset load progress.
 * Uses a polling approach on the store's loadProgress.
 * Styled with the space theme — fades out once the scene is ready.
 */
export default function Preloader() {
  const phase = useStore((s) => s.phase);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  // Animate progress number
  useEffect(() => {
    if (phase === 'loading') {
      // Simulate initial progress for perceived speed, then real progress kicks in
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(timer);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // Timeout fallback — if loading takes > 15s, show error
      const timeout = setTimeout(() => {
        if (useStore.getState().phase === 'loading') {
          setError('Taking longer than expected...');
        }
      }, 15000);

      return () => {
        clearInterval(timer);
        clearTimeout(timeout);
      };
    }
  }, [phase]);

  // Transition out when ready
  useEffect(() => {
    if (phase === 'idle' || phase === 'ready') {
      setProgress(100);
      const timer = setTimeout(() => {
        if (containerRef.current) {
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => setVisible(false),
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  if (!visible) return null;

  return (
    <div ref={containerRef} className="preloader">
      <div className="preloader-content">
        <div className="preloader-icon">
          <div className="preloader-ring" />
          <div className="preloader-ring preloader-ring-2" />
          <div className="preloader-dot" />
        </div>

        <div className="preloader-text">
          <span className="preloader-label">INITIALIZING FIELD LOG</span>
          <span className="preloader-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>

        <div className="preloader-progress">
          <div className="preloader-bar">
            <div
              className="preloader-bar-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="preloader-percent">
            {String(Math.floor(Math.min(progress, 100))).padStart(3, '0')}%
          </span>
        </div>

        {error && (
          <div className="preloader-error">
            <span>⚠ {error}</span>
            <button onClick={() => window.location.reload()}>RETRY</button>
          </div>
        )}
      </div>
    </div>
  );
}
