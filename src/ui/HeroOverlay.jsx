import { useEffect, useRef, useState } from 'react';
import { coreIdentity } from '../data/achievements';
import ArtifactSystem from '../components/hero/ArtifactSystem';
import HeroStar from '../components/hero/HeroStar';
import { scrollState } from '../utils/scrollState';
import { INTRO_END } from '../utils/constants';

const TAGLINE = coreIdentity.tagline;

// ── Deterministic particle configs (sin-seeded so no random drift on remount) ──
const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const a = Math.sin(i * 2.31 + 1.5) * 0.5 + 0.5;
  const b = Math.sin(i * 1.73 + 0.8) * 0.5 + 0.5;
  const c = Math.sin(i * 3.14 + 2.1) * 0.5 + 0.5;
  return {
    id: i,
    orbitRadius: 65 + a * 115,   // 65 – 180 px
    duration:    3  + b * 6,     // 3  – 9  s per orbit
    size:        1  + c * 2,     // 1  – 3  px
    delay:       -(i / 8),       // fraction; multiplied by duration for real delay
    opacity:     0.2 + a * 0.2,  // 0.2 - 0.4 max
  };
});

// ── Meta row definition ──────────────────────────────────────────────────────
const META_ITEMS = [
  { text: coreIdentity.degree,                  type: 'text'     },
  { text: '·',                                  type: 'sep'      },
  { text: 'Kanpur, India', type: 'location', tooltip: '📍 UTC+5:30' },
  { text: '·',                                  type: 'sep'      },
  { text: `Class of ${coreIdentity.graduation}`,type: 'text'     },
];

/**
 * Cinematic hero overlay.
 *
 * Layers (back → front):
 *   canvas-layer  — Three.js (z-index 1) — tiny parallax via style.transform
 *   hero-sun-wrap — CSS sun, corona, particles — follows mouse +8 %
 *   intro-content-top  — eyebrow + name — moves OPPOSITE mouse –2 %
 *   intro-content-bottom — tagline, meta, pills — static
 *
 * Opacity driven by parent (App.jsx introOpacity).
 */
