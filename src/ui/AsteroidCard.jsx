import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ASTEROID_SCROLL_CENTERS, FADE_RADIUS, FOCUS_RADIUS } from "../utils/constants";
import { achievements } from "../data/achievements";
import { scrollState } from "../utils/scrollState";
import "./AsteroidCard.css";

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
 * 12 polygon clip-paths that tile together to cover the full card.
 * All percentages so they scale with any card size.
 */
const FRAGMENT_POLYGONS = [
  "polygon(0% 0%, 38% 0%, 29% 45%, 0% 32%)",
  "polygon(38% 0%, 71% 0%, 58% 38%, 29% 45%)",
  "polygon(71% 0%, 100% 0%, 100% 28%, 58% 38%)",
  "polygon(100% 0%, 100% 28%, 72% 52%, 58% 38%)",
  "polygon(0% 32%, 29% 45%, 18% 72%, 0% 65%)",
  "polygon(29% 45%, 58% 38%, 62% 68%, 18% 72%)",
  "polygon(58% 38%, 72% 52%, 88% 62%, 62% 68%)",
  "polygon(72% 52%, 100% 28%, 100% 68%, 88% 62%)",
  "polygon(0% 65%, 18% 72%, 12% 100%, 0% 100%)",
  "polygon(18% 72%, 62% 68%, 48% 100%, 12% 100%)",
  "polygon(62% 68%, 88% 62%, 82% 100%, 48% 100%)",
  "polygon(88% 62%, 100% 68%, 100% 100%, 82% 100%)",
];

/**
 * Scroll-driven achievement card overlay.
 * Reads scrollState.progress directly via RAF — no new ScrollTriggers.
 *
 * Animation sequence per card:
 *   ENTER        → scale 0.75→1, rotateX -20→0, desc lines stagger in
 *   ACTIVE       → fully visible
 *   EXIT         → shatter into 12 glass-panel fragments, fly apart with gravity
 *   HIDDEN       → opacity 0, reset
 *
 * Scroll BACK UP → fragments reassemble in reverse and card reappears
 */
