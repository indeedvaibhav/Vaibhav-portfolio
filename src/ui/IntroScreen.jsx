import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import useStore from "../hooks/useStore";

const HEADLINE_LINES = [
  { text: "Let's take a ride", accent: false },
  { text: "through my", accent: false },
  { text: "constellation", accent: true },
  { text: "of ideas.", accent: false },
];

export default function IntroScreen() {
  const setPhase = useStore((s) => s.setPhase);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const lineRefs = useRef([]);
  const subtitleRef = useRef(null);
  const buttonRef = useRef(null);
  const buttonBgRef = useRef(null);
  const buttonTextRef = useRef(null);
  const buttonIconRef = useRef(null);
  const shimmerRef = useRef(null);
  const footerRef = useRef(null);
  const gsapCtx = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

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
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

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

  useEffect(() => {
    if (!visible) return;

    gsapCtx.current = gsap.context(() => {
      const lines = lineRefs.current.filter(Boolean);

      gsap.from(lines, {
        opacity: 0,
        y: -40,
        duration: 0.9,
        stagger: 0.15,
        ease: "back.out(1.4)",
        delay: 0.2,
      });

      gsap.from(subtitleRef.current, {
        opacity: 0,
        duration: 0.6,
        delay: 0.9,
      });

      gsap.set(buttonRef.current, { opacity: 0, scale: 0.8, y: 20 });

      gsap.to(buttonRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.7,
        ease: "back.out(2)",
        delay: 0.8,
        onComplete: () => {
          gsap.to(shimmerRef.current, {
            x: "260%",
            duration: 0.7,
            ease: "power2.inOut",
            repeat: -1,
            repeatDelay: 2.5,
          });
        },
      });

      gsap.from(footerRef.current, {
        opacity: 0,
        y: 10,
        duration: 0.8,
        delay: 1.2,
        ease: "power2.out",
      });
    });

    return () => gsapCtx.current?.revert();
  }, [visible]);

  const triggerGlitchTransition = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      setPhase("transition");
    }, 650);
  };

  const handleStart = () => {
    if (exiting) return;
    gsap.to(buttonRef.current, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
      onComplete: () => triggerGlitchTransition(),
    });
  };

  const handleMouseEnter = () => {
    gsap.to(buttonRef.current, {
      scale: 1.05,
      duration: 0.3,
      ease: "power2.out",
    });
    gsap.to(buttonBgRef.current, {
      background: "#ffb454",
      duration: 0.3,
    });
    gsap.to([buttonTextRef.current, buttonIconRef.current], {
      color: "#05060a",
      duration: 0.3,
    });
  };

  const handleMouseLeave = () => {
    gsap.to(buttonRef.current, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
    });
    gsap.to(buttonBgRef.current, {
      background: "rgba(255, 170, 51, 0.05)",
      duration: 0.3,
    });
    gsap.to([buttonTextRef.current, buttonIconRef.current], {
      color: "#e8e6f0",
      duration: 0.3,
    });
  };

  return (
    <div
      className={`intro-screen ${visible ? "intro-screen--visible" : ""} ${
        exiting ? "intro-screen--exit" : ""
      }`}
    >
      <canvas ref={canvasRef} className="intro-screen__canvas" />
      <div className="intro-screen__spotlight" />
      <div className="intro-screen__grid" />

      <div className="intro-screen__content">
        <h1 className="intro-screen__headline">
          {HEADLINE_LINES.map((line, i) => (
            <span
              key={line.text}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className={`intro-screen__headline-line${
                line.accent ? " intro-screen__headline-line--accent" : ""
              }`}
            >
              {line.text}
            </span>
          ))}
        </h1>

        <p ref={subtitleRef} className="intro-screen__sub">

        </p>

        <button
          ref={buttonRef}
          id="intro-get-started"
          className={`intro-screen__cta ${exiting ? "intro-screen__cta--exit" : ""}`}
          onClick={handleStart}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label="Get started — enter the portfolio"
        >
          <span ref={buttonBgRef} className="intro-screen__cta-bg" />
          <span ref={shimmerRef} className="intro-screen__cta-shimmer" aria-hidden="true" />
          <span ref={buttonTextRef} className="intro-screen__cta-text">
            GET STARTED
          </span>
          <svg
            ref={buttonIconRef}
            className="intro-screen__cta-icon"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 7H13M8 2L13 7L8 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="intro-screen__hint">Click to dive in</div>
      </div>

      <div ref={footerRef} className="intro-screen__footer">
        VAIBHAV TRIPATHI
        <span className="intro-screen__footer-sep intro-screen__footer-sep--desktop">
          {" "}
          ·{" "}
        </span>
        <br className="intro-screen__footer-br" />
        B.Tech CSE · PSIT Kanpur
      </div>
    </div>
  );
}
