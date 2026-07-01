import { useState, useEffect, useRef } from "react";
import useStore from "../hooks/useStore";

export default function Preloader({ onComplete }) {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState(null);
  const wordRef = useRef(null);
  const [fontSize, setFontSize] = useState(0);

  // Measure font size for the capsule math and handle resizing
  useEffect(() => {
    const updateSize = () => {
      if (wordRef.current) {
        setFontSize(parseFloat(getComputedStyle(wordRef.current).fontSize));
      }
    };
    updateSize();
    // Add slight delay to handle font loading
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    let p = 0;
    const timer = setInterval(() => {
      p += 1.5 + Math.random() * 4;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        setTimeout(() => {
          setDone(true);
          setTimeout(() => {
            if (onComplete) onComplete();
            setVisible(false);
          }, 700); // matches the fade-out duration
        }, 500);
      }
      setPct(p);
    }, 90);

    // Timeout fallback — if loading takes > 15s, show error
    const timeout = setTimeout(() => {
      setError('Taking longer than expected...');
    }, 15000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  if (!visible) return null;

  const baseSize = fontSize ? fontSize * 0.62 : 0;
  const maxStretch = fontSize ? fontSize * 3.1 : 0;
  const width = baseSize + (maxStretch - baseSize) * (pct / 100);

  // For initial render before font size is measured, use em as fallback
  const capStyle = fontSize ? { width, height: baseSize } : { width: '0.62em', height: '0.62em' };

  return (
    <div className={`preloader ${done ? "hide" : ""}`}>
      <div className="preloader-content">
        <div className="loader-pct">{Math.floor(pct)}%</div>
        <div className="loader-word" ref={wordRef}>
          <span>L</span>
          <span
            className={`o-cap ${pct >= 100 ? "done" : ""}`}
            style={capStyle}
          />
          <span>ADING</span>
        </div>

        {error && (
          <div className="preloader-error">
            <span>⚠ {error}</span>
            <button onClick={() => window.location.reload()}>RETRY</button>
          </div>
        )}
      </div>
    </div>
  );
}
