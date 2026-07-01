import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import useStore from '../hooks/useStore';
import { achievements } from '../data/achievements';

import GlareHover from './GlareHover';

/**
 * Dossier-style detail panel — opened by clicking an in-focus asteroid.
 * Now rendered as a centered modal wrapped in a GlareHover component.
 */
export default function DetailPanel() {
  const expandedIndex = useStore((s) => s.expandedIndex);
  const panelRef = useRef(null);
  const contentRef = useRef(null);

  const achievement = expandedIndex >= 0 ? achievements[expandedIndex] : null;

  useEffect(() => {
    if (achievement && panelRef.current) {
      document.body.style.overflow = 'hidden';

      gsap.fromTo(
        panelRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' }
      );

      if (contentRef.current) {
        const items = contentRef.current.querySelectorAll('.panel-item');
        gsap.fromTo(
          items,
          { y: 15, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.05,
            duration: 0.4,
            ease: 'power2.out',
            delay: 0.15,
          }
        );
      }
    }
  }, [achievement]);

  const handleClose = () => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power3.in',
        onComplete: () => {
          useStore.getState().setExpandedIndex(-1);
          document.body.style.overflow = '';
        },
      });
    }
  };

  if (!achievement) return null;

  return (
    <div
      ref={panelRef}
      className="detail-panel"
      style={{ opacity: 0 }}
    >
      <div className="panel-backdrop" onClick={handleClose} />

      <GlareHover
        width="min(500px, 90vw)"
        height="auto"
        background="transparent"
        borderRadius="12px"
        borderColor="rgba(255, 255, 255, 0.08)"
        glareColor={achievement.color}
        glareOpacity={0.2}
        glareAngle={-45}
        glareSize={250}
        transitionDuration={650}
      >
        <div ref={contentRef} className="detail-content">
          {/* Header */}
          <div className="panel-header panel-item">
            <span
              className="panel-category"
              style={{ borderColor: achievement.color, color: achievement.color }}
            >
              {achievement.category}
            </span>
            <button
              className="panel-close"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <span className="close-bracket">[</span>
              <span className="close-x">×</span>
              <span className="close-bracket">]</span>
            </button>
          </div>

          <h2 className="panel-title panel-item">{achievement.title}</h2>

          <div
            className="panel-divider panel-item"
            style={{ borderColor: `${achievement.color}33` }}
          />

          <p className="panel-description panel-item">{achievement.description}</p>

          <div className="panel-section panel-item">
            <h3 className="panel-section-title">DETAILS</h3>
            <div className="panel-details">
              {Object.entries(achievement.details).map(([key, val]) => (
                <div key={key} className="panel-detail-row">
                  <span className="panel-detail-key">{key.toUpperCase()}</span>
                  <span className="panel-detail-val">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(achievement.links).length > 0 && (
            <div className="panel-section panel-item">
              <h3 className="panel-section-title">LINKS</h3>
              <div className="panel-links">
                {achievement.links.live && (
                  <a
                    href={achievement.links.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="panel-link"
                    style={{ borderColor: `${achievement.color}55` }}
                  >
                    <span className="link-arrow">→</span> Live Site
                  </a>
                )}
                {achievement.links.github && (
                  <a
                    href={achievement.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="panel-link"
                    style={{ borderColor: `${achievement.color}55` }}
                  >
                    <span className="link-arrow">→</span> GitHub
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="panel-section panel-item">
            <h3 className="panel-section-title">TAGS</h3>
            <div className="panel-tags">
              {achievement.tags.map((tag) => (
                <span key={tag} className="panel-tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="panel-footer panel-item">
            <span className="panel-file-ref">
              /{achievement.id}.log — field entry #{expandedIndex + 1}
            </span>
          </div>
        </div>
      </GlareHover>
    </div>
  );
}
