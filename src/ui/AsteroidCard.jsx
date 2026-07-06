import { useEffect, useRef, useState } from "react";
import { ASTEROID_SCROLL_CENTERS } from "../utils/constants";
import { achievements } from "../data/achievements";
import { scrollState } from "../utils/scrollState";
import { gsap } from "gsap";
import "./AsteroidCard.css";
import "./credentials-gallery.css";

const CARD_COLORS = [
  "#8b5cf6", // RailSage AI
  "#38bdf8", // TaskFlow
  "#4ade80", // CivicSentinel
  "#fb923c", // ParkSense
  "#ec4899", // Portfolio
  "#a78bfa", // Certifications
  "#f43f5e", // Internships
];

/**
 * How wide each project's scroll "chapter" window is.
 * Larger than the old FADE_RADIUS to give the cinematic
 * reveal sequence enough scroll room to breathe.
 */
const MISSION_RADIUS = 0.10;

/** Convert hex color to rgba string for accent-colored effects */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Cinematic, narrative project showcase.
 *
 * Each project is a full-screen "mission chapter" that reveals
 * sequentially as the camera scrolls toward its asteroid:
 *
 *   Stage 1 (0–35% of enter window): Mission number + huge title
 *   Stage 2 (35–65%):               Description + category pills
 *   Stage 3 (65–100%):              Glass info panel materialises
 *   ACTIVE:                         Everything at full opacity
 *   EXIT:                           Panel absorbed by black hole singularity
 *   SCROLL BACK:                    Card erupts back out of singularity
 *
 * The black hole absorption / eruption system replaces the old shatter effect.
 */
