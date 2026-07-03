function BasketballVisual() {
  return (
    <div className="artifact__collectible artifact__collectible--ball">
      <div className="artifact__bball-stage" aria-hidden="true">
        <div className="artifact__bball-3d">
          <div className="artifact__bball-inner">
            <svg className="artifact__bball-svg" viewBox="0 0 64 64" fill="none">
            <defs>
              <radialGradient id="bball-shade" cx="32%" cy="28%" r="68%">
                <stop offset="0%" stopColor="#ffc878" />
                <stop offset="35%" stopColor="#f07820" />
                <stop offset="72%" stopColor="#c44e08" />
                <stop offset="100%" stopColor="#6b2800" />
              </radialGradient>
              <radialGradient id="bball-ambient" cx="70%" cy="75%" r="45%">
                <stop offset="0%" stopColor="#3d1500" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#3d1500" stopOpacity="0" />
              </radialGradient>
              <filter id="bball-pebble" x="-8%" y="-8%" width="116%" height="116%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="4" />
                <feColorMatrix type="matrix" values="0 0 0 0 0.15  0 0 0 0 0.05  0 0 0 0 0  0 0 0 0.12 0" />
                <feBlend in="SourceGraphic" mode="multiply" />
              </filter>
            </defs>
            <circle cx="32" cy="32" r="27.5" fill="url(#bball-shade)" filter="url(#bball-pebble)" />
            <circle cx="32" cy="32" r="27.5" fill="url(#bball-ambient)" />
            {/* Panel seams — Wilson / NBA silhouette */}
            <g className="artifact__bball-seams" stroke="#1c0a00" strokeWidth="1.15" strokeLinecap="round" fill="none">
              <path d="M32 5.5 C46 14 50 32 32 58.5 C14 32 18 14 32 5.5Z" />
              <path d="M32 5.5 C18 14 14 32 32 58.5 C50 32 46 14 32 5.5Z" />
              <ellipse cx="32" cy="32" rx="27" ry="9.5" transform="rotate(-12 32 32)" />
            </g>
          </svg>
            <div className="artifact__bball-shine" />
            <div className="artifact__bball-rim" />
          </div>
        </div>
        <div className="artifact__collectible-shadow artifact__collectible-shadow--ball" />
      </div>
    </div>
  );
}

function JournalVisual() {
  return (
    <div className="artifact__collectible artifact__collectible--journal">
      <div className="artifact__journal-stage" aria-hidden="true">
        <div className="artifact__journal-stack">
          <div className="artifact__journal-pages-edge">
            <span /><span /><span /><span /><span />
          </div>
          <div className="artifact__journal-cover">
            <div className="artifact__journal-ribbon" />
            <div className="artifact__journal-corner artifact__journal-corner--tl" />
            <div className="artifact__journal-corner artifact__journal-corner--br" />
            <div className="artifact__journal-title">
              <span className="artifact__journal-title-main">POETRY</span>
              <span className="artifact__journal-title-sub">VOL. 01</span>
            </div>
            <div className="artifact__journal-spine-detail" />
          </div>
        </div>
        <div className="artifact__collectible-shadow artifact__collectible-shadow--journal" />
      </div>
    </div>
  );
}

function TerminalVisual() {
  return (
    <div className="artifact__collectible artifact__collectible--terminal">
      <div className="artifact__glass artifact__glass--terminal">
        <div className="artifact__terminal-chassis">
          <div className="artifact__terminal-bar" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="artifact__terminal-screen">
            <div>&gt; javac Main.java</div>
            <div>&gt; java Main</div>
            <div className="artifact__terminal-line--cursor">Running...</div>
          </div>
          <div className="artifact__terminal-bezel" aria-hidden="true" />
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
