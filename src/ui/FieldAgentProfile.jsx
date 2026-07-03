import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { coreIdentity } from '../data/achievements';
import './FieldAgentProfile.css';

gsap.registerPlugin(ScrollTrigger);

export default function FieldAgentProfile() {
  const containerRef = useRef(null);
  const stampRef = useRef(null);
  const contentRef = useRef(null);
  const imageRef = useRef(null);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      const formatted = new Intl.DateTimeFormat('en-US', options).format(now);
      setTimeStr(`${formatted} IST`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set(stampRef.current, { scale: 1.5, opacity: 0, rotation: -12, xPercent: -50, yPercent: -50 });
      gsap.set(contentRef.current, { opacity: 0, y: 30 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 60%',
          toggleActions: 'play none none reverse',
        }
      });

      // 1. Stamp text appears first
      tl.to(stampRef.current, {
        scale: 1,
        opacity: 1,
        rotation: -8,
        duration: 0.4,
        ease: 'back.out(1.7)'
      })
      // Holds for 0.4s then fades out
      .to(stampRef.current, {
        opacity: 0,
        duration: 0.3,
        delay: 0.4,
        ease: 'power2.inOut'
      })
      // 2. Content fades in beneath it
      .to(contentRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out'
      }, '-=0.1');

      // 3. Image grayscale to color
      gsap.to(imageRef.current, {
        filter: 'grayscale(0)',
        duration: 1.2,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 50%',
        }
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="fap-section" ref={containerRef}>
      <div className="fap-stamp" ref={stampRef}>
        CLASSIFIED
      </div>

      <div className="fap-content" ref={contentRef}>
        <div className="fap-left">
          <div className="fap-photo-wrap">
            <img
              ref={imageRef}
              src="/assets/profile.svg"
              alt="Field Agent Profile"
              className="fap-photo"
            />
          </div>
          <div className="fap-status-bar">
            <span className="fap-status-dot">● ACTIVE</span>
            <span className="fap-time">{timeStr}</span>
          </div>
        </div>
        
        <div className="fap-right">
          <div className="fap-eyebrow">FIELD AGENT PROFILE — DECLASSIFIED</div>
          <h2 className="fap-name">Vaibhav Tripathi</h2>
          <div className="fap-designation">Full-Stack Developer · Backend Engineer</div>
          
          <hr className="fap-divider" />
          
          <div className="fap-data-rows">
            <div className="fap-row">
              <span className="fap-label">CLEARANCE LEVEL</span>
              <span className="fap-value">B.Tech CSE · PSIT Kanpur</span>
            </div>
            <div className="fap-row">
              <span className="fap-label">CLASS OF</span>
              <span className="fap-value">2026</span>
            </div>
            <div className="fap-row">
              <span className="fap-label">LOCATION</span>
              <span className="fap-value">Kanpur, India · UTC+5:30</span>
            </div>
            <div className="fap-row">
              <span className="fap-label">CURRENT STATUS</span>
              <span className="fap-value">
                <span style={{color: '#4ade80'}}>●</span> Available for work
              </span>
            </div>
            <div className="fap-row">
              <span className="fap-label">LANGUAGES</span>
              <span className="fap-value">Java, JavaScript, Python</span>
            </div>
            <div className="fap-row">
              <span className="fap-label">SPECIALISATION</span>
              <span className="fap-value">Full-Stack · Backend · AI Systems</span>
            </div>
            <div className="fap-row">
              <span className="fap-label">MARATHONS RUN</span>
              <span className="fap-value">Yes (this is not a joke)</span>
            </div>
            <div className="fap-row">
              <span className="fap-label">POETRY PUBLISHED</span>
              <span className="fap-value">Technically yes</span>
            </div>
          </div>
          
          <div className="fap-links">
            <a href="/assets/resume.pdf" className="fap-link-download" target="_blank" rel="noopener noreferrer">
              ↓ Download Full Dossier
            </a>
            <a href={coreIdentity.links.linkedin} className="fap-link-linkedin" target="_blank" rel="noopener noreferrer">
              ↗ LinkedIn Profile
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
