import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ARTIFACTS } from './artifactData';
import OrbitingArtifact from './OrbitingArtifact';
import ArtifactTooltip from './ArtifactTooltip';
import ArtifactInfoCard from './ArtifactInfoCard';
import './artifacts.css';

const SPRING = 0.042;
const FRICTION = 0.91;
const MAGNETIC_RADIUS = 150;
const MAGNETIC_STRENGTH = 0.1;
const DRAG_THRESHOLD = 6;
const MOMENTUM_FACTOR = 0.55;

function createPhysicsState(config) {
  const x = Math.cos(config.startAngle) * config.radius;
  const y = Math.sin(config.startAngle) * config.radius;
  return {
    angle: config.startAngle,
    radius: config.radius,
    angularSpeed: config.angularSpeed,
    x,
    y,
    vx: 0,
    vy: 0,
    dragging: false,
    hovered: false,
    pointerId: null,
    dragStartX: x,
    dragStartY: y,
    dragMoved: false,
    offsetX: 0,
    offsetY: 0,
    prevDragX: x,
    prevDragY: y,
    lastMoveTime: 0,
  };
}

export default function ArtifactSystem() {
  const artifactRefs = useRef({});
  const tooltipRef = useRef(null);
  const physicsRef = useRef(
    Object.fromEntries(ARTIFACTS.map((a) => [a.id, createPhysicsState(a)])),
  );
  const mouseRef = useRef({ x: 0, y: 0 });
  const sunCenterRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);
  const draggingIdRef = useRef(null);
  const hoveredIdRef = useRef(null);
  const tooltipVisibleRef = useRef(false);

  const [activeCard, setActiveCard] = useState(null);
  const [cardPos, setCardPos] = useState({ x: 0, y: 0 });

  const applyTransforms = useCallback(() => {
    ARTIFACTS.forEach((config) => {
      const phys = physicsRef.current[config.id];
      const el = artifactRefs.current[config.id];
      if (!phys || !el) return;
      el.style.transform = `translate3d(${phys.x}px, ${phys.y}px, 0)`;
    });
  }, []);

  useLayoutEffect(() => {
    applyTransforms();
  }, [applyTransforms]);

  const getSunCenter = useCallback(() => {
    const sun = document.querySelector('.hero-sun-wrap');
    if (!sun) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    const r = sun.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  const toSunRelative = useCallback((clientX, clientY) => {
    const c = sunCenterRef.current;
    return { x: clientX - c.x, y: clientY - c.y };
  }, []);

  const getScreenPos = useCallback((phys) => {
    const c = sunCenterRef.current;
    return { x: c.x + phys.x, y: c.y + phys.y };
  }, []);

  const updateTooltipDOM = useCallback((id) => {
    const tip = tooltipRef.current;
    if (!tip) return;

    if (!id || draggingIdRef.current) {
      if (tooltipVisibleRef.current) {
        tip.classList.remove('artifact-tooltip--visible');
        tooltipVisibleRef.current = false;
      }
      return;
    }

    const phys = physicsRef.current[id];
    const config = ARTIFACTS.find((a) => a.id === id);
    if (!phys || !config) return;

    const pos = getScreenPos(phys);
    tip.textContent = config.tooltip;
    tip.style.left = `${pos.x}px`;
    tip.style.top = `${pos.y - 24}px`;

    if (!tooltipVisibleRef.current) {
      tip.classList.add('artifact-tooltip--visible');
      tooltipVisibleRef.current = true;
    }
  }, [getScreenPos]);

  useEffect(() => {
    const tick = (time) => {
      const dt = Math.min((time - (lastTickRef.current || time)) / 1000, 0.032);
      lastTickRef.current = time;

      sunCenterRef.current = getSunCenter();

      ARTIFACTS.forEach((config) => {
        const phys = physicsRef.current[config.id];
        const el = artifactRefs.current[config.id];
        if (!phys || !el) return;

        const orbitPaused =
          phys.dragging || phys.hovered || draggingIdRef.current === config.id;

        if (!orbitPaused) {
          phys.angle += phys.angularSpeed * dt;
        }

        const targetX = Math.cos(phys.angle) * config.radius;
        const targetY = Math.sin(phys.angle) * config.radius;

        if (!phys.dragging) {
          phys.x += phys.vx;
          phys.y += phys.vy;
          phys.vx *= FRICTION;
          phys.vy *= FRICTION;

          phys.x += (targetX - phys.x) * SPRING;
          phys.y += (targetY - phys.y) * SPRING;

          const screen = getScreenPos(phys);
          const mdx = mouseRef.current.x - screen.x;
          const mdy = mouseRef.current.y - screen.y;
          const mdist = Math.hypot(mdx, mdy);

          if (mdist < MAGNETIC_RADIUS && mdist > 0) {
            const pull = (1 - mdist / MAGNETIC_RADIUS) * MAGNETIC_STRENGTH;
            phys.x += mdx * pull;
            phys.y += mdy * pull;
          }

          const orbitDist = Math.hypot(phys.x - targetX, phys.y - targetY);
          if (orbitDist < 6 && Math.hypot(phys.vx, phys.vy) < 0.4) {
            phys.angle = Math.atan2(phys.y, phys.x);
          }
        }

        el.style.transform = `translate3d(${phys.x}px, ${phys.y}px, 0)`;
      });

      updateTooltipDOM(hoveredIdRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getSunCenter, getScreenPos, updateTooltipDOM]);

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      const id = draggingIdRef.current;
      if (!id) return;

      const phys = physicsRef.current[id];
      const rel = toSunRelative(e.clientX, e.clientY);
      const now = performance.now();
      const dt = Math.max((now - phys.lastMoveTime) / 1000, 0.001);

      const newX = rel.x - phys.offsetX;
      const newY = rel.y - phys.offsetY;

      if (dt < 0.05) {
        phys.vx = ((newX - phys.x) / dt) * MOMENTUM_FACTOR * 0.016;
        phys.vy = ((newY - phys.y) / dt) * MOMENTUM_FACTOR * 0.016;
      }

      phys.x = newX;
      phys.y = newY;
      phys.lastMoveTime = now;

      if (Math.hypot(phys.x - phys.dragStartX, phys.y - phys.dragStartY) > DRAG_THRESHOLD) {
        phys.dragMoved = true;
      }
    };

    const endDrag = (e) => {
      const id = draggingIdRef.current;
      if (!id) return;

      const phys = physicsRef.current[id];
      if (e.pointerId !== undefined && phys.pointerId !== e.pointerId) return;

      phys.dragging = false;
      draggingIdRef.current = null;

      const el = artifactRefs.current[id];
      if (el) {
        el.classList.remove('artifact--dragging');
        try {
          el.releasePointerCapture(phys.pointerId);
        } catch {
          /* pointer already released */
        }
      }

      if (!phys.dragMoved) {
        const config = ARTIFACTS.find((a) => a.id === id);
        const pos = getScreenPos(phys);
        setActiveCard(config);
        setCardPos({ x: pos.x, y: pos.y });
      }

      phys.dragMoved = false;
      updateTooltipDOM(hoveredIdRef.current);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [toSunRelative, getScreenPos, updateTooltipDOM]);

  useEffect(() => {
    if (!activeCard) return;

    const onKey = (e) => {
      if (e.key === 'Escape') setActiveCard(null);
    };
    const onClick = (e) => {
      if (!e.target.closest('.artifact-info-card')) setActiveCard(null);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onClick);
    };
  }, [activeCard]);

  const handlePointerDown = (id) => (e) => {
    e.stopPropagation();
    setActiveCard(null);

    const phys = physicsRef.current[id];
    const rel = toSunRelative(e.clientX, e.clientY);

    sunCenterRef.current = getSunCenter();

    phys.dragging = true;
    phys.pointerId = e.pointerId;
    phys.offsetX = rel.x - phys.x;
    phys.offsetY = rel.y - phys.y;
    phys.dragStartX = phys.x;
    phys.dragStartY = phys.y;
    phys.dragMoved = false;
    phys.vx = 0;
    phys.vy = 0;
    phys.lastMoveTime = performance.now();

    draggingIdRef.current = id;

    const el = artifactRefs.current[id];
    if (el) {
      el.classList.add('artifact--dragging');
      el.setPointerCapture(e.pointerId);
    }

    updateTooltipDOM(null);
  };

  const handlePointerEnter = (id) => () => {
    physicsRef.current[id].hovered = true;
    hoveredIdRef.current = id;

    const el = artifactRefs.current[id];
    if (el) el.classList.add('artifact--hovered');
  };

  const handlePointerLeave = (id) => () => {
    if (draggingIdRef.current === id) return;

    physicsRef.current[id].hovered = false;
    if (hoveredIdRef.current === id) hoveredIdRef.current = null;

    const el = artifactRefs.current[id];
    if (el) el.classList.remove('artifact--hovered');

    updateTooltipDOM(null);
  };

  return (
    <>
      <div className="artifact-system" aria-label="Personal artifacts">
        {ARTIFACTS.map((config) => (
          <OrbitingArtifact
            key={config.id}
            id={config.id}
            label={config.tooltip}
            artifactRef={(el) => {
              artifactRefs.current[config.id] = el;
            }}
            onPointerDown={handlePointerDown(config.id)}
            onPointerEnter={handlePointerEnter(config.id)}
            onPointerLeave={handlePointerLeave(config.id)}
          />
        ))}
      </div>

      <ArtifactTooltip ref={tooltipRef} />

      <ArtifactInfoCard
        info={activeCard?.info ?? null}
        x={cardPos.x}
        y={cardPos.y}
        onClose={() => setActiveCard(null)}
      />
    </>
  );
}
