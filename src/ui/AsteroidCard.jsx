import { useEffect, useRef, useState } from "react";
import { ASTEROID_SCROLL_CENTERS } from "../utils/constants";
import { achievements } from "../data/achievements";
import { scrollState } from "../utils/scrollState";
import { gsap } from "gsap";
import "./AsteroidCard.css";
import "./credentials-gallery.css";

const CARD_COLORS = [
  "#8b5cf6", "#38bdf8", "#4ade80",
  "#fb923c", "#ec4899", "#a78bfa", "#f43f5e",
];

const MISSION_RADIUS = 0.10;

function getRgba(hex, alpha) {
  let c = hex;
  if (!c || !c.startsWith('#')) return `rgba(139,92,246,${alpha})`;
  if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  const r = parseInt(c.slice(1, 3), 16);
  const g = parseInt(c.slice(3, 5), 16);
  const b = parseInt(c.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(139,92,246,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function AsteroidCard() {
  const containerRef = useRef(null);
  const cardElemsRef = useRef([]);
  const panelElemsRef = useRef([]);
  const rafRef = useRef(null);

  const shatteredRef = useRef(new Set());
  const hasBeenActiveRef = useRef(new Set());

  const mouseRef = useRef({ x: 0, y: 0 });

  // ── Black Hole refs ────────────────────────────────────────────────────────
  // effectStateRef: 'idle' | 'absorbing' | 'erupting'
  const effectStateRef = useRef("idle");
  const effectCardIdxRef = useRef(-1);
  const effectTlRef = useRef(null);
  const singularityRef = useRef(null);
  const accretionRingRef = useRef(null);
  const rippleRingsRef = useRef([]);

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [techFilter, setTechFilter] = useState('All');
  const [legacyFilter, setLegacyFilter] = useState('🏀 Basketball');

  // ── Filter animations ──────────────────────────────────────────────────────
  useEffect(() => {
    const cards = document.querySelectorAll('.tech-card-wrapper');
    cards.forEach(card => {
      const match = techFilter === 'All' || card.dataset.category === techFilter;
      if (match) {
        card.style.display = 'block';
        gsap.to(card, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.to(card, {
          opacity: 0, scale: 0.95, duration: 0.3, ease: 'power2.in',
          onComplete: () => { if (card.style) card.style.display = 'none'; }
        });
      }
    });
  }, [techFilter]);

  useEffect(() => {
    const cards = document.querySelectorAll('.legacy-card-wrapper');
    cards.forEach(card => {
      const match = card.dataset.category === legacyFilter;
      if (match) {
        card.style.display = 'block';
        gsap.to(card, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.to(card, {
          opacity: 0, scale: 0.95, duration: 0.3, ease: 'power2.in',
          onComplete: () => { if (card.style) card.style.display = 'none'; }
        });
      }
    });
  }, [legacyFilter]);

  // ── Create black hole DOM elements once ────────────────────────────────────
  useEffect(() => {
    const sing = document.createElement("div");
    Object.assign(sing.style, {
      position: "fixed", width: "18px", height: "18px",
      background: "#000", border: "1.5px solid rgba(255,255,255,0.6)",
      borderRadius: "50%", zIndex: "9999", opacity: "0",
      pointerEvents: "none", transformOrigin: "center center",
    });
    document.body.appendChild(sing);
    singularityRef.current = sing;

    const accRing = document.createElement("div");
    Object.assign(accRing.style, {
      position: "fixed", width: "120px", height: "120px",
      borderRadius: "50%", background: "transparent",
      border: "2px solid transparent", zIndex: "9998",
      opacity: "0", pointerEvents: "none",
      transformOrigin: "center center",
    });
    document.body.appendChild(accRing);
    accretionRingRef.current = accRing;

    const ripples = Array.from({ length: 3 }, () => {
      const r = document.createElement("div");
      Object.assign(r.style, {
        position: "fixed", borderRadius: "50%",
        background: "transparent", pointerEvents: "none",
        zIndex: "9999", opacity: "0",
        transformOrigin: "center center",
      });
      document.body.appendChild(r);
      return r;
    });
    rippleRingsRef.current = ripples;

    return () => {
      sing.remove(); accRing.remove(); ripples.forEach(r => r.remove());
    };
  }, []);

  // ── Mouse parallax ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onMouse = e => {
      mouseRef.current.x = (e.clientX - window.innerWidth / 2) / window.innerWidth;
      mouseRef.current.y = (e.clientY - window.innerHeight / 2) / window.innerHeight;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  // ── triggerAbsorption ──────────────────────────────────────────────────────
  function triggerAbsorption(targetEl, idx) {
    if (!targetEl) return;
    if (effectTlRef.current) effectTlRef.current.kill();

    const rect = targetEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const color = CARD_COLORS[idx] || '#8b5cf6';

    const sing = singularityRef.current;
    const accRing = accretionRingRef.current;
    const ripples = rippleRingsRef.current;

    // position all elements at card centre
    [sing, accRing, ...ripples].forEach(el => {
      el.style.left = cx + "px";
      el.style.top = cy + "px";
    });

    sing.style.boxShadow = `
      0 0 0 3px rgba(255,255,255,0.15),
      0 0 20px 6px ${getRgba(color, 0.5)},
      0 0 60px 20px rgba(0,0,0,0.8)`;
    accRing.style.boxShadow = `
      0 0 0 1px rgba(255,180,84,0.9),
      0 0 0 8px rgba(255,120,30,0.4),
      0 0 0 20px rgba(255,60,0,0.15),
      0 0 40px 10px ${getRgba(color, 0.4)}`;
    ripples.forEach(r => {
      r.style.border = `1px solid ${getRgba(color, 0.6)}`;
    });

    effectCardIdxRef.current = idx;
    effectStateRef.current = "absorbing";

    // Freeze the panel at its current visible state before handing off to GSAP
    gsap.set(targetEl, {
      scale: 1, opacity: 1, filter: "blur(0px)",
      borderRadius: "20px", transformOrigin: "center center",
    });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([sing, accRing, ...ripples], { opacity: 0, scale: 0 });
        effectStateRef.current = "idle";
        // don't reset effectCardIdxRef here — RAF hidden branch does that
      }
    });
    effectTlRef.current = tl;

    // Phase 1 — singularity appears
    tl.fromTo(sing,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.2, ease: "power2.out" }, 0);

    // Phase 2 — card warps inward
    tl.to(targetEl,
      { scale: 0.85, duration: 0.6, ease: "power1.in" }, 0.2);
    tl.to(targetEl,
      { borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", duration: 0.6, ease: "power2.in" }, 0.2);
    tl.to(sing,
      { scale: 3, duration: 0.6, ease: "power1.in" }, 0.2);

    // Phase 3 — accretion disk flash
    tl.fromTo(accRing,
      { scale: 0.3, opacity: 0 },
      { scale: 1.2, opacity: 1, duration: 0.15, ease: "power3.out" }, 0.8);
    tl.to(accRing,
      { scale: 2.5, opacity: 0, duration: 0.2, ease: "power2.in" }, 0.95);

    // Phase 4 — collapse
    tl.to(targetEl,
      { scale: 0, opacity: 0, filter: "blur(8px)", duration: 0.4, ease: "power4.in" }, 1.0);
    tl.to(sing,
      { scale: 0, opacity: 0, duration: 0.3, ease: "power3.in" }, 1.1);

    // Phase 5 — spacetime ripples
    ripples.forEach((ring, i) => {
      tl.fromTo(ring,
        { scale: 0.1, opacity: 0.8, width: "20px", height: "20px" },
        { scale: 8, opacity: 0, duration: 1.2, ease: "power1.out" },
        1.4 + i * 0.15);
    });
  }

  // ── triggerEruption ────────────────────────────────────────────────────────
  function triggerEruption(chapterEl, panelEl, idx) {
    const targetEl = panelEl || chapterEl;
    if (!targetEl) return;
    if (effectTlRef.current) effectTlRef.current.kill();

    const rect = targetEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const color = CARD_COLORS[idx] || '#8b5cf6';

    const sing = singularityRef.current;
    const accRing = accretionRingRef.current;
    const ripples = rippleRingsRef.current;

    [sing, accRing].forEach(el => {
      el.style.left = cx + "px";
      el.style.top = cy + "px";
    });
    sing.style.boxShadow = `
      0 0 0 3px rgba(255,255,255,0.15),
      0 0 20px 6px ${getRgba(color, 0.5)},
      0 0 60px 20px rgba(0,0,0,0.8)`;
    accRing.style.boxShadow = `
      0 0 0 1px rgba(255,180,84,0.9),
      0 0 0 8px rgba(255,120,30,0.4),
      0 0 0 20px rgba(255,60,0,0.15),
      0 0 40px 10px ${getRgba(color, 0.4)}`;
    gsap.set(ripples, { opacity: 0, scale: 0 });

    effectStateRef.current = "erupting";

    const tl = gsap.timeline({
      onComplete: () => {
        effectStateRef.current = "idle";
        effectCardIdxRef.current = -1;
        shatteredRef.current.delete(idx);
        gsap.set(targetEl, { clearProps: "all" });
        gsap.set([sing, accRing], { opacity: 0, scale: 0 });
      }
    });
    effectTlRef.current = tl;

    tl.fromTo(sing,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.15 }, 0);
    tl.fromTo(accRing,
      { scale: 0.3, opacity: 0 },
      { scale: 1.2, opacity: 1, duration: 0.1 }, 0.15);
    tl.to(accRing,
      { scale: 2.5, opacity: 0, duration: 0.1, ease: "power2.in" }, 0.25);
    tl.fromTo(targetEl,
      { scale: 0, opacity: 0, filter: "blur(12px)", borderRadius: "50%" },
      {
        scale: 1, opacity: 1, filter: "blur(0px)", borderRadius: "20px",
        duration: 0.6, ease: "back.out(1.8)"
      }, 0.15);
    tl.to(sing,
      { scale: 0, opacity: 0, duration: 0.2 }, 0.25);
  }

  // ── Main RAF loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const animate = () => {
      const progress = scrollState.progress;
      let bestActive = -1;

      achievements.forEach((ach, i) => {
        const center = ASTEROID_SCROLL_CENTERS[i];
        if (center === undefined) return;

        const chapterEl = cardElemsRef.current[i];
        const panelEl = panelElemsRef.current[i];
        if (!chapterEl) return;

        const enterStart = center - MISSION_RADIUS;
        const enterEnd = center;
        const exitStart = center;
        const exitEnd = center + MISSION_RADIUS;

        const numberEl = chapterEl.querySelector(".mission-number");
        const titleEl = chapterEl.querySelector(".mission-title");
        const descGroupEl = chapterEl.querySelector(".mission-desc-group");
        const pillsEl = chapterEl.querySelector(".mission-pills");

        // Is GSAP currently running an effect on THIS card?
        const effectOwned =
          effectCardIdxRef.current === i &&
          (effectStateRef.current === "absorbing" ||
            effectStateRef.current === "erupting");

        // ── ENTER ─────────────────────────────────────────────────────────
        if (progress >= enterStart && progress < enterEnd) {
          const t = (progress - enterStart) / (enterEnd - enterStart);

          // If we scroll back into a card that was absorbing → erupt
          if (
            effectCardIdxRef.current === i &&
            effectStateRef.current === "absorbing"
          ) {
            triggerEruption(chapterEl, panelEl, i);
          }

          chapterEl.style.opacity = "1";

          if (!effectOwned) {
            const s1 = Math.max(0, Math.min(1, t / 0.35));
            if (numberEl) { numberEl.style.opacity = s1 * 0.5; numberEl.style.transform = `translateY(${(1 - s1) * 40}px)`; }
            if (titleEl) { titleEl.style.opacity = s1; titleEl.style.transform = `translateY(${(1 - s1) * 70}px)`; }

            const s2 = Math.max(0, Math.min(1, (t - 0.35) / 0.30));
            if (descGroupEl) { descGroupEl.style.opacity = s2; descGroupEl.style.transform = `translateY(${(1 - s2) * 30}px)`; }
            if (pillsEl) { pillsEl.style.opacity = s2; pillsEl.style.transform = `translateY(${(1 - s2) * 20}px)`; }

            const s3 = Math.max(0, Math.min(1, (t - 0.65) / 0.35));
            if (panelEl) {
              const mx = mouseRef.current.x * 10 * s3;
              const my = mouseRef.current.y * 10 * s3;
              panelEl.style.opacity = s3;
              panelEl.style.transform = `scale(${0.94 + s3 * 0.06}) translate(${mx}px,${my}px)`;
              panelEl.style.pointerEvents = s3 > 0.5 ? "auto" : "none";
            }
          }

          // Clear shatter state when re-entering (only if effect is done)
          if (effectStateRef.current === "idle" && shatteredRef.current.has(i)) {
            shatteredRef.current.delete(i);
            if (panelEl) gsap.set(panelEl, { clearProps: "all" });
          }

          bestActive = i;

          // ── EXIT ──────────────────────────────────────────────────────────
        } else if (progress >= exitStart && progress < exitEnd) {
          const t = (progress - exitStart) / (exitEnd - exitStart);

          if (t <= 0) {
            // Fully active
            hasBeenActiveRef.current.add(i);
            chapterEl.style.opacity = "1";
            if (!effectOwned) {
              if (numberEl) { numberEl.style.opacity = "0.5"; numberEl.style.transform = "translateY(0)"; }
              if (titleEl) { titleEl.style.opacity = "1"; titleEl.style.transform = "translateY(0)"; }
              if (descGroupEl) { descGroupEl.style.opacity = "1"; descGroupEl.style.transform = "translateY(0)"; }
              if (pillsEl) { pillsEl.style.opacity = "1"; pillsEl.style.transform = "translateY(0)"; }
              if (panelEl) {
                const mx = mouseRef.current.x * 10;
                const my = mouseRef.current.y * 10;
                panelEl.style.opacity = "1";
                panelEl.style.transform = `scale(1) translate(${mx}px,${my}px)`;
                panelEl.style.pointerEvents = "auto";
              }
            }
          } else {
            // ── FIRE ABSORPTION (once, guarded) ──────────────────────────
            if (
              t > 0 && t < 0.12 &&
              !shatteredRef.current.has(i) &&
              hasBeenActiveRef.current.has(i) &&
              effectStateRef.current === "idle"
            ) {
              shatteredRef.current.add(i);
              triggerAbsorption(panelEl || chapterEl, i);
            }

            // While GSAP owns the effect — keep chapter visible, don't touch panelEl
            if (effectOwned) {
              chapterEl.style.opacity = "1";
              // title / desc still drift out naturally
              const titleFade = Math.max(0, 1 - t * 2.2);
              if (numberEl) { numberEl.style.opacity = Math.max(0, 0.5 - t * 1.5); numberEl.style.transform = `translateY(${-t * 30}px)`; }
              if (titleEl) { titleEl.style.opacity = titleFade; titleEl.style.transform = `translateY(${-t * 50}px)`; }
              if (descGroupEl) { descGroupEl.style.opacity = Math.max(0, 1 - t * 3); descGroupEl.style.transform = `translateY(${-t * 30}px)`; }
              if (pillsEl) { pillsEl.style.opacity = Math.max(0, 1 - t * 4); pillsEl.style.transform = `translateY(${-t * 20}px)`; }
              // DO NOT touch panelEl — GSAP owns it
            } else if (shatteredRef.current.has(i)) {
              // Effect finished — card is gone
              chapterEl.style.opacity = "0";
              if (panelEl) panelEl.style.pointerEvents = "none";
            } else {
              // Normal exit drift (no effect running)
              chapterEl.style.opacity = "1";
              const titleFade = Math.max(0, 1 - t * 2.2);
              if (numberEl) { numberEl.style.opacity = Math.max(0, 0.5 - t * 1.5); numberEl.style.transform = `translateY(${-t * 30}px)`; }
              if (titleEl) { titleEl.style.opacity = titleFade; titleEl.style.transform = `translateY(${-t * 50}px)`; }
              if (descGroupEl) { descGroupEl.style.opacity = Math.max(0, 1 - t * 3); descGroupEl.style.transform = `translateY(${-t * 30}px)`; }
              if (pillsEl) { pillsEl.style.opacity = Math.max(0, 1 - t * 4); pillsEl.style.transform = `translateY(${-t * 20}px)`; }
              if (panelEl) {
                const panelFade = Math.max(0, 1 - t * 2);
                panelEl.style.opacity = panelFade;
                panelEl.style.transform = `scale(${1 - t * 0.05}) translate(0,${-t * 20}px)`;
                panelEl.style.pointerEvents = panelFade > 0.5 ? "auto" : "none";
              }
            }
          }

          bestActive = i;

          // ── HIDDEN ────────────────────────────────────────────────────────
        } else {
          if (!effectOwned) {
            chapterEl.style.opacity = "0";
            if (numberEl) { numberEl.style.opacity = "0"; numberEl.style.transform = "translateY(40px)"; }
            if (titleEl) { titleEl.style.opacity = "0"; titleEl.style.transform = "translateY(70px)"; }
            if (descGroupEl) { descGroupEl.style.opacity = "0"; descGroupEl.style.transform = "translateY(30px)"; }
            if (pillsEl) { pillsEl.style.opacity = "0"; pillsEl.style.transform = "translateY(20px)"; }
            if (panelEl) {
              gsap.set(panelEl, { clearProps: "all" });
              panelEl.style.opacity = "0";
              panelEl.style.transform = "scale(0.94)";
              panelEl.style.pointerEvents = "none";
            }
            hasBeenActiveRef.current.delete(i);
            shatteredRef.current.delete(i);
            if (effectCardIdxRef.current === i) {
              effectCardIdxRef.current = -1;
              effectStateRef.current = "idle";
            }
          }
          // If effectOwned, leave everything alone until GSAP finishes
        }
      });

      setCurrentIndex(bestActive);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="asteroid-card-overlay" ref={containerRef}>
      {achievements.map((ach, i) => (
        <div
          key={ach.id}
          className="mission-chapter"
          ref={(el) => (cardElemsRef.current[i] = el)}
          style={{ "--accent-color": CARD_COLORS[i] || ach.color, opacity: 0 }}
        >
          <div className="mission-content">
            <div className="mission-number">MISSION {String(i + 1).padStart(2, "0")}</div>

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
                <span className="mission-pill mission-pill--status">{ach.details.status}</span>
              )}
            </div>

            <div className="mission-panel" ref={(el) => (panelElemsRef.current[i] = el)}>
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

              {ach.id !== 'tech-certs' && ach.id !== 'legacy' && ach.links?.live && (
                <a href={ach.links.live} target="_blank" rel="noopener noreferrer" className="mission-link-raw">
                  → {ach.links.live.replace(/^https?:\/\//, '')}
                </a>
              )}

              {ach.id === 'tech-certs' && Array.isArray(ach.certs) && (
                <div className="custom-mission-content">
                  <div className="filter-pills-row">
                    {['All', 'Java', 'Spring Boot', 'DSA', 'AWS', 'AI/ML', 'Web'].map(f => (
                      <button key={f}
                        className={`filter-pill tech-filter ${techFilter === f ? 'active' : ''}`}
                        onClick={e => {
                          setTechFilter(f);
                          gsap.fromTo(e.currentTarget, { scale: 1 }, { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1 });
                        }}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="custom-grid">
                    {(ach.certs || []).map((cert, idx) => cert && (
                      <div key={idx} className="tech-card-wrapper custom-card tech-card" data-category={cert.domain ?? ''}>
                        <div className="card-top-pill">{(cert.domain ?? '').toUpperCase()}</div>
                        <div className="card-middle-title">{cert.name ?? ''}</div>
                        <div className="card-bottom-row">
                          <span className="card-issuer">{cert.issuer ?? ''}</span>
                          <span className="card-year">{cert.year ?? ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ach.id === 'legacy' && Array.isArray(ach.legacyItems) && (
                <div className="custom-mission-content">
                  <div className="filter-pills-row">
                    {['🏀 Basketball', '🏃 Athletics', '✍️ Writing', '👑 Leadership'].map(f => (
                      <button key={f}
                        className={`filter-pill legacy-filter ${legacyFilter === f ? 'active' : ''}`}
                        onClick={e => {
                          setLegacyFilter(f);
                          gsap.fromTo(e.currentTarget, { scale: 1 }, { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1 });
                        }}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="legacy-stats-row">
                    {[['5+', 'YEARS\nCOMPETING'], ['12+', 'CERTIFICATES'], ['4', 'STATE\nEVENTS'], ['2+', 'LEADERSHIP\nROLES']].map(([v, l]) => (
                      <div key={l} className="legacy-stat-col">
                        <div className="ls-val">{v}</div>
                        <div className="ls-lbl">{l.split('\n').map((s, i) => <span key={i}>{s}<br /></span>)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="custom-grid">
                    {(ach.legacyItems || []).map((item, idx) => item && (
                      <div key={idx} className="legacy-card-wrapper custom-card legacy-card" data-category={item.category ?? ''}>
                        <div className="card-top-pill">{(item.level ?? '').toUpperCase()}</div>
                        <div className="card-middle-title">{item.name ?? ''}</div>
                        <div className="card-bottom-row">
                          <span className="card-issuer">{item.event ?? ''}</span>
                          <span className="card-year">{item.year ?? ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}