export default function HeroOverlay({ opacity }) {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const sunWrapRef  = useRef(null);
  const topLayerRef = useRef(null);
  const rafRef      = useRef(null);
  const mouseRef    = useRef({ x: 0, y: 0 });
  const lerpState   = useRef({ sunX: 0, sunY: 0, titleX: 0, titleY: 0 });

  // ── State ─────────────────────────────────────────────────────────────────
  const [typed,       setTyped]       = useState('');
  const [cursorOn,    setCursorOn]    = useState(true);
  const [typingDone,  setTypingDone]  = useState(false);
  const [metaVis,     setMetaVis]     = useState(META_ITEMS.map(() => false));
  const [pillsReady,  setPillsReady]  = useState(false);
  const [showLocTip,  setShowLocTip]  = useState(false);

  // ── Mouse parallax + sun-proximity ───────────────────────────────────────
  useEffect(() => {
    const lerp = (a, b, t) => a + (b - a) * t;

    const onMouse = (e) => {
      mouseRef.current.x = e.clientX - window.innerWidth  / 2;
      mouseRef.current.y = e.clientY - window.innerHeight / 2;

      // Proximity detection — DOM mutation, avoids React re-render every frame
      const sun = sunWrapRef.current;
      if (sun) {
        const r    = sun.getBoundingClientRect();
        const cx   = r.left + r.width  / 2;
        const cy   = r.top  + r.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const near = dist < 200;
        sun.classList.toggle('hero-sun-wrap--near', near);
      }
    };

    const tick = () => {
      const s = lerpState.current;
      const m = mouseRef.current;

      s.sunX   = lerp(s.sunX,   m.x *  0.08, 0.06);
      s.sunY   = lerp(s.sunY,   m.y *  0.08, 0.06);
      s.titleX = lerp(s.titleX, m.x * -0.02, 0.06);
      s.titleY = lerp(s.titleY, m.y * -0.02, 0.06);

      const sun = sunWrapRef.current;
      if (sun) {
        sun.style.transform =
          `translate(calc(-50% + ${s.sunX}px), calc(-50% + ${s.sunY}px))`;

        const instability = Math.min(1, scrollState.progress / INTRO_END);
        const starLight = 0.58 + instability * 0.38;
        sun.style.setProperty('--star-light', String(starLight));
        sun.style.setProperty('--star-instability', String(instability));
        sun.classList.toggle('hero-sun-wrap--unstable', instability > 0.08);
      }
      const top = topLayerRef.current;
      if (top) {
        top.style.transform = `translate(${s.titleX}px, ${s.titleY}px)`;
      }

      // Tiny starfield parallax on the canvas layer (1 % → ≈ 10 px max)
      const canvas = document.querySelector('.canvas-layer');
      if (canvas) {
        const bgX = lerp(parseFloat(canvas.dataset.bx || 0), m.x * 0.01, 0.06);
        const bgY = lerp(parseFloat(canvas.dataset.by || 0), m.y * 0.01, 0.06);
        canvas.dataset.bx = bgX;
        canvas.dataset.by = bgY;
        canvas.style.transform = `translate(${bgX}px, ${bgY}px)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouse, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouse);
      cancelAnimationFrame(rafRef.current);
      // Reset canvas transform so it doesn't stick after overlay unmounts
      const canvas = document.querySelector('.canvas-layer');
      if (canvas) { canvas.style.transform = ''; delete canvas.dataset.bx; delete canvas.dataset.by; }
    };
  }, []);

  // ── Typewriter ────────────────────────────────────────────────────────────
  useEffect(() => {
    let idx   = 0;
    let timer = null;

    const typeNext = () => {
      if (idx < TAGLINE.length) {
        idx++;
        setTyped(TAGLINE.slice(0, idx));
        timer = setTimeout(typeNext, 35);
      } else {
        // Typing complete — cursor on, then dismiss
        setCursorOn(true);
        setTypingDone(true);

        // Stagger meta items in
        META_ITEMS.forEach((_, i) => {
          setTimeout(() =>
            setMetaVis(prev => {
              const next = [...prev];
              next[i] = true;
              return next;
            }),
            i * 200
          );
        });

        // Pills appear after last meta item + 250 ms buffer
        setTimeout(() => setPillsReady(true), META_ITEMS.length * 200 + 250);
      }
    };

    timer = setTimeout(typeNext, 700);  // short pause before typing starts
    return () => clearTimeout(timer);
  }, []);

  // ── Cursor blink → static → gone ─────────────────────────────────────────
  useEffect(() => {
    if (typingDone) {
      // Cursor stays solid for 1.8 s then disappears
      const off = setTimeout(() => setCursorOn(false), 1800);
      return () => clearTimeout(off);
    }
    // Blink while typing
    const id = setInterval(() => setCursorOn(v => !v), 530);
    return () => clearInterval(id);
  }, [typingDone]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="intro-overlay" style={{ opacity }}>

      {/* ── Top text — moves OPPOSITE to sun for depth ─────────────────── */}
      <div ref={topLayerRef} className="intro-content-top">
        <div className="intro-label">CORE SIGNAL DETECTED</div>
        <h1 className="intro-name">{coreIdentity.name}</h1>
      </div>

      {/* ── Sun layer — follows mouse ───────────────────────────────────── */}
      <div ref={sunWrapRef} className="hero-sun-wrap" aria-hidden="true">

        {/* Orbiting amber particles */}
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="hero-orbit"
            style={{
              animationDuration: `${p.duration}s`,
              animationDelay:    `${p.delay * p.duration}s`,
            }}
          >
            <span
              className="hero-orbit-dot"
              style={{
                left:   `${p.orbitRadius}px`,
                width:  `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                boxShadow: `0 0 ${p.size * 3}px ${p.size}px rgba(255,170,51,0.55)`,
              }}
            />
          </div>
        ))}

        {/* Cinematic shader star — replaces CSS glow disc */}
        <HeroStar />

        {/* Interactive personality artifacts */}
        <ArtifactSystem />
      </div>

      {/* ── Bottom text — static ────────────────────────────────────────── */}
      <div className="intro-content-bottom">

        {/* Typewriter tagline */}
        <p className="intro-tagline">
          {typed}
          <span className="tw-cursor" style={{ opacity: cursorOn ? 1 : 0 }}>|</span>
        </p>

        {/* Meta row — each item fades + slides in individually */}
        <div className="intro-meta">
          {META_ITEMS.map((item, idx) => (
            <span
              key={idx}
              className={[
                'intro-meta-item',
                metaVis[idx] ? 'intro-meta-item--vis' : '',
                item.type === 'sep'      ? 'intro-sep'      : '',
                item.type === 'location' ? 'intro-location' : '',
              ].join(' ')}
              onMouseEnter={item.type === 'location' ? () => setShowLocTip(true)  : undefined}
              onMouseLeave={item.type === 'location' ? () => setShowLocTip(false) : undefined}
            >
              {item.text}
              {item.type === 'location' && showLocTip && (
                <span className="loc-tooltip">{item.tooltip}</span>
              )}
            </span>
          ))}
        </div>

        {/* Tag pills — stagger slide up */}
        <div className={`intro-focus ${pillsReady ? 'intro-focus--ready' : ''}`}>
          {coreIdentity.focus.map((f, idx) => (
            <span
              key={f}
              className="intro-focus-tag"
              style={{ transitionDelay: `${idx * 150}ms` }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
