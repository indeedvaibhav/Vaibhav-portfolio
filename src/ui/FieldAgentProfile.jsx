import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { coreIdentity } from '../data/achievements';
import './FieldAgentProfile.css';

gsap.registerPlugin(ScrollTrigger);

const ROWS = [
  { label: 'CLEARANCE LEVEL', value: 'B.Tech CSE · PSIT Kanpur' },
  { label: 'CLASS OF',        value: '2026' },
  { label: 'LOCATION',        value: 'Kanpur, India · UTC+5:30' },
  { label: 'CURRENT STATUS',  value: null,  isStatus: true },
  { label: 'LANGUAGES',       value: 'Java, JavaScript, Python' },
  { label: 'SPECIALISATION',  value: 'Full-Stack · Backend · AI Systems' },
  { label: 'MARATHONS RUN',   value: 'Yes (this is not a joke)' },
  { label: 'POETRY PUBLISHED',value: 'Technically yes' },
];

export default function FieldAgentProfile() {
  const sectionRef   = useRef(null);
  const stampRef     = useRef(null);
  const contentRef   = useRef(null);
  const photoRef     = useRef(null);
  const scannerRef   = useRef(null);
  const dividerRef   = useRef(null);
  const eyebrowRef   = useRef(null);
  const nameRef      = useRef(null);
  const desigRef     = useRef(null);
  const rowRefs      = useRef([]);
  const linksRef     = useRef(null);
  const labelRef     = useRef(null);
  const cornersRef   = useRef([]);
  const [timeStr, setTimeStr] = useState('');

  /* ── Live clock ─────────────────────────────────── */
  useEffect(() => {
    const tick = () => {
      const t = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata', hour: '2-digit',
        minute: '2-digit', hour12: false,
      }).format(new Date());
      setTimeStr(`${t} IST`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── GSAP master timeline ───────────────────────── */
  useEffect(() => {
    const ctx = gsap.context(() => {

      /* --- Initial hidden states --- */
      gsap.set(stampRef.current, {
        opacity: 0, scale: 1.8, rotation: -15,
        xPercent: -50, yPercent: -50,
      });
      gsap.set(contentRef.current,   { opacity: 0 });
      gsap.set(photoRef.current,     { opacity: 0, scale: 1.04 });
      gsap.set(cornersRef.current,   { opacity: 0, scale: 0 });
      gsap.set(labelRef.current,     { opacity: 0, y: 8 });
      gsap.set(dividerRef.current,   { width: '0%' });
      gsap.set(eyebrowRef.current,   { opacity: 0, y: -10 });
      gsap.set(nameRef.current,      { opacity: 0, y: 24 });
      gsap.set(desigRef.current,     { opacity: 0, y: 12 });
      gsap.set(rowRefs.current,      { opacity: 0, x: 22 });
      gsap.set(linksRef.current,     { opacity: 0, y: 10 });

      /* --- Master timeline triggered by scroll --- */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 55%',
          toggleActions: 'play none none reverse',
        },
      });

      /* 1 — CLASSIFIED stamp slams in */
      tl.to(stampRef.current, {
        opacity: 1, scale: 1, rotation: -8,
        duration: 0.35, ease: 'back.out(2)',
      })
      /* 2 — stamp shudder */
      .to(stampRef.current, {
        rotation: -6, x: 3, duration: 0.08,
        yoyo: true, repeat: 3, ease: 'none',
      })
      /* 3 — stamp fades out */
      .to(stampRef.current, {
        opacity: 0, scale: 0.85, duration: 0.3,
        ease: 'power2.in', delay: 0.35,
      })
      /* 4 — content layer becomes visible */
      .to(contentRef.current, { opacity: 1, duration: 0 }, '<0.15')

      /* 5 — Photo fades & scales in */
      .to(photoRef.current, {
        opacity: 1, scale: 1,
        duration: 0.55, ease: 'power2.out',
      }, '<')

      /* 6 — corner brackets pop in */
      .to(cornersRef.current, {
        opacity: 1, scale: 1, stagger: 0.07,
        duration: 0.25, ease: 'back.out(2)',
      }, '-=0.3')

      /* 7 — scanner sweep runs top→bottom */
      .fromTo(scannerRef.current,
        { top: '0%', opacity: 1 },
        { top: '102%', opacity: 0.4, duration: 1.1, ease: 'none' },
        '<0.1'
      )
      /* 8 — photo label appears */
      .to(labelRef.current, {
        opacity: 1, y: 0, duration: 0.3, ease: 'power2.out',
      }, '-=0.4')

      /* 9 — right column: eyebrow */
      .to(eyebrowRef.current, {
        opacity: 1, y: 0, duration: 0.4, ease: 'power2.out',
      }, '-=0.6')
      /* 10 — name slams up */
      .to(nameRef.current, {
        opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.4)',
      }, '<0.1')
      /* 11 — designation fades in */
      .to(desigRef.current, {
        opacity: 1, y: 0, duration: 0.4, ease: 'power2.out',
      }, '<0.15')
      /* 12 — divider line draws across */
      .to(dividerRef.current, {
        width: '100%', duration: 0.55, ease: 'power3.out',
      }, '-=0.1')
      /* 13 — data rows stagger in from right */
      .to(rowRefs.current, {
        opacity: 1, x: 0,
        stagger: 0.07, duration: 0.35, ease: 'power2.out',
      }, '-=0.1')
      /* 14 — links appear */
      .to(linksRef.current, {
        opacity: 1, y: 0, duration: 0.4, ease: 'power2.out',
      }, '-=0.15');

      /* --- Photo: grayscale → colour on scroll past midpoint --- */
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 40%',
        onEnter: () =>
          gsap.to(photoRef.current, {
            filter: 'grayscale(0) contrast(1)',
            duration: 1.4, ease: 'power2.inOut',
          }),
        onLeaveBack: () =>
          gsap.to(photoRef.current, {
            filter: 'grayscale(1) contrast(1.05)',
            duration: 0.6, ease: 'power2.inOut',
          }),
      });

      /* --- Repeating scanner sweep every 4 s while section is in view --- */
      const sweepLoop = gsap.to(scannerRef.current, {
        top: '102%', opacity: 0.4, duration: 1.2, ease: 'none',
        paused: true,
        onComplete() {
          gsap.set(scannerRef.current, { top: '0%', opacity: 1 });
        },
      });

      const loopInterval = setInterval(() => {
        gsap.set(scannerRef.current, { top: '0%', opacity: 1 });
        sweepLoop.restart();
      }, 4000);

      return () => clearInterval(loopInterval);

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="fap-section" ref={sectionRef}>

      {/* ── CLASSIFIED stamp ── */}
      <div className="fap-stamp" ref={stampRef}>CLASSIFIED</div>

      {/* ── Main content ── */}
      <div className="fap-content" ref={contentRef}>

        {/* ─── LEFT: photo ─── */}
        <div className="fap-left">
          <div className="fap-photo-wrap">

            {/* Corner brackets */}
            {['tl','tr','bl','br'].map((pos, i) => (
              <div
                key={pos}
                className={`fap-corner fap-corner--${pos}`}
                ref={el => cornersRef.current[i] = el}
              />
            ))}

            {/* The photo */}
            <img
              ref={photoRef}
              src="/assets/profile.jpg"
              alt="Vaibhav Tripathi — Field Agent"
              className="fap-photo"
            />

            {/* Scanner sweep line */}
            <div className="fap-scanner" ref={scannerRef} />

            {/* ID label */}
            <div className="fap-photo-label" ref={labelRef}>
              FIELD AGENT · ID-VT-2026
            </div>
          </div>

          {/* Status bar */}
          <div className="fap-status-bar">
            <span className="fap-status-dot">
              <span className="fap-status-pulse" />
              ACTIVE
            </span>
            <span className="fap-time">{timeStr}</span>
          </div>
        </div>

        {/* ─── RIGHT: data ─── */}
        <div className="fap-right">
          <div className="fap-eyebrow" ref={eyebrowRef}>
            FIELD AGENT PROFILE — DECLASSIFIED
          </div>

          <h2
            className="fap-name"
            ref={nameRef}
            data-text="Vaibhav Tripathi"
          >
            Vaibhav<br />Tripathi
          </h2>

          <div className="fap-designation" ref={desigRef}>
            Full-Stack Developer · Backend Engineer
          </div>

          <hr className="fap-divider" ref={dividerRef} />

          <div className="fap-data-rows">
            {ROWS.map((row, i) => (
              <div
                key={row.label}
                className="fap-row"
                ref={el => rowRefs.current[i] = el}
              >
                <span className="fap-label">{row.label}</span>
                <span className="fap-value">
                  {row.isStatus ? (
                    <><span style={{ color: '#4ade80' }}>●</span> Available for work</>
                  ) : row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="fap-links" ref={linksRef}>
            <a
              href="/assets/resume.pdf"
              className="fap-link-download"
              target="_blank"
              rel="noopener noreferrer"
            >
              ↓ Download Full Dossier
            </a>
            <a
              href={coreIdentity.links.linkedin}
              className="fap-link-linkedin"
              target="_blank"
              rel="noopener noreferrer"
            >
              ↗ LinkedIn Profile
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
