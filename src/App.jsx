import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SpaceScene from './scene/SpaceScene';
import Preloader from './ui/Preloader';
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
 * Sets up the scroll-driven architecture:
 * - A scroll spacer div provides 900vh of scroll height
 * - GSAP ScrollTrigger scrubs scrollState.progress from 0→1
 * - The fixed Canvas reads scrollState.progress each frame
 * - UI overlays react to store changes
 */
export default function App() {
  const phase = useStore((s) => s.phase);
  const scrollRef = useRef(null);
  const [introOpacity, setIntroOpacity] = useState(1);

  // Initialize scene after mount (now handled by Preloader onComplete)


  // Set up GSAP ScrollTrigger → scrollState.progress
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
  }, []);

  // Intro overlay fade — reads scroll state via rAF
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

  return (
    <>
      {/* Preloader */}
      <Preloader onComplete={() => useStore.getState().setPhase('idle')} />

      {/* Scroll spacer — provides the scroll height */}
      <div ref={scrollRef} className="scroll-spacer" />

      {/* Fixed 3D canvas */}
      <div className="canvas-layer">
        <SpaceScene />
      </div>

      {/* Intro overlay — core identity at scroll=0 */}
      {introOpacity > 0.01 && (
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

      {/* UI overlays */}
      {phase === 'idle' && (
        <div className="ui-layer">
          <TopNav />
          <HUD />
          <ScrollCaption />
          <OutroSection />
          <AudioToggle />
        </div>
      )}

      {/* Detail panel (on top of everything) */}
      <DetailPanel />
    </>
  );
}
