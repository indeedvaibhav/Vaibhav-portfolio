import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import html2canvas from "html2canvas";
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
 * Scroll-driven achievement card overlay.
 * Reads scrollState.progress directly via RAF — no new ScrollTriggers.
 *
 * Animation sequence per card:
 *   ENTER  → scale 0.75→1, rotateX -20→0, desc lines stagger in
 *   ACTIVE → fully visible
 *   EXIT   → scale down, fade, shatter particles
 *   HIDDEN → opacity 0, reset
 */
export default function AsteroidCard() {
  const containerRef = useRef(null);
  const cardElemsRef = useRef([]);
  const rafRef = useRef(null);
  const shatteredRef = useRef(new Set()); // track per-index shatter to fire once
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    const animate = () => {
      const progress = scrollState.progress; // 0 to 1

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

        if (progress >= enterStart && progress < enterEnd) {
          // ── ENTER PHASE ──────────────────────────────────────────
          const t = (progress - enterStart) / (enterEnd - enterStart);

          cardEl.style.opacity     = t;
          cardEl.style.transform   = `scale(${0.75 + t * 0.25}) rotateX(${-20 + t * 20}deg)`;

          // Desc lines: start dropping in at 20% into the enter phase
          const lineWindow = (enterEnd - enterStart) * 0.8;
          const lineStart  = enterStart + (enterEnd - enterStart) * 0.2;
          descLines.forEach((line, idx) => {
            const offset  = idx * 0.04 * (enterEnd - enterStart);
            const lineT   = Math.max(0, Math.min(1, (progress - lineStart - offset) / lineWindow));
            line.style.opacity   = lineT;
            line.style.transform = `translateY(${-20 + lineT * 20}px)`;
          });

          // Reset shatter flag when re-entering
          shatteredRef.current.delete(i);
          bestActive = i;

        } else if (progress >= enterEnd && progress < exitEnd) {
          // ── ACTIVE + EXIT PHASE ───────────────────────────────────
          const t = (progress - exitStart) / (exitEnd - exitStart); // 0→1 during exit

          if (t <= 0) {
            // Fully active
            cardEl.style.opacity   = "1";
            cardEl.style.transform = "scale(1) rotateX(0deg)";
            cardEl.style.translate = "none";
            descLines.forEach((line) => {
              line.style.opacity   = "1";
              line.style.transform = "translateY(0px)";
            });
          } else {
            // Exiting
            cardEl.style.opacity   = 1 - t;
            cardEl.style.transform = `scale(${1 - t * 0.2}) rotateX(0deg)`;
            cardEl.style.translate = `0 ${t * 30}px`;

            descLines.forEach((line, idx) => {
              const revT = Math.max(0, Math.min(1, t + idx * 0.05));
              line.style.opacity   = Math.max(0, 1 - revT);
              line.style.transform = `translateY(${-20 * revT}px)`;
            });

            // Shatter fires once at entry of exit zone
            if (t > 0 && t < 0.15 && !shatteredRef.current.has(i)) {
              shatteredRef.current.add(i);
              shatterCard(cardEl);
            }
          }
          bestActive = i;

        } else {
          // ── HIDDEN ───────────────────────────────────────────────
          cardEl.style.opacity   = "0";
          cardEl.style.transform = "scale(0.75) rotateX(-20deg)";
          cardEl.style.translate = "none";
          descLines.forEach((line) => {
            line.style.opacity   = "0";
            line.style.transform = "translateY(-20px)";
          });
          // Reset shatter flag so it fires again on re-entry from below
          shatteredRef.current.delete(i);
        }
      });

      setCurrentIndex(bestActive);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Manual shatter particle effect (no Physics2DPlugin) ───────────────────
  async function shatterCard(cardEl) {
    try {
      const canvas = await html2canvas(cardEl, { backgroundColor: null });
      const imgData = canvas.toDataURL();
      const rect = cardEl.getBoundingClientRect();

      // Immediately hide original card
      cardEl.style.opacity = "0";

      // White flash effect
      const flash = document.createElement("div");
      flash.style.position = "fixed";
      flash.style.left = rect.left + "px";
      flash.style.top = rect.top + "px";
      flash.style.width = rect.width + "px";
      flash.style.height = rect.height + "px";
      flash.style.backgroundColor = "white";
      flash.style.zIndex = "10000";
      flash.style.opacity = "0";
      flash.style.pointerEvents = "none";
      flash.style.borderRadius = getComputedStyle(cardEl).borderRadius || "0";
      document.body.appendChild(flash);

      const flashStart = Date.now();
      const animateFlash = () => {
        const elapsed = Date.now() - flashStart;
        if (elapsed > 120) {
          flash.remove();
          return;
        }
        const p = elapsed / 120;
        flash.style.opacity = p < 0.5 ? p * 2 * 0.6 : (1 - (p - 0.5) * 2) * 0.6;
        requestAnimationFrame(animateFlash);
      };
      requestAnimationFrame(animateFlash);

      const polygons = [
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
        "polygon(88% 62%, 100% 68%, 100% 100%, 82% 100%)"
      ];

      polygons.forEach((poly) => {
        const frag = document.createElement("img");
        frag.src = imgData;
        frag.style.position = "fixed";
        frag.style.left = rect.left + "px";
        frag.style.top = rect.top + "px";
        frag.style.width = rect.width + "px";
        frag.style.height = rect.height + "px";
        frag.style.clipPath = poly;
        frag.style.zIndex = "9999";
        frag.style.pointerEvents = "none";
        document.body.appendChild(frag);

        const speed = 80 + Math.random() * 140; // 80-220
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const gravity = 350;
        const rotSpeed = -180 + Math.random() * 360;
        const delay = Math.random() * 80; // 0-80ms staggered launch

        setTimeout(() => {
          const startTime = Date.now();
          const duration = 1.2;

          const step = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > duration) {
              frag.remove();
              return;
            }
            
            const x = vx * elapsed;
            const y = vy * elapsed + 0.5 * gravity * elapsed * elapsed;
            const rot = rotSpeed * elapsed;
            const opacity = Math.max(0, 1 - elapsed / duration);
            
            frag.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
            frag.style.opacity = opacity;
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }, delay);
      });
    } catch (e) {
      console.error("Shatter error:", e);
    }
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
          {/* Accent bar */}
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

      {/* Progress indicator */}
      {currentIndex >= 0 && (
        <div className="card-hud-progress">
          <span>{String(currentIndex + 1).padStart(2, "0")}</span>
          {" / "}
          {String(achievements.length).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}
