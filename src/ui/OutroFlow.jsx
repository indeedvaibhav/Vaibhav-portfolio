import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { coreIdentity } from '../data/achievements';
import './OutroFlow.css';

gsap.registerPlugin(ScrollTrigger);

const WORDS = [
  'code.',
  'build.',
  'ship.',
  'debug.',
  'think.',
  'design.',
  'run.',
  'write.',
  'learn.',
  'break things.',
  'fix things.',
  'deploy.',
  'do it.'
];

const COLORS = [
  'oklch(75% 0.28 50)',   // amber
  'oklch(75% 0.28 300)',  // purple
  'oklch(75% 0.28 200)',  // cyan
  'oklch(75% 0.28 150)',  // green
  'oklch(75% 0.28 340)'   // pink
];

export default function OutroFlow() {
  const containerRef = useRef(null);
  const wordsRef = useRef([]);
  const headingRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Word Revealer Animations
      wordsRef.current.forEach((wordEl, i) => {
        if (!wordEl) return;
        const targetColor = COLORS[i % COLORS.length];

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: wordEl,
            start: 'top 65%',
            end: 'bottom 35%',
            scrub: 0.2,
          }
        });
        
        // Brighten on approach, dim on exit
        tl.to(wordEl, { opacity: 1, color: targetColor, duration: 0.5, ease: 'none' })
          .to(wordEl, { opacity: 0.15, color: '#eef1f7', duration: 0.5, ease: 'none' });
      });

      // 2. Final Frame Animations
      const chars = headingRef.current.querySelectorAll('.final-frame__word');
      
      const tlFinal = gsap.timeline({
        scrollTrigger: {
          trigger: headingRef.current,
          start: 'top 80%',
        }
      });

      tlFinal.to(chars, {
        y: '0%',
        opacity: 1,
        duration: 0.8,
        ease: 'back.out(1.5)',
        stagger: 0.12,
      });

      tlFinal.to(actionsRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
      }, '+=0.3');

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="outro-flow-container" ref={containerRef}>
      
      {/* SECTION 1: Word Revealer */}
      <section className="word-revealer">
        <div className="word-revealer__left">
          <h2 className="word-revealer__prefix">Vaibhav can</h2>
        </div>
        <div className="word-revealer__right">
          {WORDS.map((word, i) => (
            <p
              key={i}
              className="word-revealer__word"
              ref={(el) => (wordsRef.current[i] = el)}
            >
              {word}
            </p>
          ))}
        </div>
      </section>

      {/* SECTION 2: Final Frame */}
      <section className="final-frame">
        <div className="final-frame__eyebrow">
          END OF FIELD LOG
        </div>
        
        <h1 className="final-frame__heading" ref={headingRef}>
          <div className="final-frame__word-wrap">
            <span className="final-frame__word">Let's</span>
          </div>
          <div className="final-frame__word-wrap">
            <span className="final-frame__word">build</span>
          </div>
          <div className="final-frame__word-wrap">
            <span className="final-frame__word">something.</span>
          </div>
        </h1>

        <p className="final-frame__sub">
          Open to work · {coreIdentity.location} · Class of {coreIdentity.graduation}
        </p>

        <div className="final-frame__actions" ref={actionsRef}>
          <a
            href="mailto:vaibhav@email.com"
            className="final-btn final-btn--filled"
          >
            <span className="link-arrow">→</span> Get in touch
          </a>
          <a
            href={coreIdentity.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="final-btn final-btn--outlined"
          >
            <span className="link-arrow">↗</span> GitHub
          </a>
        </div>
      </section>
      
    </div>
  );
}
