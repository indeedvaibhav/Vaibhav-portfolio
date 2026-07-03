function BasketballVisual() {
  return (
    <div className="artifact__object artifact__object--basketball" aria-hidden="true">
      <div className="artifact__object-shadow" />
      <div className="artifact__bball-scene">
        <div className="artifact__bball-float">
          <div className="artifact__bball-spin">
            <svg
            className="artifact__bball-svg"
            viewBox="0 0 80 80"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="bball-surface" cx="32%" cy="28%" r="68%">
                <stop offset="0%" stopColor="#ffc878" />
                <stop offset="35%" stopColor="#f07818" />
                <stop offset="72%" stopColor="#c44a08" />
                <stop offset="100%" stopColor="#6e2800" />
              </radialGradient>
              <radialGradient id="bball-ambient" cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
              </radialGradient>
              <filter id="bball-pebble" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="8" result="noise" />
                <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
                <feBlend in="SourceGraphic" in2="gray" mode="soft-light" />
              </filter>
              <linearGradient id="bball-shine-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="45%" stopColor="rgba(255,255,255,0)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            <circle cx="40" cy="40" r="35" fill="url(#bball-surface)" filter="url(#bball-pebble)" />
            <circle cx="40" cy="40" r="35" fill="url(#bball-ambient)" />

            {/* Panel seams — Wilson-style curved channels */}
            <path
              className="artifact__bball-seam"
              d="M 6 40 C 18 14, 62 14, 74 40 C 62 66, 18 66, 6 40 Z"
              fill="none"
              strokeWidth="1.6"
            />
            <path
              className="artifact__bball-seam"
              d="M 40 5 C 66 18, 66 62, 40 75 C 14 62, 14 18, 40 5 Z"
              fill="none"
              strokeWidth="1.6"
            />
            <ellipse
              className="artifact__bball-seam artifact__bball-seam--thin"
              cx="40"
              cy="40"
              rx="34"
              ry="12"
              fill="none"
              strokeWidth="1.1"
            />

            <ellipse
              className="artifact__bball-highlight"
              cx="30"
              cy="26"
              rx="14"
              ry="9"
              fill="url(#bball-shine-grad)"
              opacity="0.7"
            />
          </svg>
            <div className="artifact__bball-specular" />
          </div>
        </div>
      </div>
    </div>
  );
}

function JournalVisual() {
  return (
    <div className="artifact__object artifact__object--journal" aria-hidden="true">
      <div className="artifact__object-shadow" />
      <div className="artifact__journal-scene">
        <div className="artifact__journal-stack">
          {/* Page edges (depth) */}
          <div className="artifact__journal-edges">
            <span /><span /><span /><span />
          </div>

          {/* Inner pages */}
          <div className="artifact__journal-pages">
            <div className="artifact__journal-page-lines">
              <span /><span /><span /><span />
            </div>
          </div>

          {/* Cover */}
          <div className="artifact__journal-cover">
            <div className="artifact__journal-cover-texture" />
            <div className="artifact__journal-corner artifact__journal-corner--tl" />
            <div className="artifact__journal-corner artifact__journal-corner--br" />
            <div className="artifact__journal-cover-face">
              <span className="artifact__journal-author">VAIBHAV&apos;S</span>
              <span className="artifact__journal-title">POETRY</span>
              <span className="artifact__journal-vol">VOL. 01</span>
            </div>
            <div className="artifact__journal-emboss" />
          </div>

          <div className="artifact__journal-spine" />
          <div className="artifact__journal-ribbon" />
        </div>
      </div>
    </div>
  );
}

function TerminalVisual() {
  return (
    <div className="artifact__object artifact__object--terminal" aria-hidden="true">
      <div className="artifact__object-shadow" />
      <div className="artifact__glass">
        <div className="artifact__terminal">
          <div className="artifact__terminal-bar">
            <span /><span /><span />
          </div>
          <div className="artifact__terminal-screen">
            <div>&gt; javac Main.java</div>
            <div>&gt; java Main</div>
            <div className="artifact__terminal-line--cursor">Running...</div>
          </div>
          <div className="artifact__terminal-scanline" />
        </div>
      </div>
    </div>
  );
}

const VISUALS = {
  basketball: BasketballVisual,
  journal: JournalVisual,
  terminal: TerminalVisual,
};

export default function OrbitingArtifact({
  artifactRef,
  id,
  className,
  label,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}) {
  const Visual = VISUALS[id];

  return (
    <div
      ref={artifactRef}
      className={`artifact artifact--${id} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="artifact__body">
        <Visual />
      </div>
    </div>
  );
}
