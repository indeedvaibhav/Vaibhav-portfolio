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

/**
 * 12 polygon clip-paths that tile together to cover the full element.
 * All percentages so they scale with any element size.
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
 * Cinematic, narrative project showcase.
 *
 * Each project is a full-screen "mission chapter" that reveals
 * sequentially as the camera scrolls toward its asteroid:
 *
 *   Stage 1 (0–35% of enter window): Mission number + huge title
 *   Stage 2 (35–65%):               Description + category pills
 *   Stage 3 (65–100%):              Glass info panel materialises
 *   ACTIVE:                         Everything at full opacity
 *   EXIT:                           Panel shatters; title drifts away
 *   SCROLL BACK:                    Fragments reassemble; card restores
 *
 * The shatter / reassemble fragment physics engine is preserved exactly.
 */
export default function AsteroidCard() {
  const containerRef   = useRef(null);
  const cardElemsRef   = useRef([]);   // .mission-chapter per achievement
  const panelElemsRef  = useRef([]);   // .mission-panel per achievement (shatter target)
  const rafRef         = useRef(null);

  // Shatter guards
  const shatteredRef        = useRef(new Set());
  const hasBeenActiveRef    = useRef(new Set());

  // Mouse parallax for panel
  const mouseRef = useRef({ x: 0, y: 0 });

  // ── Fragment system refs ────────────────────────────────────────────────────
  const fragmentsRef                   = useRef([]);
  const shatterStateRef                = useRef("idle");   // 'idle'|'shattering'|'reassembling'
  const shatterProgressRef             = useRef(0);        // 0=assembled 1=shattered
  const shatterProgressAtReassembleRef = useRef(1);
  const shatterStartTimeRef            = useRef(0);
  const reassembleStartTimeRef         = useRef(0);
  const shatterCardIdxRef              = useRef(-1);
  const shatterRectRef                 = useRef(null);     // rect of the panel element

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

  // ── Create 12 fragment divs once on mount ──────────────────────────────────
  useEffect(() => {
    const frags = FRAGMENT_POLYGONS.map((poly) => {
      const el = document.createElement("div");
      el.style.position        = "fixed";
      el.style.background      = "rgba(5, 6, 10, 0.80)";
      el.style.border          = "1px solid rgba(238, 241, 247, 0.14)";
      el.style.backdropFilter  = "blur(16px)";
      el.style.webkitBackdropFilter = "blur(16px)";
      el.style.clipPath        = poly;
      el.style.opacity         = "0";
      el.style.pointerEvents   = "none";
      el.style.zIndex          = "9999";
      el.style.willChange      = "transform, opacity";
      document.body.appendChild(el);
      return {
        el,
        vx:       -280 + Math.random() * 560,
        vy:       -380 + Math.random() * 320,
        rotSpeed: -160 + Math.random() * 320,
      };
    });
    fragmentsRef.current = frags;
    return () => frags.forEach((f) => f.el.remove());
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

          // Trigger reassembly if scrolling back through this card
          if (
            shatterCardIdxRef.current === i &&
            shatterProgressRef.current > 0 &&
            shatterStateRef.current !== "reassembling"
          ) {
            triggerReassemble(chapterEl, panelEl, i);
          }

          const isReassembling =
            shatterStateRef.current === "reassembling" &&
            shatterCardIdxRef.current === i;

          // Container visible (opacity driven per-child, not per-container)
          chapterEl.style.opacity = isReassembling || shatteredRef.current.has(i)
            ? "0"
            : "1";

          if (!isReassembling && !shatteredRef.current.has(i)) {
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
            // Exiting — hide chapter if shattered
            if (shatteredRef.current.has(i)) {
              chapterEl.style.opacity     = "0";
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

            // Shatter fires once per exit pass, ONLY if card was fully active
            if (t > 0 && t < 0.12 && !shatteredRef.current.has(i) && hasBeenActiveRef.current.has(i)) {
              shatteredRef.current.add(i);
              // Target the panel element for a focused glass shatter
              const target = panelEl || chapterEl;
              triggerShatter(target, i);
            }
          }

          bestActive = i;

        // ── HIDDEN ────────────────────────────────────────────────────────────
        } else {
          const isShatterDriven =
            shatterCardIdxRef.current === i &&
            shatterStateRef.current !== "idle";

          if (!isShatterDriven) {
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

      driveFragmentAnimation();
      setCurrentIndex(bestActive);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Trigger shatter ────────────────────────────────────────────────────────
  function triggerShatter(targetEl, idx) {
    const rect = targetEl.getBoundingClientRect();
    shatterRectRef.current = rect;

    fragmentsRef.current.forEach((frag) => {
      frag.el.style.left      = rect.left   + "px";
      frag.el.style.top       = rect.top    + "px";
      frag.el.style.width     = rect.width  + "px";
      frag.el.style.height    = rect.height + "px";
      frag.el.style.transform = "translate(0px, 0px) rotate(0deg)";
      frag.el.style.opacity   = "1";
    });

    shatterCardIdxRef.current   = idx;
    shatterStateRef.current     = "shattering";
    shatterProgressRef.current  = 0;
    shatterStartTimeRef.current = Date.now();

    flashWhite(rect);
  }

  // ── Trigger reassemble ────────────────────────────────────────────────────
  function triggerReassemble(chapterEl, panelEl, idx) {
    const targetEl = panelEl || chapterEl;
    const rect = targetEl.getBoundingClientRect();

    shatterProgressAtReassembleRef.current = Math.max(shatterProgressRef.current, 0.01);

    fragmentsRef.current.forEach((frag) => {
      frag.el.style.left   = rect.left   + "px";
      frag.el.style.top    = rect.top    + "px";
      frag.el.style.width  = rect.width  + "px";
      frag.el.style.height = rect.height + "px";
      const tEff = shatterProgressAtReassembleRef.current * 1.2;
      const x    = frag.vx * tEff;
      const y    = frag.vy * tEff + 0.5 * 420 * tEff * tEff;
      const rot  = frag.rotSpeed * tEff;
      frag.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
      frag.el.style.opacity   = String(shatterProgressAtReassembleRef.current);
    });

    chapterEl.style.opacity = "0";
    shatterStateRef.current        = "reassembling";
    reassembleStartTimeRef.current = Date.now();
  }

  // ── Per-frame fragment physics ─────────────────────────────────────────────
  function driveFragmentAnimation() {
    const state = shatterStateRef.current;
    if (state === "idle") return;

    const frags = fragmentsRef.current;

    if (state === "shattering") {
      const t        = (Date.now() - shatterStartTimeRef.current) / 1000;
      const progress = Math.min(t / 3.5, 1);
      shatterProgressRef.current = progress;

      frags.forEach((frag) => {
        const x   = frag.vx * t;
        const y   = frag.vy * t + 0.5 * 520 * t * t;
        const rot = frag.rotSpeed * t;
        const opacity = progress < 0.6 ? 1 : 1 - ((progress - 0.6) / 0.4);
        frag.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
        frag.el.style.opacity   = String(opacity);
      });

      if (progress >= 1) {
        frags.forEach((f) => (f.el.style.opacity = "0"));
        shatterStateRef.current = "idle";
      }

    } else if (state === "reassembling") {
      const elapsed  = (Date.now() - reassembleStartTimeRef.current) / 1000;
      const progress = Math.min(elapsed / 1.0, 1);
      const reverseProgress = shatterProgressAtReassembleRef.current * (1 - progress);

      frags.forEach((frag) => {
        const tEff = reverseProgress * 3.5;
        const x    = frag.vx * tEff;
        const y    = frag.vy * tEff + 0.5 * 520 * tEff * tEff;
        const rot  = frag.rotSpeed * tEff;
        frag.el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
        frag.el.style.opacity   = String(reverseProgress);
      });

      if (progress >= 1) {
        frags.forEach((f) => {
          f.el.style.opacity   = "0";
          f.el.style.transform = "translate(0px, 0px) rotate(0deg)";
        });

        // Restore the chapter element
        const chapterEl = cardElemsRef.current[shatterCardIdxRef.current];
        if (chapterEl) {
          chapterEl.style.opacity = "1";
        }

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
      left: ${rect.left}px; top: ${rect.top}px;
      width: ${rect.width}px; height: ${rect.height}px;
      background: rgba(255,255,255,0.85);
      z-index: 10000;
      opacity: 0;
      pointer-events: none;
      border-radius: 16px;
    `;
    document.body.appendChild(flash);
    const start = Date.now();
    const step = () => {
      const p = (Date.now() - start) / 160;
      if (p >= 1) { flash.remove(); return; }
      flash.style.opacity = p < 0.5
        ? String(p * 2 * 0.6)
        : String((1 - (p - 0.5) * 2) * 0.6);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
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