export default function AsteroidCard() {
  const containerRef   = useRef(null);
  const cardElemsRef   = useRef([]);   // .mission-chapter per achievement
  const panelElemsRef  = useRef([]);   // .mission-panel per achievement (absorption target)
  const rafRef         = useRef(null);

  // Absorption guards
  const shatteredRef        = useRef(new Set());
  const hasBeenActiveRef    = useRef(new Set());

  // Mouse parallax for panel
  const mouseRef = useRef({ x: 0, y: 0 });

  // ── Black hole absorption system refs ──────────────────────────────────────
  const singularityRef     = useRef(null);     // the dark singularity dot
  const accretionRingRef   = useRef(null);     // the bright ring flash
  const rippleRingsRef     = useRef([]);       // 3 spacetime echo rings
  const absorbTimelineRef  = useRef(null);     // current gsap timeline
  const absorbCenterRef    = useRef({ x: 0, y: 0 }); // stored center for eruption
  const shatterStateRef    = useRef("idle");   // 'idle'|'absorbing'|'erupting'
  const shatterProgressRef = useRef(0);        // 0=visible, 1=absorbed
  const shatterCardIdxRef  = useRef(-1);

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [techFilter, setTechFilter] = useState('All');
  const [legacyFilter, setLegacyFilter] = useState('🏀 Basketball');

  // GSAP animations for tech-certs filtering
  useEffect(() => {
    const cards = document.querySelectorAll('.tech-card-wrapper');
    cards.forEach(card => {
      const match = techFilter === 'All' || card.dataset.category === techFilter;
      if (match) {
        card.style.display = 'block';
        gsap.to(card, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.to(card, { 
          opacity: 0, 
          scale: 0.95, 
          duration: 0.3, 
          ease: 'power2.in',
          onComplete: () => { if(card.style) card.style.display = 'none'; } 
        });
      }
    });
  }, [techFilter]);

  // GSAP animations for legacy filtering
  useEffect(() => {
    const cards = document.querySelectorAll('.legacy-card-wrapper');
    cards.forEach(card => {
      const match = card.dataset.category === legacyFilter;
      if (match) {
        card.style.display = 'block';
        gsap.to(card, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.to(card, { 
          opacity: 0, 
          scale: 0.95, 
          duration: 0.3, 
          ease: 'power2.in',
          onComplete: () => { if(card.style) card.style.display = 'none'; } 
        });
      }
    });
  }, [legacyFilter]);

  // ── Create black hole elements once on mount ───────────────────────────────
  useEffect(() => {
    // Singularity dot — the dark center of the black hole
    const singularity = document.createElement("div");
    Object.assign(singularity.style, {
      position: "fixed",
      width: "18px",
      height: "18px",
      background: "#000000",
      border: "1.5px solid rgba(255,255,255,0.6)",
      borderRadius: "50%",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "10001",
      willChange: "transform, opacity",
    });
    document.body.appendChild(singularity);
    singularityRef.current = singularity;

    // Accretion ring — the bright flash before collapse
    const accretionRing = document.createElement("div");
    Object.assign(accretionRing.style, {
      position: "fixed",
      width: "120px",
      height: "120px",
      borderRadius: "50%",
      background: "transparent",
      border: "2px solid transparent",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "10000",
      willChange: "transform, opacity",
    });
    document.body.appendChild(accretionRing);
    accretionRingRef.current = accretionRing;

    // 3 ripple rings for spacetime echo aftermath
    const rings = Array.from({ length: 3 }, () => {
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        position: "fixed",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "transparent",
        border: "1px solid rgba(139,92,246,0.6)",
        opacity: "0",
        pointerEvents: "none",
        zIndex: "9999",
        willChange: "transform, opacity",
      });
      document.body.appendChild(ring);
      return ring;
    });
    rippleRingsRef.current = rings;

    return () => {
      singularity.remove();
      accretionRing.remove();
      rings.forEach((r) => r.remove());
    };
  }, []);

  // ── Mouse parallax listener ────────────────────────────────────────────────
  useEffect(() => {
    const onMouse = (e) => {
      mouseRef.current.x = (e.clientX - window.innerWidth  / 2) / window.innerWidth;
      mouseRef.current.y = (e.clientY - window.innerHeight / 2) / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  // ── Main scroll-driven RAF loop ────────────────────────────────────────────
  useEffect(() => {
    const animate = () => {
      const progress = scrollState.progress;
      let bestActive = -1;

      achievements.forEach((ach, i) => {
        const center = ASTEROID_SCROLL_CENTERS[i];
        if (center === undefined) return;

        const chapterEl = cardElemsRef.current[i];
        const panelEl   = panelElemsRef.current[i];
        if (!chapterEl) return;

        const enterStart = center - MISSION_RADIUS;
        const enterEnd   = center;
        const exitStart  = center;
        const exitEnd    = center + MISSION_RADIUS;

        // Child element handles
        const numberEl = chapterEl.querySelector(".mission-number");
        const titleEl  = chapterEl.querySelector(".mission-title");
        const descGroupEl = chapterEl.querySelector(".mission-desc-group");
        const pillsEl  = chapterEl.querySelector(".mission-pills");

        // ── ENTER PHASE ──────────────────────────────────────────────────────
        if (progress >= enterStart && progress < enterEnd) {
          const t = (progress - enterStart) / (enterEnd - enterStart); // 0→1

          // Trigger eruption if scrolling back through this card
          if (
            shatterCardIdxRef.current === i &&
            shatterProgressRef.current > 0 &&
            shatterStateRef.current !== "erupting"
          ) {
            triggerErupt(chapterEl, panelEl, i);
          }

          const isErupting =
            shatterStateRef.current === "erupting" &&
            shatterCardIdxRef.current === i;

          if (isErupting) {
            // Keep chapter visible during eruption — gsap is driving the panel
            chapterEl.style.opacity = "1";
            if (numberEl) numberEl.style.opacity = "0";
            if (titleEl) titleEl.style.opacity = "0";
            if (descGroupEl) descGroupEl.style.opacity = "0";
            if (pillsEl) pillsEl.style.opacity = "0";
          } else if (shatteredRef.current.has(i)) {
            chapterEl.style.opacity = "0";
          } else {
            // Container visible (opacity driven per-child, not per-container)
            chapterEl.style.opacity = "1";

            // Stage 1: Mission number + title (0 → 0.35)
            const s1 = Math.max(0, Math.min(1, t / 0.35));
            if (numberEl) {
              numberEl.style.opacity   = s1 * 0.5;
              numberEl.style.transform = `translateY(${(1 - s1) * 40}px)`;
            }
            if (titleEl) {
              titleEl.style.opacity   = s1;
              titleEl.style.transform = `translateY(${(1 - s1) * 70}px)`;
            }

            // Stage 2: Description + pills (0.35 → 0.65)
            const s2 = Math.max(0, Math.min(1, (t - 0.35) / 0.30));
            if (descGroupEl) {
              descGroupEl.style.opacity   = s2;
              descGroupEl.style.transform = `translateY(${(1 - s2) * 30}px)`;
            }
            if (pillsEl) {
              pillsEl.style.opacity   = s2;
              pillsEl.style.transform = `translateY(${(1 - s2) * 20}px)`;
            }

            // Stage 3: Glass panel (0.65 → 1.0)
            const s3 = Math.max(0, Math.min(1, (t - 0.65) / 0.35));
            if (panelEl) {
              const mx = mouseRef.current.x * 10 * s3;
              const my = mouseRef.current.y * 10 * s3;
              panelEl.style.opacity        = s3;
              panelEl.style.transform      = `scale(${0.94 + s3 * 0.06}) translate(${mx}px, ${my}px)`;
              panelEl.style.pointerEvents  = s3 > 0.5 ? "auto" : "none";
            }
          }

          if (shatterStateRef.current === "idle" && shatterCardIdxRef.current !== i) {
            shatteredRef.current.delete(i);
          }

          bestActive = i;

        // ── ACTIVE + EXIT PHASE ───────────────────────────────────────────────
        } else if (progress >= exitStart && progress < exitEnd) {
          const t = (progress - exitStart) / (exitEnd - exitStart); // 0→1

          if (t <= 0) {
            // Fully active — mark and hold all elements at 1
            hasBeenActiveRef.current.add(i);
            chapterEl.style.opacity = "1";
            if (numberEl) { numberEl.style.opacity = "0.5";  numberEl.style.transform = "translateY(0px)"; }
            if (titleEl)  { titleEl.style.opacity  = "1";    titleEl.style.transform  = "translateY(0px)"; }
            if (descGroupEl){ descGroupEl.style.opacity = "1"; descGroupEl.style.transform = "translateY(0px)"; }
            if (pillsEl)  { pillsEl.style.opacity  = "1";    pillsEl.style.transform  = "translateY(0px)"; }
            if (panelEl)  {
              const mx = mouseRef.current.x * 10;
              const my = mouseRef.current.y * 10;
              panelEl.style.opacity       = "1";
              panelEl.style.transform     = `scale(1) translate(${mx}px, ${my}px)`;
              panelEl.style.pointerEvents = "auto";
            }
          } else {
            // Exiting
            if (shatteredRef.current.has(i)) {
              // During absorption: keep chapter visible so gsap can animate the panel
              if (shatterStateRef.current === "absorbing" && shatterCardIdxRef.current === i) {
                chapterEl.style.opacity = "1";
                if (numberEl) numberEl.style.opacity = "0";
                if (titleEl) titleEl.style.opacity = "0";
                if (descGroupEl) descGroupEl.style.opacity = "0";
                if (pillsEl) pillsEl.style.opacity = "0";
              } else {
                chapterEl.style.opacity     = "0";
              }
              if (panelEl) panelEl.style.pointerEvents = "none";
            } else {
              chapterEl.style.opacity = "1";

              // Title + number drift upward elegantly
              const titleFade = Math.max(0, 1 - t * 2.2);
              const titleDrift = t * 50;
              if (numberEl) { numberEl.style.opacity = Math.max(0, 0.5 - t * 1.5);  numberEl.style.transform = `translateY(${-titleDrift * 0.6}px)`; }
              if (titleEl)  { titleEl.style.opacity  = titleFade;  titleEl.style.transform  = `translateY(${-titleDrift}px)`; }
              if (descGroupEl){ descGroupEl.style.opacity = Math.max(0, 1 - t * 3); descGroupEl.style.transform = `translateY(${-t * 30}px)`; }
              if (pillsEl)  { pillsEl.style.opacity  = Math.max(0, 1 - t * 4);     pillsEl.style.transform  = `translateY(${-t * 20}px)`; }
              if (panelEl)  {
                const panelFade = Math.max(0, 1 - t * 2);
                panelEl.style.opacity       = panelFade;
                panelEl.style.transform     = `scale(${1 - t * 0.05}) translate(0px, ${t * -20}px)`;
                panelEl.style.pointerEvents = panelFade > 0.5 ? "auto" : "none";
              }
            }

            // Absorption fires once per exit pass, ONLY if card was fully active
            if (t > 0 && t < 0.12 && !shatteredRef.current.has(i) && hasBeenActiveRef.current.has(i)) {
              shatteredRef.current.add(i);
              // Target the panel element for black hole absorption
              const target = panelEl || chapterEl;
              triggerAbsorb(target, i);
            }
          }

          bestActive = i;

        // ── HIDDEN ────────────────────────────────────────────────────────────
        } else {
          const isAbsorbDriven =
            shatterCardIdxRef.current === i &&
            shatterStateRef.current !== "idle";

          if (!isAbsorbDriven) {
            chapterEl.style.opacity = "0";
            if (numberEl) { numberEl.style.opacity = "0";   numberEl.style.transform = "translateY(40px)"; }
            if (titleEl)  { titleEl.style.opacity  = "0";   titleEl.style.transform  = "translateY(70px)"; }
            if (descGroupEl){ descGroupEl.style.opacity = "0"; descGroupEl.style.transform = "translateY(30px)"; }
            if (pillsEl)  { pillsEl.style.opacity  = "0";   pillsEl.style.transform  = "translateY(20px)"; }
            if (panelEl)  { panelEl.style.opacity  = "0";   panelEl.style.transform  = "scale(0.94)"; panelEl.style.pointerEvents = "none"; }
          }

          hasBeenActiveRef.current.delete(i);
          shatteredRef.current.delete(i);

          if (
            progress < enterStart &&
            shatterCardIdxRef.current === i &&
            shatterStateRef.current === "idle" &&
            shatterProgressRef.current > 0
          ) {
            shatterProgressRef.current = 0;
            shatterCardIdxRef.current  = -1;
          }
        }
      });

      setCurrentIndex(bestActive);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Trigger black hole absorption ──────────────────────────────────────────
  function triggerAbsorb(targetEl, idx) {
    if (absorbTimelineRef.current) absorbTimelineRef.current.kill();

    const rect = targetEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const accentColor = CARD_COLORS[idx] || "#8b5cf6";

    // Store center for eruption reverse
    absorbCenterRef.current = { x: cx, y: cy };

    const singularity   = singularityRef.current;
    const accretionRing = accretionRingRef.current;
    const ripples       = rippleRingsRef.current;

    // Position singularity at card center (offset by half size for centering)
    singularity.style.left = (cx - 9) + "px";
    singularity.style.top  = (cy - 9) + "px";
    singularity.style.boxShadow = `
      0 0 0 3px rgba(255,255,255,0.15),
      0 0 20px 6px ${hexToRgba(accentColor, 0.4)},
      0 0 60px 20px rgba(0,0,0,0.8)
    `;

    // Position accretion ring at card center
    accretionRing.style.left = (cx - 60) + "px";
    accretionRing.style.top  = (cy - 60) + "px";
    accretionRing.style.boxShadow = `
      0 0 0 1px rgba(255,180,84,0.9),
      0 0 0 8px rgba(255,120,30,0.4),
      0 0 0 20px rgba(255,60,0,0.15),
      0 0 40px 10px ${hexToRgba(accentColor, 0.3)}
    `;

    // Position ripple rings at card center
    ripples.forEach((ring) => {
      ring.style.left = (cx - 10) + "px";
      ring.style.top  = (cy - 10) + "px";
      ring.style.borderColor = hexToRgba(accentColor, 0.6);
    });

    // Set state
    shatterCardIdxRef.current  = idx;
    shatterStateRef.current    = "absorbing";
    shatterProgressRef.current = 1;

    // Build gsap timeline for all 5 phases
    const tl = gsap.timeline({
      onComplete: () => {
        shatterStateRef.current = "idle";
        // Hide chapter after absorption completes
        const chapterEl = cardElemsRef.current[idx];
        if (chapterEl) chapterEl.style.opacity = "0";
        // Reset all effect elements
        gsap.set(singularity, { scale: 0, opacity: 0 });
        gsap.set(accretionRing, { scale: 0.3, opacity: 0 });
        ripples.forEach((r) => gsap.set(r, { scale: 0.1, opacity: 0 }));
        // Clear gsap-applied filter/borderRadius on target
        gsap.set(targetEl, { clearProps: "filter,borderRadius" });
      },
    });

    // PHASE 1 — SINGULARITY APPEARS (0ms → 200ms)
    tl.fromTo(singularity,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.2, ease: "power2.out" },
      0
    );

    // PHASE 2 — GRAVITATIONAL DISTORTION (200ms → 800ms)
    tl.to(targetEl, {
      scale: 0.85,
      filter: "blur(0px)",
      duration: 0.6,
      ease: "power1.in",
    }, 0.2);

    tl.to(targetEl, {
      borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
      duration: 0.6,
      ease: "power2.in",
    }, 0.2);

    tl.to(singularity, {
      scale: 3,
      duration: 0.6,
      ease: "power1.in",
    }, 0.2);

    // PHASE 3 — ACCRETION DISK FLASH (800ms → 1000ms)
    tl.fromTo(accretionRing,
      { scale: 0.3, opacity: 0 },
      {
        scale: 1.2, opacity: 1,
        duration: 0.15, ease: "power3.out",
        onComplete: () => {
          gsap.to(accretionRing, {
            scale: 2.5, opacity: 0,
            duration: 0.2, ease: "power2.in",
          });
        },
      },
      0.8
    );

    // PHASE 4 — COLLAPSE (1000ms → 1400ms)
    tl.to(targetEl, {
      scale: 0,
      opacity: 0,
      filter: "blur(8px)",
      duration: 0.4,
      ease: "power4.in",
      transformOrigin: "center center",
    }, 1.0);

    tl.to(singularity, {
      scale: 0,
      opacity: 0,
      duration: 0.3,
      ease: "power3.in",
    }, 1.1);

    // PHASE 5 — AFTERMATH RIPPLES (1400ms → ~2600ms)
    ripples.forEach((ring, index) => {
      tl.fromTo(ring,
        { scale: 0.1, opacity: 0.8 },
        { scale: 8, opacity: 0, duration: 1.2, ease: "power1.out" },
        1.4 + index * 0.15
      );
    });

    absorbTimelineRef.current = tl;
  }

  // ── Trigger eruption (reverse — card bursts back from singularity) ─────────
  function triggerErupt(chapterEl, panelEl, idx) {
    if (absorbTimelineRef.current) absorbTimelineRef.current.kill();

    const targetEl    = panelEl || chapterEl;
    const accentColor = CARD_COLORS[idx] || "#8b5cf6";
    const cx = absorbCenterRef.current.x;
    const cy = absorbCenterRef.current.y;

    const singularity   = singularityRef.current;
    const accretionRing = accretionRingRef.current;

    // Position elements at stored center
    singularity.style.left = (cx - 9) + "px";
    singularity.style.top  = (cy - 9) + "px";
    singularity.style.boxShadow = `
      0 0 0 3px rgba(255,255,255,0.15),
      0 0 20px 6px ${hexToRgba(accentColor, 0.4)},
      0 0 60px 20px rgba(0,0,0,0.8)
    `;

    accretionRing.style.left = (cx - 60) + "px";
    accretionRing.style.top  = (cy - 60) + "px";
    accretionRing.style.boxShadow = `
      0 0 0 1px rgba(255,180,84,0.9),
      0 0 0 8px rgba(255,120,30,0.4),
      0 0 0 20px rgba(255,60,0,0.15),
      0 0 40px 10px ${hexToRgba(accentColor, 0.3)}
    `;

    shatterStateRef.current = "erupting";
    // Make chapter visible so the erupting panel is rendered
    chapterEl.style.opacity = "1";

    const tl = gsap.timeline({
      onComplete: () => {
        // Clear all gsap inline styles so scroll loop can take over cleanly
        gsap.set(targetEl, { clearProps: "all" });
        // Immediately set panel to visible state to prevent flash
        targetEl.style.opacity       = "1";
        targetEl.style.transform     = "scale(1)";
        targetEl.style.pointerEvents = "auto";

        // Restore chapter
        chapterEl.style.opacity = "1";

        // Reset effect elements
        gsap.set(singularity, { scale: 0, opacity: 0 });
        gsap.set(accretionRing, { scale: 0.3, opacity: 0 });

        // Reset state
        shatteredRef.current.delete(idx);
        shatterProgressRef.current = 0;
        shatterStateRef.current    = "idle";
        shatterCardIdxRef.current  = -1;
      },
    });

    // 1. Singularity appears briefly
    tl.fromTo(singularity,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.15, ease: "power2.out" },
      0
    );

    // 2. Accretion ring flash (faster than absorption)
    tl.fromTo(accretionRing,
      { scale: 0.3, opacity: 0 },
      {
        scale: 1.2, opacity: 1,
        duration: 0.1, ease: "power3.out",
        onComplete: () => {
          gsap.to(accretionRing, {
            scale: 2.5, opacity: 0,
            duration: 0.15, ease: "power2.in",
          });
        },
      },
      0.05
    );

    // 3. Card erupts outward from center
    tl.fromTo(targetEl,
      { scale: 0, opacity: 0, filter: "blur(12px)", borderRadius: "50%" },
      {
        scale: 1, opacity: 1,
        filter: "blur(0px)", borderRadius: "20px",
        duration: 0.6, ease: "back.out(1.8)",
      },
      0.15
    );

    // 4. Singularity implodes
    tl.to(singularity,
      { scale: 0, opacity: 0, duration: 0.2, ease: "power3.in" },
      0.25
    );

    absorbTimelineRef.current = tl;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="asteroid-card-overlay" ref={containerRef}>
      {achievements.map((ach, i) => {
        return (
          <div
            key={ach.id}
            className="mission-chapter"
            ref={(el) => (cardElemsRef.current[i] = el)}
            style={{
              "--accent-color": CARD_COLORS[i] || ach.color,
              opacity: 0,
            }}
          >
          {/* ── UNIFIED CONTENT STACK ── */}
          <div className="mission-content">
            <div className="mission-number">
              MISSION {String(i + 1).padStart(2, "0")}
            </div>

            <h2 
              className="mission-title"
              data-long-title={(ach.title.light.length + ach.title.heavy.length) >= 13 ? "true" : "false"}
            >
              <span className="title-light">{ach.title.light}</span>
              <span className="title-heavy">{ach.title.heavy}</span>
            </h2>

            <div className="mission-desc-group">
              <p className="mission-desc">{ach.summary}</p>

              {ach.objective && (
                <div className="mission-objective">
                  <span className="objective-label">OBJECTIVE</span>
                  <p className="objective-text">{ach.objective}</p>
                </div>
              )}

              {ach.highlight && (
                <div className="mission-highlight">
                  <span className="highlight-label">KEY HIGHLIGHT</span>
                  <p className="highlight-text">→ {ach.highlight}</p>
                </div>
              )}
            </div>

            <div className="mission-pills">
              <span className="mission-pill">{ach.category}</span>
              {ach.details?.status && (
                <span className="mission-pill mission-pill--status">
                  {ach.details.status}
                </span>
              )}
            </div>

            <div
              className="mission-panel"
              ref={(el) => (panelElemsRef.current[i] = el)}
            >
              <hr className="mission-hr" />

              {ach.id !== 'tech-certs' && ach.id !== 'legacy' && ach.details && (
                <div className="mission-data">
                  {Object.entries(ach.details).map(([key, val]) => (
                    <div className="data-row" key={key}>
                      <span className="data-label">{key.toUpperCase()}</span>
                      <span className={`data-value ${key === 'status' ? 'data-value--status' : ''}`}>
                        {key === 'status' && <span className="data-status-dot"></span>}
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {ach.id !== 'tech-certs' && ach.id !== 'legacy' && ach.links && ach.links.live && (
                <a
                  href={ach.links.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mission-link-raw"
                >
                  → {ach.links.live.replace(/^https?:\/\//, '')}
                </a>
              )}

              {ach.id === 'tech-certs' && Array.isArray(ach.certs) && (
                <div className="custom-mission-content">
                  <div className="filter-pills-row">
                    {['All', 'Java', 'Spring Boot', 'DSA', 'AWS', 'AI/ML', 'Web'].map((f) => (
                      <button 
                        key={f} 
                        className={`filter-pill tech-filter ${techFilter === f ? 'active' : ''}`}
                        onClick={(e) => {
                          setTechFilter(f);
                          gsap.fromTo(e.currentTarget, { scale: 1 }, { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1 });
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="custom-grid">
                    {(ach.certs || []).map((cert, idx) => {
                      if (!cert) return null;
                      return (
                        <div
                          key={idx}
                          className="tech-card-wrapper custom-card tech-card"
                          data-category={cert.domain ?? ''}
                        >
                          <div className="card-top-pill">{(cert.domain ?? '').toUpperCase()}</div>
                          <div className="card-middle-title">{cert.name ?? ''}</div>
                          <div className="card-bottom-row">
                            <span className="card-issuer">{cert.issuer ?? ''}</span>
                            <span className="card-year">{cert.year ?? ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {ach.id === 'legacy' && Array.isArray(ach.legacyItems) && (
                <div className="custom-mission-content">
                  <div className="filter-pills-row">
                    {['🏀 Basketball', '🏃 Athletics', '✍️ Writing', '👑 Leadership'].map((f) => (
                      <button 
                        key={f} 
                        className={`filter-pill legacy-filter ${legacyFilter === f ? 'active' : ''}`}
                        onClick={(e) => {
                          setLegacyFilter(f);
                          gsap.fromTo(e.currentTarget, { scale: 1 }, { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1 });
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="legacy-stats-row">
                    <div className="legacy-stat-col">
                      <div className="ls-val">5+</div>
                      <div className="ls-lbl">YEARS<br/>COMPETING</div>
                    </div>
                    <div className="legacy-stat-col">
                      <div className="ls-val">12+</div>
                      <div className="ls-lbl">CERTIFICATES</div>
                    </div>
                    <div className="legacy-stat-col">
                      <div className="ls-val">4</div>
                      <div className="ls-lbl">STATE<br/>EVENTS</div>
                    </div>
                    <div className="legacy-stat-col">
                      <div className="ls-val">2+</div>
                      <div className="ls-lbl">LEADERSHIP<br/>ROLES</div>
                    </div>
                  </div>
                  <div className="custom-grid">
                    {(ach.legacyItems || []).map((item, idx) => {
                      if (!item) return null;
                      return (
                        <div
                          key={idx}
                          className="legacy-card-wrapper custom-card legacy-card"
                          data-category={item.category ?? ''}
                        >
                          <div className="card-top-pill">{(item.level ?? '').toUpperCase()}</div>
                          <div className="card-middle-title">{item.name ?? ''}</div>
                          <div className="card-bottom-row">
                            <span className="card-issuer">{item.event ?? ''}</span>
                            <span className="card-year">{item.year ?? ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
