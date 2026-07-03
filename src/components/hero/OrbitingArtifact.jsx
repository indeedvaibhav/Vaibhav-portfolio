function BasketballVisual() {
  return (
    <div className="artifact__glass">
      <div className="artifact__bball" aria-hidden="true" />
    </div>
  );
}

function JournalVisual() {
  return (
    <div className="artifact__glass">
      <div className="artifact__journal">
        <div className="artifact__journal-spine" aria-hidden="true" />
        <div className="artifact__journal-lines" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="artifact__journal-page" aria-hidden="true" />
      </div>
    </div>
  );
}

function TerminalVisual() {
  return (
    <div className="artifact__glass">
      <div className="artifact__terminal">
        <div className="artifact__terminal-bar" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div>&gt; javac Main.java</div>
        <div>&gt; java Main</div>
        <div className="artifact__terminal-line--cursor">Running...</div>
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
