import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import useStore from '../hooks/useStore';
import { achievements } from '../data/achievements';
import { scrollState } from '../utils/scrollState';
import { ASTEROID_SCROLL_CENTERS } from '../utils/constants';

/**
 * HUD overlay:
 * - Bottom-left: chapter counter "02 / 07" + "FIELD.LOG"
 * - Bottom-right: scroll hint that fades after first scroll
 */
export default function HUD() {
  const phase = useStore((s) => s.phase);
  const hasScrolled = useStore((s) => s.hasScrolled);
  const hudRef = useRef(null);
  const hintRef = useRef(null);
  const [chapter, setChapter] = useState(0);

  // Animate in on load
  useEffect(() => {
    if (phase === 'idle' && hudRef.current) {
      gsap.fromTo(
        hudRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.6 }
      );
    }
    if (phase === 'idle' && hintRef.current) {
      gsap.fromTo(
        hintRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 0.5, duration: 0.6, ease: 'power3.out', delay: 0.9 }
      );
    }
  }, [phase]);

  // Fade out hint after first scroll
  useEffect(() => {
    if (hasScrolled && hintRef.current) {
      gsap.to(hintRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 1.5,
      });
    }
  }, [hasScrolled]);

  // Update chapter based on scroll progress
  useEffect(() => {
    let raf;
    const update = () => {
      const t = scrollState.progress;
      let currentChapter = 0;
      for (let i = 0; i < ASTEROID_SCROLL_CENTERS.length; i++) {
        if (t >= ASTEROID_SCROLL_CENTERS[i] - 0.05) {
          currentChapter = i + 1;
        }
      }
      setChapter(currentChapter);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div ref={hudRef} className="hud-readout" style={{ opacity: 0 }}>
        <div className="hud-chapter">
          <span className="hud-chapter-current">
            {String(chapter).padStart(2, '0')}
          </span>
          <span className="hud-chapter-sep">/</span>
          <span className="hud-chapter-total">
            {String(achievements.length).padStart(2, '0')}
          </span>
        </div>
        <div className="hud-line">
          <span className="hud-label">FIELD.LOG</span>
        </div>
        <div className="hud-line hud-status">
          <span className="hud-blink" />
          <span className="hud-key">SCANNING</span>
        </div>
      </div>

      <div ref={hintRef} className="hud-hint" style={{ opacity: 0 }}>
        <span>Scroll to continue the journey</span>
        <span className="hud-hint-arrow">↓</span>
      </div>
    </>
  );
}
