import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SpaceScene from './scene/SpaceScene';
import Preloader from './ui/Preloader';
import IntroScreen from './ui/IntroScreen';
import CrystalTransition from './ui/CrystalTransition';
import TopNav from './ui/TopNav';
import HUD from './ui/HUD';
import ScrollCaption from './ui/ScrollCaption';
import DetailPanel from './ui/DetailPanel';
import OutroSection from './ui/OutroSection';
import AudioToggle from './ui/AudioToggle';
import useStore from './hooks/useStore';
import { scrollState } from './utils/scrollState';
import { coreIdentity } from './data/achievements';
import { INTRO_END } from './utils/constants';

gsap.registerPlugin(ScrollTrigger);

/**
 * Root application.
 *
 * Phase flow:
 *   'loading'    → Preloader is displayed (0 → 100%)
 *   'intro'      → Fullscreen intro screen ("Signal Detected" / "Get Started")
 *   'transition' → Crystal/glitch cinematic overlay plays automatically
 *   'idle'       → Portfolio running normally (scroll-driven, all sections live)
 *
 * The 3D scene and scroll spacer mount from the 'intro' phase onward so the
 * R3F canvas is fully warm by the time the transition ends.
 */
export default function App() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const scrollRef = useRef(null);
  const [introOpacity, setIntroOpacity] = useState(1);

  // Set up GSAP ScrollTrigger → scrollState.progress (only meaningful in 'idle')
  useEffect(() => {
    if (!scrollRef.current) return;

    const tween = gsap.to(scrollState, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: scrollRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
      },
    });

    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [isSceneReady]);

  // Intro overlay opacity — driven by scroll progress in 'idle'
  useEffect(() => {
    let raf;
    const update = () => {
      const t = scrollState.progress;
      if (t < INTRO_END) {
        setIntroOpacity(1 - t / INTRO_END);
      } else {
        setIntroOpacity(0);
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  const isSceneReady = phase === 'intro' || phase === 'transition' || phase === 'idle';

  return (
    <>
      {/* ── Preloader ───────────────────────────── */}
      {phase === 'loading' && (
        <Preloader
          onComplete={() => setPhase('intro')}
        />
      )}

      {/* ── Intro Screen ────────────────────────── */}
      {phase === 'intro' && <IntroScreen />}

      {/* ── Crystal / Glitch Transition ─────────── */}
      {phase === 'transition' && (
        <CrystalTransition onComplete={() => setPhase('idle')} />
      )}

      {/* ── Scroll spacer + 3D scene (mounted from 'intro' onward) ── */}
      {isSceneReady && (
        <>
          {/* Scroll spacer — provides 900vh of scroll height */}
          <div ref={scrollRef} className="scroll-spacer" />

          {/* Fixed 3D canvas — hidden behind the overlay during transition */}
          <div
            className="canvas-layer"
            style={{
              // Keep the canvas invisible during the transition so the crystal
              // overlay is the only thing the user sees.
              visibility: phase === 'idle' ? 'visible' : 'hidden',
            }}
          >
            <SpaceScene />
          </div>
        </>
      )}

      {/* ── Hero intro overlay (scroll-driven fade in 'idle') ── */}
      {phase === 'idle' && introOpacity > 0.01 && (
        <div className="intro-overlay" style={{ opacity: introOpacity }}>
          <div className="intro-content">
            <div className="intro-label">CORE SIGNAL DETECTED</div>
            <h1 className="intro-name">{coreIdentity.name}</h1>
            <p className="intro-tagline">{coreIdentity.tagline}</p>
            <div className="intro-meta">
              <span>{coreIdentity.degree}</span>
              <span className="intro-sep">·</span>
              <span>{coreIdentity.location}</span>
              <span className="intro-sep">·</span>
              <span>Class of {coreIdentity.graduation}</span>
            </div>
            <div className="intro-focus">
              {coreIdentity.focus.map((f) => (
                <span key={f} className="intro-focus-tag">{f}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── UI overlays (portfolio chrome) ─────── */}
      {phase === 'idle' && (
        <div className="ui-layer">
          <TopNav />
          <HUD />
          <ScrollCaption />
          <OutroSection />
          <AudioToggle />
        </div>
      )}

      {/* ── Detail panel (always on top when open) ── */}
      {phase === 'idle' && <DetailPanel />}
    </>
  );
}
