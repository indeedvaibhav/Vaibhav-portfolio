import { coreIdentity } from '../data/achievements';
import useStore from '../hooks/useStore';
import { scrollState } from '../utils/scrollState';
import { INTRO_END } from '../utils/constants';
import { useEffect, useState } from 'react';

/**
 * Outro section — appears at the end of the scroll journey.
 * Shows a CTA / contact moment with Vaibhav's links.
 */
export default function OutroSection() {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    let raf;
    const update = () => {
      const t = scrollState.progress;
      if (t > 0.93) {
        setOpacity(Math.min((t - 0.93) / 0.05, 1));
      } else {
        setOpacity(0);
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (opacity < 0.01) return null;

  return (
    <div className="outro-section" style={{ opacity }}>
      <div className="outro-content">
        <div className="outro-label">END OF LOG</div>
        <h2 className="outro-title">Let&apos;s build something together.</h2>
        <p className="outro-desc">{coreIdentity.tagline}</p>

        <div className="outro-links">
          <a
            href={coreIdentity.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="outro-link"
          >
            <span className="link-arrow">→</span> GitHub
          </a>
          <a
            href={coreIdentity.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="outro-link"
          >
            <span className="link-arrow">→</span> LinkedIn
          </a>
        </div>

        <div className="outro-identity">
          <span>{coreIdentity.name}</span>
          <span className="outro-sep">·</span>
          <span>{coreIdentity.degree}, {coreIdentity.university}</span>
          <span className="outro-sep">·</span>
          <span>Graduating {coreIdentity.graduation}</span>
        </div>
      </div>
    </div>
  );
}
