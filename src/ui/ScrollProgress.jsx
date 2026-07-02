import { useEffect, useRef, useState } from 'react';
import useStore from '../hooks/useStore';
import { scrollState } from '../utils/scrollState';
import { ASTEROID_SCROLL_CENTERS } from '../utils/constants';
import { achievements } from '../data/achievements';

const CARD_COLORS = [
  "#8b5cf6", // RailSage AI
  "#38bdf8", // TaskFlow
  "#4ade80", // CivicSentinel
  "#fb923c", // ParkSense
  "#ec4899", // Portfolio
  "#a78bfa", // Certifications
  "#f43f5e", // Internships
];

/**
 * Vertical scroll progress line on the right edge of the screen.
 * Fills from top to bottom, mapping precisely to ASTEROID_SCROLL_CENTERS.
 */
export default function ScrollProgress() {
  const phase = useStore((s) => s.phase);
  const fillRef = useRef(null);
  const [activeColor, setActiveColor] = useState(CARD_COLORS[0]);

  useEffect(() => {
    let raf;
    const update = () => {
      const p = scrollState.progress;
      if (fillRef.current) {
        fillRef.current.style.height = `${p * 100}%`;
      }
      
      // Determine active asteroid for color
      let currentIdx = 0;
      for (let i = 0; i < ASTEROID_SCROLL_CENTERS.length; i++) {
        if (p >= ASTEROID_SCROLL_CENTERS[i] - 0.05) {
          currentIdx = i;
        }
      }
      setActiveColor(CARD_COLORS[currentIdx] || achievements[currentIdx]?.color || '#fff');
      
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (phase !== 'idle') return null;

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      bottom: '0',
      right: '24px', // padding from edge
      width: '1px',
      background: 'rgba(255,255,255,0.08)',
      zIndex: 100,
      pointerEvents: 'none'
    }}>
      {/* Filled portion */}
      <div
        ref={fillRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '0%',
          background: activeColor,
          transition: 'background 0.5s ease',
          boxShadow: `0 0 8px ${activeColor}`
        }}
      />
      
      {/* Dots for each asteroid */}
      {ASTEROID_SCROLL_CENTERS.map((center, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${center * 100}%`,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)'
          }} />
          <span style={{
            position: 'absolute',
            right: '10px', // label to the left of the dot
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            color: 'rgba(255,255,255,0.3)',
            whiteSpace: 'nowrap'
          }}>
            {String(i + 1).padStart(2, '0')}
          </span>
        </div>
      ))}
    </div>
  );
}
