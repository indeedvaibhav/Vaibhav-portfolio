import { useEffect, useRef } from "react";
import * as THREE from "three";
import useStore from "../hooks/useStore";

/* ─── Helpers ──────────────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeInCubic = (t) => t * t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ─── Config ───────────────────────────────────────────────── */
const CFG = {
  cameraStartZ: 5.5,
  chargeDuration: 1.0,
  collapseDuration: 0.9,
  flyDuration: 1.1,
  arriveDuration: 0.7,
  starColor: 0xe8e6f0,
};

/* ─── Starfield ─────────────────────────────────────────────── */
function buildStars(count) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 2] = -Math.random() * 80;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: CFG.starColor,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    })
  );
}

/* ─── Static noise shader ───────────────────────────────────── */
// Vanilla Three.js post-processing via ShaderMaterial on a full-screen quad
class PostQuad {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.rt.texture },
        uTime: { value: 0 },
        uRgb: { value: 0 },
        uNoise: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uRgb;
        uniform float uNoise;
        varying vec2 vUv;
        float rand(vec2 co){ return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453123); }
        void main(){
          vec2 uv = vUv;
          // RGB shift
          vec4 r = texture2D(tDiffuse, uv + vec2(uRgb, 0.0));
          vec4 g = texture2D(tDiffuse, uv);
          vec4 b = texture2D(tDiffuse, uv - vec2(uRgb, 0.0));
          vec4 col = vec4(r.r, g.g, b.b, 1.0);
          // Static noise
          float n = rand(uv * (uTime * 60.0 + 1.0));
          col.rgb += (n - 0.5) * uNoise;
          gl_FragColor = col;
        }
      `,
      depthTest: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.scene.add(quad);
  }

  resize(w, h) {
    this.rt.setSize(w, h);
  }

  render(mainScene, mainCamera) {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(mainScene, mainCamera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function CrystalTransition({ onComplete }) {
  const containerRef = useRef(null);
  const scanlinesRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /* ── Renderer ── */
    const W = window.innerWidth,
      H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x050510);
    container.appendChild(renderer.domElement);

    /* ── Scene / Camera ── */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.025);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    camera.position.set(0, 0, CFG.cameraStartZ);

    /* ── Stars ── */
    const stars = buildStars(1400);
    scene.add(stars);

    /* ── Black Hole Setup ── */
    const blackHoleGroup = new THREE.Group();
    
    // 1. Singularity Sphere
    const singularityGeo = new THREE.SphereGeometry(0.001, 16, 16);
    const singularityMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true });
    const singularityMesh = new THREE.Mesh(singularityGeo, singularityMat);
    blackHoleGroup.add(singularityMesh);

    // 2. Accretion Disk
    const accretionGeo = new THREE.TorusGeometry(0.8, 0.18, 8, 80);
    const accretionMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        
        void main() {
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float heat = sin(angle * 6.0 + uTime * 3.0) * 0.5 + 0.5;
          vec3 innerColor = vec3(1.0, 0.95, 0.7);   // white-yellow hot
          vec3 outerColor = vec3(1.0, 0.35, 0.0);   // deep orange
          vec3 col = mix(outerColor, innerColor, heat);
          gl_FragColor = vec4(col, uOpacity);
        }
      `,
      transparent: true,
    });
    const accretionDisk = new THREE.Mesh(accretionGeo, accretionMat);
    accretionDisk.rotation.x = 1.1; // Tilted
    blackHoleGroup.add(accretionDisk);

    // 3. Gravitational Lensing Ring
    const lensingGeo = new THREE.TorusGeometry(1.05, 0.03, 8, 120);
    const lensingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const lensingRing = new THREE.Mesh(lensingGeo, lensingMat);
    lensingRing.rotation.x = 1.1; // Same tilt
    blackHoleGroup.add(lensingRing);

    // 4. Ambient Point Light
    const pointLight = new THREE.PointLight(0xff6600, 0, 20);
    pointLight.position.set(0, 0, 0);
    blackHoleGroup.add(pointLight);

    scene.add(blackHoleGroup);

    /* ── Post ── */
    const post = new PostQuad(renderer);

    /* ── State machine ── */
    const PHASE = {
      CHARGE: "charge",
      COLLAPSE: "collapse",
      FLY: "fly",
      ARRIVE: "arrive",
      DONE: "done",
    };
    let phase = PHASE.CHARGE;
    let phaseStart = 0;
    let totalElapsed = 0;

    /* ── Resize ── */
    const onResize = () => {
      const w = window.innerWidth,
        h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      post.resize(w, h);
    };
    window.addEventListener("resize", onResize);

    /* ── Overlay fade (final fade-to-dark then transparent) ── */
    let overlayOpacity = 0;

    /* ── RAF loop ── */
    let raf;
    let lastT = performance.now();

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      totalElapsed += dt;
      const t = totalElapsed - phaseStart;

      // Update Loop Additions
      accretionDisk.rotation.y += dt * 1.2;
      accretionDisk.material.uniforms.uTime.value = totalElapsed;
      singularityMesh.rotation.y += dt * 0.5;

      /* Per-phase logic */
      if (phase === PHASE.CHARGE) {
        const p = clamp01(t / CFG.chargeDuration);
        const e = easeInCubic(p);

        camera.position.z = lerp(CFG.cameraStartZ, 3.0, e);
        
        // Singularity sphere grows from 0.001 to 0.15 -> Scale 1 to 150
        singularityMesh.scale.setScalar(lerp(1, 150, e));
        
        // Accretion disk fades in (uOpacity 0 → 0.9)
        accretionDisk.material.uniforms.uOpacity.value = lerp(0, 0.9, e);
        
        // Lensing ring fades in (opacity 0 → 0.7)
        lensingRing.material.opacity = lerp(0, 0.7, e);
        
        // Point light intensity 0 → 2.5
        pointLight.intensity = lerp(0, 2.5, e);
        
        // RGB shift: 0 → 0.008
        post.mat.uniforms.uRgb.value = lerp(0, 0.008, e);
        post.mat.uniforms.uNoise.value = 0; // Stays 0 here
        post.mat.uniforms.uTime.value = totalElapsed;

        // Stars slowly rotate
        stars.rotation.y += dt * 0.02;

        if (scanlinesRef.current)
          scanlinesRef.current.style.opacity = p > 0.4 ? String(lerp(0, 0.5, (p - 0.4) / 0.6)) : "0";

        if (p >= 1) {
          phase = PHASE.COLLAPSE;
          phaseStart = totalElapsed;
        }
      } else if (phase === PHASE.COLLAPSE) {
        const p = clamp01(t / CFG.collapseDuration);
        const e = easeInCubic(p);

        // Camera moves from z: 3.0 → z: 0.8
        camera.position.z = lerp(3.0, 0.8, e);
        
        // Singularity grows from 0.15 → 1.8 (Scale 150 -> 1800)
        singularityMesh.scale.setScalar(lerp(150, 1800, e));
        
        // Accretion disk scales up 1.0 → 2.2 and fades out 0.9 → 0
        accretionDisk.scale.setScalar(lerp(1.0, 2.2, e));
        accretionDisk.material.uniforms.uOpacity.value = lerp(0.9, 0, e);
        
        // Lensing ring scales up 1.0 → 2.8 and fades out 0.7 → 0
        lensingRing.scale.setScalar(lerp(1.0, 2.8, e));
        lensingRing.material.opacity = lerp(0.7, 0, e);
        
        // Point light intensity spikes: 2.5 → 8 → 0
        if (p < 0.5) {
          pointLight.intensity = lerp(2.5, 8.0, p * 2);
        } else {
          pointLight.intensity = lerp(8.0, 0, (p - 0.5) * 2);
        }
        
        // RGB shift spikes: 0.008 → 0.09
        post.mat.uniforms.uRgb.value = lerp(0.008, 0.09, e);
        // Noise: 0 → 0.8
        post.mat.uniforms.uNoise.value = lerp(0, 0.8, e);
        post.mat.uniforms.uTime.value = totalElapsed;

        if (scanlinesRef.current) scanlinesRef.current.style.opacity = p < 0.8 ? "0.55" : "0";

        stars.rotation.y += dt * 0.05; // speed up slightly

        if (p >= 1) {
          phase = PHASE.FLY;
          phaseStart = totalElapsed;
        }
      } else if (phase === PHASE.FLY) {
        const p = clamp01(t / CFG.flyDuration);
        const e = easeInOutCubic(p);

        // Camera blasts through: z: 0.8 → z: -20
        camera.position.z = lerp(0.8, -20, e);
        camera.fov = lerp(50, 65, e);
        camera.updateProjectionMatrix();

        // Singularity fades out over first 40%
        const singP = clamp01(p / 0.4);
        singularityMat.opacity = lerp(1, 0, singP);
        
        // RGB shift: 0.09 → 0
        post.mat.uniforms.uRgb.value = lerp(0.09, 0, easeOutCubic(p));
        // Noise: 0.8 → 0
        post.mat.uniforms.uNoise.value = lerp(0.8, 0, easeOutCubic(p));
        post.mat.uniforms.uTime.value = totalElapsed;

        if (scanlinesRef.current)
          scanlinesRef.current.style.opacity = p < 0.3 ? String(lerp(0.55, 0, p / 0.3)) : "0";

        // Stars streak past (increase opacity briefly)
        const starSpeed = Math.sin(p * Math.PI);
        stars.material.opacity = lerp(0.7, 1.0, starSpeed);
        stars.rotation.y += dt * (0.05 + starSpeed * 0.1);

        if (p >= 1) {
          phase = PHASE.ARRIVE;
          phaseStart = totalElapsed;
        }
      } else if (phase === PHASE.ARRIVE) {
        const p = clamp01(t / CFG.arriveDuration);
        const e = easeOutCubic(p);

        // Fade overlay from transparent → black → transparent
        // First half: fade to black; second half: black to transparent (reveals portfolio)
        if (p < 0.5) {
          overlayOpacity = easeInCubic(p * 2); // 0 → 1
        } else {
          overlayOpacity = easeOutCubic(1 - (p - 0.5) * 2); // 1 → 0
        }
        if (overlayRef.current) overlayRef.current.style.opacity = String(overlayOpacity);

        post.mat.uniforms.uRgb.value = 0;
        post.mat.uniforms.uNoise.value = 0;
        post.mat.uniforms.uTime.value = totalElapsed;

        if (p >= 1) {
          phase = PHASE.DONE;
        }
      } else if (phase === PHASE.DONE) {
        // Cleanup and notify parent
        cancelAnimationFrame(raf);
        // Brief pause then call onComplete
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 80);
        return;
      }

      post.render(scene, camera);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      post.rt.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* The WebGL canvas mounts inside this div */}
      <div ref={containerRef} className="crystal-overlay" />

      {/* CSS scanlines */}
      <div ref={scanlinesRef} className="crystal-scanlines" />

      {/* Black fade overlay for the reveal */}
      <div ref={overlayRef} className="crystal-blackout" />
    </>
  );
}

