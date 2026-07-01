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
  const shatteredRef = useRef({}); // track per-index shatter to fire once
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
          shatteredRef.current[i] = false;
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
            if (!shatteredRef.current[i] && t > 0 && t < 0.15) {
              shatteredRef.current[i] = true;
              shatterCard(cardEl, CARD_COLORS[i] || ach.color);
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
          if (progress < enterStart) {
            shatteredRef.current[i] = false;
          }
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
  function shatterCard(cardEl, accentColor) {
    const descText = cardEl.querySelector(".card-desc")?.textContent || "";
    const chars = descText.split("").filter((c) => c.trim() !== "");
    if (chars.length === 0) return;

    const particleCount = 10;
    const rect = cardEl.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height * 0.5;

    for (let k = 0; k < particleCount; k++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const particle = document.createElement("div");
      particle.className = "shatter-particle";
      particle.textContent = char;
      particle.style.color = accentColor;
      particle.style.left = originX + "px";
      particle.style.top  = originY + "px";
      document.body.appendChild(particle);

      const speed = 120 + Math.random() * 200; // 120–320
      const angle = Math.random() * Math.PI * 2;
      const vx    = Math.cos(angle) * speed;
      const vy    = Math.sin(angle) * speed - 40; // slight upward bias

      animateParticle(particle, vx, vy, 280, 1.6);
    }
  }

  function animateParticle(particle, vx, vy, gravity, duration) {
    const startTime = Date.now();
    const startX    = parseFloat(particle.style.left);
    const startY    = parseFloat(particle.style.top);

    const step = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > duration) {
        particle.remove();
        return;
      }
      const x       = startX + vx * elapsed;
      const y       = startY + vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      const opacity = Math.max(0, 1 - elapsed / duration);
      particle.style.left    = x + "px";
      particle.style.top     = y + "px";
      particle.style.opacity = opacity;
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
