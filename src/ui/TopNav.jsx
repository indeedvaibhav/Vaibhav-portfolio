import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import useStore from '../hooks/useStore';

/**
 * Fixed top navigation bar:
 * - Left: VAIBHAV.TRIPATHI logo with accent dot
 * - Right: GitHub, LinkedIn links + "Open to work" status pill
 */
export default function TopNav() {
  const phase = useStore((s) => s.phase);
  const navRef = useRef(null);

  useEffect(() => {
    if (phase === 'idle' && navRef.current) {
      gsap.fromTo(
        navRef.current,
        { y: -60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.3 }
      );
    }
  }, [phase]);

  return (
    <nav ref={navRef} className="top-nav" style={{ opacity: 0 }}>
      <div className="nav-left">
        <a href="#" className="nav-logo">
          VAIBHAV<span className="nav-dot">.</span>TRIPATHI
          <span className="nav-accent-dot" />
        </a>
      </div>

      <div className="nav-right">
        <a
          href="https://github.com/indeedvaibhav"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
          aria-label="GitHub"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        </a>

        <a
          href="https://linkedin.com/in/vaibhav-tripathi-919939339/"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
          aria-label="LinkedIn"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        </a>

        <div className="status-pill">
          <span className="status-dot" />
          <span>Open to work</span>
        </div>
      </div>
    </nav>
  );
}
