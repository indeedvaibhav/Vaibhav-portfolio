import { useEffect, useRef, useState } from 'react';
import { coreIdentity } from '../data/achievements';
import ArtifactSystem from '../components/hero/ArtifactSystem';

// ── Deterministic particle configs (sin-seeded so no random drift on remount) ──
const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const a = Math.sin(i * 2.31 + 1.5) * 0.5 + 0.5;
  const b = Math.sin(i * 1.73 + 0.8) * 0.5 + 0.5;
  const c = Math.sin(i * 3.14 + 2.1) * 0.5 + 0.5;
  return {
    id: i,
    orbitRadius: 65 + a * 115,   // 65 – 180 px
    duration: 3 + b * 6,     // 3  – 9  s per orbit
    size: 1 + c * 2,     // 1  – 3  px
    delay: -(i / 8),       // fraction; multiplied by duration for real delay
    opacity: 0.2 + a * 0.2,  // 0.2 - 0.4 max
  };
});

// ── Left side serif lines ──────────────────────────────────────────────────
const SERIF_LINES = [
  'I write Code,',
  'play Basketball,',
  'and pretend my poetry',
  'is intellectual.',
];

// ── Right side info items ──────────────────────────────────────────────────
const INFO_ITEMS = [
  coreIdentity.degree,
  coreIdentity.location,
  `Class of ${coreIdentity.graduation}`,
];

/**
 * Cinematic hero overlay.
 *
 * Layers (back → front):
 *   canvas-layer  — Three.js (z-index 1) — tiny parallax via style.transform
 *   hero-sun-wrap — CSS sun, corona, particles — follows mouse +8 %
 *   intro-content-top  — eyebrow + name — moves OPPOSITE mouse –2 %
 *   hero-side-left / hero-side-right — flanking content — static, absolute
 *
 * Opacity driven by parent (App.jsx introOpacity).
 */
