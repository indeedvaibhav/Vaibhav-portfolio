import useStore from '../hooks/useStore';
import { achievements } from '../data/achievements';

/**
 * Auto-reveal caption for the currently in-focus asteroid.
 * Shows title + category/summary, fades based on scroll proximity.
 * Fixed overlay — appears center-left of the screen.
 */
export default function ScrollCaption() {
  const activeIndex = useStore((s) => s.activeIndex);
  const activeOpacity = useStore((s) => s.activeOpacity);
  const expandedIndex = useStore((s) => s.expandedIndex);

  // Don't show caption if no asteroid active or panel is open
  if (activeIndex < 0 || expandedIndex >= 0) return null;

  const ach = achievements[activeIndex];
  if (!ach) return null;

  return (
    <div
      className="scroll-caption"
      style={{ opacity: activeOpacity }}
    >
      <span
        className="caption-category"
        style={{ color: ach.color, borderColor: `${ach.color}66` }}
      >
        {ach.category}
      </span>
      <h2 className="caption-title">{ach.title}</h2>
      <p className="caption-summary">{ach.summary}</p>
      <div className="caption-hint">
        <span className="caption-click-hint">Click the rock for details</span>
      </div>
    </div>
  );
}