export default function AsteroidCard() {
  const containerRef = useRef(null);
  const cardElemsRef = useRef([]);
  const rafRef = useRef(null);
  const shatteredRef = useRef(new Set()); // prevents re-firing during one exit pass
  const hasBeenActiveRef = useRef(new Set()); // ensures shatter only fires if card was fully visible

  // ── Fragment system ──────────────────────────────────────────────────────
  /** @type {{ el: HTMLElement, vx: number, vy: number, rotSpeed: number }[]} */
  const fragmentsRef = useRef([]);
  /** @type {'idle'|'shattering'|'reassembling'} */
  const shatterStateRef = useRef("idle");
  /** 0 = assembled, 1 = fully shattered */
  const shatterProgressRef = useRef(0);
  /** shatterProgressRef value at the moment reassembly was triggered */
  const shatterProgressAtReassembleRef = useRef(1);
  const shatterStartTimeRef = useRef(0);
  const reassembleStartTimeRef = useRef(0);
  /** Index of the card that is currently shattering / reassembling */
  const shatterCardIdxRef = useRef(-1);

  const [currentIndex, setCurrentIndex] = useState(-1);

  // ── Create 12 fragment divs once on mount ─────────────────────────────────
  useEffect(() => {
    const frags = FRAGMENT_POLYGONS.map((poly) => {
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.background = "rgba(5, 6, 10, 0.75)";
      el.style.border = "1px solid rgba(238, 241, 247, 0.12)";
      el.style.backdropFilter = "blur(14px)";
      el.style.webkitBackdropFilter = "blur(14px)";
      el.style.clipPath = poly;
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      el.style.zIndex = "9999";
      el.style.willChange = "transform, opacity";
      document.body.appendChild(el);

      return {
        el,
        // Randomise velocity once; reuse across all shatters
        vx: -300 + Math.random() * 600,         // px/s
        vy: -400 + Math.random() * 350,          // px/s — mostly upward burst
        rotSpeed: -180 + Math.random() * 360,    // deg/s
      };
    });

    fragmentsRef.current = frags;

    return () => {
      frags.forEach((f) => f.el.remove());
    };
  }, []);

  // ── Main scroll-driven RAF loop ────────────────────────────────────────────
  useEffect(() => {
    const animate = () => {
      const progress = scrollState.progress; // 0 → 1
      let bestActive = -1;

      achievements.forEach((ach, i) => {
        const center = ASTEROID_SCROLL_CENTERS[i];
        if (center === undefined) return;

        const cardEl = cardElemsRef.current[i];
        if (!cardEl) return;

        const descLines = cardEl.querySelectorAll(".desc-line");

        const enterStart = center - FADE_RADIUS;
        const enterEnd   = center;
        const exitStart  = center;
        const exitEnd    = center + FADE_RADIUS;

        // ── ENTER PHASE ──────────────────────────────────────────────────────
        if (progress >= enterStart && progress < enterEnd) {
          const t = (progress - enterStart) / (enterEnd - enterStart);

          // Trigger reassembly if this card had been shattered and user scrolled back
          if (
            shatterCardIdxRef.current === i &&
            shatterProgressRef.current > 0 &&
            shatterStateRef.current !== "reassembling"
          ) {
            triggerReassemble(cardEl, i);
          }

          // Keep card hidden while fragments reassemble; restore happens in driveFragmentAnimation
          if (
            shatterStateRef.current === "reassembling" &&
            shatterCardIdxRef.current === i
          ) {
            cardEl.style.opacity = "0";
          } else if (!shatteredRef.current.has(i)) {
            cardEl.style.opacity = t;
            cardEl.style.transform = `scale(${0.75 + t * 0.25}) rotateX(${-20 + t * 20}deg)`;
            cardEl.style.translate = "none";
          }

          // Desc lines stagger in starting at 20% of enter phase
          const lineWindow = (enterEnd - enterStart) * 0.8;
          const lineStart  = enterStart + (enterEnd - enterStart) * 0.2;
          descLines.forEach((line, idx) => {
            const offset = idx * 0.04 * (enterEnd - enterStart);
            const lineT  = Math.max(0, Math.min(1, (progress - lineStart - offset) / lineWindow));
            line.style.opacity   = lineT;
            line.style.transform = `translateY(${-20 + lineT * 20}px)`;
          });

          // Allow re-shattering on next exit pass only once fully reassembled
          if (shatterStateRef.current === "idle" && shatterCardIdxRef.current !== i) {
            shatteredRef.current.delete(i);
          }

          bestActive = i;

        // ── ACTIVE + EXIT PHASE ───────────────────────────────────────────────
        } else if (progress >= enterEnd && progress < exitEnd) {
          const t = (progress - exitStart) / (exitEnd - exitStart); // 0 → 1 during exit

          if (t <= 0) {
            // Fully active
            hasBeenActiveRef.current.add(i);
            cardEl.style.opacity   = "1";
            cardEl.style.transform = "scale(1) rotateX(0deg)";
            cardEl.style.translate = "none";
            descLines.forEach((line) => {
              line.style.opacity   = "1";
              line.style.transform = "translateY(0px)";
            });
          } else {
            // Exiting — keep card hidden once shattered so fragments take over
            if (shatteredRef.current.has(i)) {
              cardEl.style.opacity = "0";
            } else {
              cardEl.style.opacity   = 1 - t;
              cardEl.style.transform = `scale(${1 - t * 0.2}) rotateX(0deg)`;
              cardEl.style.translate = `0 ${t * 30}px`;
            }

            descLines.forEach((line, idx) => {
              const revT = Math.max(0, Math.min(1, t + idx * 0.05));
              line.style.opacity   = Math.max(0, 1 - revT);
              line.style.transform = `translateY(${-20 * revT}px)`;
            });

            // Shatter fires once per exit pass, ONLY if it was previously fully active
            if (t > 0 && t < 0.15 && !shatteredRef.current.has(i) && hasBeenActiveRef.current.has(i)) {
              shatteredRef.current.add(i);
              triggerShatter(cardEl, i);
            }
          }

          bestActive = i;

        // ── HIDDEN ────────────────────────────────────────────────────────────
        } else {
          // Only force hide if not being driven by the fragment system
          const isShatterTarget =
            shatterCardIdxRef.current === i &&
            shatterStateRef.current !== "idle";

          if (!isShatterTarget) {
            cardEl.style.opacity   = "0";
            cardEl.style.transform = "scale(0.75) rotateX(-20deg)";
            cardEl.style.translate = "none";
            descLines.forEach((line) => {
              line.style.opacity   = "0";
              line.style.transform = "translateY(-20px)";
            });
          }
          hasBeenActiveRef.current.delete(i);
          shatteredRef.current.delete(i);

          // If user jumped far above enter zone, clear any stale shatter state for this card
          if (
            progress < enterStart &&
            shatterCardIdxRef.current === i &&
            shatterStateRef.current === "idle" &&
            shatterProgressRef.current > 0
          ) {
            shatterProgressRef.current = 0;
            shatterCardIdxRef.current = -1;
            shatteredRef.current.delete(i);
          }
        }
      });

      // Drive fragment physics in the same RAF tick
      driveFragmentAnimation();

      setCurrentIndex(bestActive);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Trigger shatter ────────────────────────────────────────────────────────
  function triggerShatter(cardEl, idx) {
    const rect = cardEl.getBoundingClientRect();

    // Position all fragments exactly over the card, transform at origin
    fragmentsRef.current.forEach((frag) => {
      frag.el.style.left      = rect.left + "px";
      frag.el.style.top       = rect.top + "px";
      frag.el.style.width     = rect.width + "px";
      frag.el.style.height    = rect.height + "px";
      frag.el.style.transform = "translate(0px, 0px) rotate(0deg)";
      frag.el.style.opacity   = "1";
    });

    // Immediately hide the real card — fragments take over visuals
    cardEl.style.opacity = "0";

    shatterCardIdxRef.current  = idx;
    shatterStateRef.current    = "shattering";
    shatterProgressRef.current = 0;
    shatterStartTimeRef.current = Date.now();

    flashWhite(rect);
  }

  // ── Trigger reassemble ────────────────────────────────────────────────────
  function triggerReassemble(cardEl, idx) {
    const rect = cardEl.getBoundingClientRect();

    // Capture how scattered they are right now so we start from the right position
    shatterProgressAtReassembleRef.current = Math.max(
      shatterProgressRef.current,
      0.01 // ensure at least a tiny scatter so animation runs
    );

    // Re-anchor fragments to current card rect (it's fixed so rect shouldn't change,
    // but refresh for safety)
    fragmentsRef.current.forEach((frag) => {
      frag.el.style.left   = rect.left + "px";
      frag.el.style.top    = rect.top + "px";
      frag.el.style.width  = rect.width + "px";
      frag.el.style.height = rect.height + "px";
      // Immediately place them at their "scattered" starting position
      const tEff = shatterProgressAtReassembleRef.current * 1.2;
      const x    = frag.vx * tEff;
      const y    = frag.vy * tEff + 0.5 * 420 * tEff * tEff;
      const rot  = frag.rotSpeed * tEff;
      frag.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
      frag.el.style.opacity = String(shatterProgressAtReassembleRef.current);
    });

    cardEl.style.opacity = "0";

    shatterStateRef.current = "reassembling";
    reassembleStartTimeRef.current = Date.now();
  }

  // ── Per-frame fragment physics driver ─────────────────────────────────────
  function driveFragmentAnimation() {
    const state = shatterStateRef.current;
    if (state === "idle") return;

    const frags = fragmentsRef.current;

    if (state === "shattering") {
      const t        = (Date.now() - shatterStartTimeRef.current) / 1000;
      const progress = Math.min(t / 3.5, 1);
      shatterProgressRef.current = progress;

      frags.forEach((frag) => {
        const x       = frag.vx * t;
        const y       = frag.vy * t + 0.5 * 520 * t * t;
        const rot     = frag.rotSpeed * t;
        // Hold fully visible for first 60%, then fade over the last 40%
        const opacity = progress < 0.6 ? 1 : 1 - ((progress - 0.6) / 0.4);
        frag.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
        frag.el.style.opacity   = String(opacity);
      });

      if (progress >= 1) {
        frags.forEach((f) => (f.el.style.opacity = "0"));
        shatterStateRef.current = "idle";
        // keep shatterProgressRef=1 and shatterCardIdxRef so reassemble can trigger
      }
    } else if (state === "reassembling") {
      const elapsed  = (Date.now() - reassembleStartTimeRef.current) / 1000;
      const progress = Math.min(elapsed / 1.0, 1); // 0 → 1 over 1.0s
      // reverseProgress: 1 (fully scattered) → 0 (back at origin)
      const reverseProgress = shatterProgressAtReassembleRef.current * (1 - progress);

      frags.forEach((frag) => {
        const tEff = reverseProgress * 3.5; // map back into physics time
        const x    = frag.vx * tEff;
        const y    = frag.vy * tEff + 0.5 * 520 * tEff * tEff;
        const rot  = frag.rotSpeed * tEff;
        frag.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
        frag.el.style.opacity   = String(reverseProgress);
      });

      if (progress >= 1) {
        // Fragments arrived — hide them and restore the real card
        frags.forEach((f) => {
          f.el.style.opacity   = "0";
          f.el.style.transform = "translate(0px, 0px) rotate(0deg)";
        });

        const cardEl = cardElemsRef.current[shatterCardIdxRef.current];
        if (cardEl) {
          cardEl.style.opacity   = "1";
          cardEl.style.transform = "scale(1) rotateX(0deg)";
          cardEl.style.translate = "none";
        }

        // Re-arm for next exit pass
        shatteredRef.current.delete(shatterCardIdxRef.current);
        shatterProgressRef.current = 0;
        shatterStateRef.current    = "idle";
        shatterCardIdxRef.current  = -1;
      }
    }
  }

  // ── White flash overlay ───────────────────────────────────────────────────
  function flashWhite(rect) {
    const flash = document.createElement("div");
    flash.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: white;
      z-index: 10000;
      opacity: 0;
      pointer-events: none;
      border-radius: 12px;
    `;
    document.body.appendChild(flash);

    const start = Date.now();
    const step = () => {
      const p = (Date.now() - start) / 150; // 150ms total
      if (p >= 1) { flash.remove(); return; }
      flash.style.opacity = p < 0.5
        ? String(p * 2 * 0.5)
        : String((1 - (p - 0.5) * 2) * 0.5);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return (
    <div className="asteroid-card-overlay" ref={containerRef}>
      {achievements.map((ach, i) => (
        <div
          key={ach.id}
          className="achievement-card"
          ref={(el) => (cardElemsRef.current[i] = el)}
          style={{ "--accent-color": CARD_COLORS[i] || ach.color }}
        >
          {/* Accent bar at top */}
          <div className="card-bar" />

          {/* Eyebrow */}
          <div className="card-eyebrow">
            Achievement {String(i + 1).padStart(2, "0")}
          </div>

          <h2 className="card-title">{ach.title}</h2>

          <div className="card-category">{ach.category}</div>

          {/* Description — split into animated lines */}
          <div className="card-desc">
            {ach.desc
              ? ach.desc.split("\n").map((line, idx) => (
                  <span key={idx} className="desc-line">
                    {line.trim()}
                  </span>
                ))
              : ach.description.split(". ").slice(0, 3).map((line, idx) => (
                  <span key={idx} className="desc-line">
                    {line.trim().replace(/\.$/, "")}.
                  </span>
                ))}
          </div>

          {/* Tags */}
          {ach.tags && (
            <div className="card-tags">
              {ach.tags.map((tag, idx) => (
                <span key={idx}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