export default function HeroOverlay({ opacity }) {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const sunWrapRef = useRef(null);
  const topLayerRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const lerpState = useRef({ sunX: 0, sunY: 0, titleX: 0, titleY: 0 });

  // ── State ─────────────────────────────────────────────────────────────────
  const [typed, setTyped] = useState('');
  const [cursorOn, setCursorOn] = useState(true);
  const [typingDone, setTypingDone] = useState(false);
  // left-side serif lines visibility
  const [linesVis, setLinesVis] = useState(SERIF_LINES.map(() => false));
  // right-side info + pills visibility
  const [infoVis, setInfoVis] = useState(INFO_ITEMS.map(() => false));
  const [pillsVis, setPillsVis] = useState(coreIdentity.focus.map(() => false));

  // ── Mouse parallax + sun-proximity ───────────────────────────────────────
  useEffect(() => {
    const lerp = (a, b, t) => a + (b - a) * t;

    const onMouse = (e) => {
      mouseRef.current.x = e.clientX - window.innerWidth / 2;
      mouseRef.current.y = e.clientY - window.innerHeight / 2;

      // Proximity detection — DOM mutation, avoids React re-render every frame
      const sun = sunWrapRef.current;
      if (sun) {
        const r = sun.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const near = dist < 200;
        sun.classList.toggle('hero-sun-wrap--near', near);
      }
    };

    const tick = () => {
      const s = lerpState.current;
      const m = mouseRef.current;

      s.sunX = lerp(s.sunX, m.x * 0.08, 0.06);
      s.sunY = lerp(s.sunY, m.y * 0.08, 0.06);
      s.titleX = lerp(s.titleX, m.x * -0.02, 0.06);
      s.titleY = lerp(s.titleY, m.y * -0.02, 0.06);

      const sun = sunWrapRef.current;
      if (sun) {
        sun.style.transform =
          `translate(calc(-50% + ${s.sunX}px), calc(-50% + ${s.sunY}px))`;
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

  // ── Typewriter — then trigger side panels ─────────────────────────────────
  useEffect(() => {
    // We only need typed for the cursor effect now; tagline is displayed as static lines
    let timer = null;
    // Simulate typewriter completion delay then show sides
    const TYPING_DURATION = 700 + 35 * 'I write Java, play basketball, and pretend my poetry is intellectual.'.length;

    timer = setTimeout(() => {
      setTypingDone(true);
      setCursorOn(false);

      // LEFT: stagger serif lines in at delay 1.4s (already waited), 0.15s apart
      SERIF_LINES.forEach((_, i) => {
        setTimeout(() => {
          setLinesVis(prev => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * 150);
      });

      // RIGHT: info items at delay 1.5s + 0.1s apart
      INFO_ITEMS.forEach((_, i) => {
        setTimeout(() => {
          setInfoVis(prev => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, 100 + i * 100);
      });

      // RIGHT: pills after info items
      coreIdentity.focus.forEach((_, i) => {
        setTimeout(() => {
          setPillsVis(prev => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, 100 + INFO_ITEMS.length * 100 + 120 + i * 100);
      });
    }, TYPING_DURATION);

    return () => clearTimeout(timer);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="intro-overlay" style={{ opacity }}>

      {/* ── Top text — moves OPPOSITE to sun for depth ─────────────────── */}
      <div ref={topLayerRef} className="intro-content-top">
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
              animationDelay: `${p.delay * p.duration}s`,
            }}
          >
            <span
              className="hero-orbit-dot"
              style={{
                left: `${p.orbitRadius}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                boxShadow: `0 0 ${p.size * 3}px ${p.size}px rgba(255,170,51,0.55)`,
              }}
            />
          </div>
        ))}

        {/* Corona rings — staggered pulse outward */}
        <div className="hero-corona" style={{ animationDelay: '0s' }} />
        <div className="hero-corona" style={{ animationDelay: '-0.83s' }} />
        <div className="hero-corona" style={{ animationDelay: '-1.67s' }} />

        {/* Central glow disc — breathes slowly */}
        <div className="hero-sun-glow" />

        {/* Interactive personality artifacts */}
        <ArtifactSystem />
      </div>

      {/* ── LEFT panel: Serif personality lines ────────────────────────── */}
      <div className="hero-side-left" aria-label="Personal tagline">
        {/* Decorative open-quote glyph */}
        <span
          className={`hero-serif-quote${linesVis[0] ? ' hero-serif-quote--vis' : ''}`}
          aria-hidden="true"
        >&#8220;</span>
        {SERIF_LINES.map((line, i) => (
          <span
            key={i}
            className={`hero-serif-line${linesVis[i] ? ' hero-serif-line--vis' : ''}`}
            style={{ transitionDelay: `${i * 0.15}s` }}
          >
            {line}
          </span>
        ))}
      </div>

      {/* ── RIGHT panel: Info + pills ──────────────────────────────────── */}
      <div className="hero-side-right" aria-label="Education and focus areas">

        {/* Section label */}
        <span className={`hero-right-label${infoVis[0] ? ' hero-right-label--vis' : ''}`}>
          <span className="hero-right-label-dot" aria-hidden="true" />
          FIELD&nbsp;LOG
        </span>

        {/* B.Tech info cluster */}
        <div className="hero-info-cluster">
          {INFO_ITEMS.map((item, i) => (
            <span
              key={i}
              className={`hero-info-item${infoVis[i] ? ' hero-info-item--vis' : ''}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <span className="hero-info-glyph" aria-hidden="true">›</span>
              {item}
            </span>
          ))}
        </div>

        {/* Tag pills — stacked vertically */}
        <div className="hero-pills-stack">
          {coreIdentity.focus.map((f, i) => (
            <span
              key={f}
              className={`hero-side-pill${pillsVis[i] ? ' hero-side-pill--vis' : ''}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <span className="hero-pill-shimmer" aria-hidden="true" />
              <span className="hero-pill-dot" aria-hidden="true" />
              {f}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
