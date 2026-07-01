import { useEffect, useRef, useState } from "react";
import useStore from "../hooks/useStore";

export default function IntroScreen() {
  const setPhase = useStore((s) => s.setPhase);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Fade in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Draw animated particle field on the background canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate particles
    const PARTICLE_COUNT = 80;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.4 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.012;

      particles.forEach((p) => {
        // Drift
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        // Wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const alpha = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 170, 51, ${alpha})`;
        ctx.fill();
      });

      // Draw faint connection lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.06;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 170, 51, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleStart = () => {
    if (exiting) return;
    setExiting(true);
    // Slight delay to let the exit animation start before mounting transition
    setTimeout(() => {
      setPhase("transition");
    }, 650);
  };

  return (
    <div
      className={`intro-screen ${visible ? "intro-screen--visible" : ""} ${
        exiting ? "intro-screen--exit" : ""
      }`}
    >
      {/* Particle field canvas */}
      <canvas ref={canvasRef} className="intro-screen__canvas" />

      {/* Radial spotlight */}
      <div className="intro-screen__spotlight" />

      {/* Horizontal grid lines */}
      <div className="intro-screen__grid" />

      {/* Content */}
      <div className="intro-screen__content">
        <div className="intro-screen__eyebrow">
          <span className="intro-screen__dot" />
          SIGNAL DETECTED
          <span className="intro-screen__dot" />
        </div>

        <h1 className="intro-screen__headline">
          Enter<br />
          <span className="intro-screen__headline-accent">the Core</span>
        </h1>

        <p className="intro-screen__sub">
          A journey through achievements, built in deep space.
        </p>

        <button
          id="intro-get-started"
          className={`intro-screen__cta ${exiting ? "intro-screen__cta--exit" : ""}`}
          onClick={handleStart}
          aria-label="Get started — enter the portfolio"
        >
          <span className="intro-screen__cta-pulse" />
          <span className="intro-screen__cta-text">GET STARTED</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 7H13M8 2L13 7L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="intro-screen__hint">Click to activate the sequence</div>
      </div>

      {/* Bottom identity strip */}
      <div className="intro-screen__footer">
        <span className="intro-screen__footer-mark">VAIBHAV TRIPATHI</span>
        <span className="intro-screen__footer-sep">·</span>
        <span>B.Tech CSE</span>
        <span className="intro-screen__footer-sep">·</span>
        <span>PSIT Kanpur</span>
      </div>
    </div>
  );
}
