import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function ArtifactInfoCard({ info, x, y, onClose }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !info) return;

    gsap.fromTo(
      el,
      { opacity: 0, scale: 0.88, x: 0, y: 8 },
      { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.45, ease: 'back.out(1.6)' },
    );
  }, [info]);

  if (!info) return null;

  return (
    <div
      ref={cardRef}
      className="artifact-info-card artifact-info-card--visible"
      style={{ left: x, top: y, transform: 'translate(-50%, -110%)' }}
      role="dialog"
      aria-label={`${info.title} details`}
    >
      <button
        type="button"
        className="artifact-info-card__close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <div className="artifact-info-card__header">
        <span className="artifact-info-card__emoji" aria-hidden="true">
          {info.emoji}
        </span>
        <span className="artifact-info-card__title">{info.title}</span>
      </div>
      <ul className="artifact-info-card__lines">
        {info.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
