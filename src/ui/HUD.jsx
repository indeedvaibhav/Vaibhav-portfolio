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
  
  const [activeData, setActiveData] = useState({
    chapter: 0,
    title: '',
    color: '#7a8899',
    locked: false
  });

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

  // Update active state based on scroll progress
  useEffect(() => {
    let raf;
    const update = () => {
      const t = scrollState.progress;
      let currentIdx = -1;
      let locked = false;

      for (let i = 0; i < ASTEROID_SCROLL_CENTERS.length; i++) {
        const center = ASTEROID_SCROLL_CENTERS[i];
        if (t >= center - 0.08 && t <= center + 0.08) {
          currentIdx = i;
          // Locked on if very close to center
          if (Math.abs(t - center) < 0.03) {
            locked = true;
          }
        }
      }

      if (currentIdx >= 0) {
        const ach = achievements[currentIdx];
        setActiveData({
          chapter: currentIdx + 1,
          title: ach.title,
          color: ach.color || '#ffaa33',
          locked
        });
      } else {
        setActiveData(prev => ({
          ...prev,
          locked: false
        }));
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div ref={hudRef} className="hud-readout" style={{ opacity: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Line 1: Number */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '2.5rem',
          color: activeData.chapter > 0 ? activeData.color : 'var(--text-mono)',
          lineHeight: 1,
          transition: 'color 0.4s'
        }}>
          {String(Math.max(activeData.chapter, 0)).padStart(2, '0')}
        </div>
        
        {/* Line 2: Total */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          fontSize: '0.8rem',
          letterSpacing: '0.1em'
        }}>
          / {String(achievements.length).padStart(2, '0')}
        </div>

        {/* Line 3: Title */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: activeData.chapter > 0 ? activeData.color : 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginTop: '4px',
          opacity: activeData.chapter > 0 ? 1 : 0,
          transition: 'opacity 0.4s, color 0.4s'
        }}>
          {activeData.title || 'UNKNOWN SECTOR'}
        </div>

        {/* Line 4: Status */}
        <div className="hud-line hud-status" style={{ marginTop: '2px' }}>
          <span className="hud-blink" style={{ background: activeData.locked ? activeData.color : 'var(--accent-gold)' }} />
          <span className="hud-key" style={{ color: activeData.locked ? activeData.color : 'var(--text-mono)' }}>
            {activeData.locked ? 'LOCKED ON' : 'SCANNING'}
          </span>
        </div>
      </div>

      <div ref={hintRef} className="hud-hint" style={{ opacity: 0 }}>
        <span>Scroll to continue the journey</span>
        <span className="hud-hint-arrow">↓</span>
      </div>
    </>
  );
}
