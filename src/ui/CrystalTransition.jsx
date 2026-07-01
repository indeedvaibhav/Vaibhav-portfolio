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
  chargeDuration: 0.85,
  shatterDuration: 0.75,
  flyDuration: 1.1,
  arriveDuration: 0.7,
  // Portfolio color palette
  crystalColor: 0xffaa33,    // --accent-gold
  crystalEdge: 0xffcc66,
  shardColors: [0xffaa33, 0x6366f1, 0xffeebb],
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

/* ─── Shard builder ─────────────────────────────────────────── */
function buildShards(crystalGeo, colors) {
  const nonIndexed = crystalGeo.index ? crystalGeo.toNonIndexed() : crystalGeo;
  const pos = nonIndexed.attributes.position;
  const shards = [];
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const center = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const normal = center.clone().normalize();
    const inner = center.clone().multiplyScalar(0.5);

    const pts = [a, b, c, a, c, inner, c, b, inner, b, a, inner];
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((v, idx) => {
      positions[idx * 3] = v.x;
      positions[idx * 3 + 1] = v.y;
      positions[idx * 3 + 2] = v.z;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      roughness: 0.08,
      metalness: 0.1,
      emissive: new THREE.Color(color).multiplyScalar(0.3),
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.dir = normal
      .clone()
      .add(new THREE.Vector3(0, (Math.random() - 0.3) * 0.5, 0))
      .normalize();
    mesh.userData.speed = 2.5 + Math.random() * 4;
    mesh.userData.spin = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    );
    mesh.visible = false;
    shards.push(mesh);
  }
  return shards;
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

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0x223344, 0.7));
    const keyLight = new THREE.PointLight(0xffaa33, 3.0, 25);
    keyLight.position.set(2, 2, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x6366f1, 1.8, 25);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    /* ── Stars ── */
    const stars = buildStars(1400);
    scene.add(stars);

    /* ── Crystal ── */
    const crystalGroup = new THREE.Group();
    const crystalGeo = new THREE.IcosahedronGeometry(1.0, 1);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: CFG.crystalColor,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.05,
      emissive: new THREE.Color(0xffaa33).multiplyScalar(0.25),
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalGroup.add(crystalMesh);
    crystalGroup.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(crystalGeo),
        new THREE.LineBasicMaterial({
          color: CFG.crystalEdge,
          transparent: true,
          opacity: 0.9,
        })
      )
    );
    scene.add(crystalGroup);

    /* ── Shards ── */
    const shards = buildShards(crystalGeo, CFG.shardColors);
    shards.forEach((s) => scene.add(s));

    /* ── Post ── */
    const post = new PostQuad(renderer);

    /* ── State machine ── */
    const PHASE = {
      CHARGE: "charge",
      SHATTER: "shatter",
      FLY: "fly",
      ARRIVE: "arrive",
      DONE: "done",
    };
    let phase = PHASE.CHARGE;
    let phaseStart = 0;
    let shattered = false;
    let totalElapsed = 0;

    const triggerShatter = () => {
      const wp = new THREE.Vector3();
      crystalGroup.getWorldPosition(wp);
      shards.forEach((s) => {
        s.position.copy(wp);
        s.rotation.set(0, 0, 0);
        s.material.opacity = 0.92;
        s.visible = true;
      });
      crystalGroup.visible = false;
    };

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

      /* Per-phase logic */
      if (phase === PHASE.CHARGE) {
        const p = clamp01(t / CFG.chargeDuration);
        const e = easeInCubic(p);

        camera.position.z = lerp(CFG.cameraStartZ, 2.8, e);
        post.mat.uniforms.uRgb.value = lerp(0, 0.01, e);
        post.mat.uniforms.uNoise.value = lerp(0, 0.12, e);
        post.mat.uniforms.uTime.value = totalElapsed;

        // Crystal pulse & spin
        crystalGroup.rotation.y += dt * (0.3 + e * 3.0);
        crystalGroup.rotation.x += dt * 0.1;
        const pulse = 1 + Math.sin(totalElapsed * 20) * 0.018 * e;
        crystalGroup.scale.setScalar(pulse);
        crystalMat.emissiveIntensity = 0.8 + e * 2.5;

        if (scanlinesRef.current)
          scanlinesRef.current.style.opacity = p > 0.4 ? String(lerp(0, 0.5, (p - 0.4) / 0.6)) : "0";

        if (p >= 1) {
          phase = PHASE.SHATTER;
          phaseStart = totalElapsed;
        }
      } else if (phase === PHASE.SHATTER) {
        if (!shattered) {
          triggerShatter();
          shattered = true;
        }
        const p = clamp01(t / CFG.shatterDuration);

        camera.position.z = lerp(2.8, -1.0, easeInOutCubic(p));
        camera.fov = lerp(50, 65, easeInCubic(p));
        camera.updateProjectionMatrix();

        post.mat.uniforms.uRgb.value = lerp(0.01, 0.075, Math.sin(p * Math.PI));
        post.mat.uniforms.uNoise.value = lerp(0.12, 0.9, Math.min(1, p * 2.2));
        post.mat.uniforms.uTime.value = totalElapsed;

        if (scanlinesRef.current) scanlinesRef.current.style.opacity = p < 0.8 ? "0.55" : "0";

        shards.forEach((s) => {
          s.position.addScaledVector(s.userData.dir, s.userData.speed * dt);
          s.rotation.x += s.userData.spin.x * dt;
          s.rotation.y += s.userData.spin.y * dt;
          s.rotation.z += s.userData.spin.z * dt;
        });

        if (p >= 1) {
          phase = PHASE.FLY;
          phaseStart = totalElapsed;
        }
      } else if (phase === PHASE.FLY) {
        const p = clamp01(t / CFG.flyDuration);
        const e = easeInOutCubic(p);

        camera.position.z = lerp(-1.0, -18, e);
        camera.fov = lerp(65, 52, e);
        camera.updateProjectionMatrix();

        post.mat.uniforms.uRgb.value = lerp(0.075, 0.002, easeOutCubic(Math.min(1, p * 1.4)));
        post.mat.uniforms.uNoise.value = lerp(0.9, 0, easeOutCubic(Math.min(1, p * 1.6)));
        post.mat.uniforms.uTime.value = totalElapsed;

        if (scanlinesRef.current)
          scanlinesRef.current.style.opacity = p < 0.3 ? String(lerp(0.55, 0, p / 0.3)) : "0";

        shards.forEach((s) => {
          s.position.addScaledVector(s.userData.dir, s.userData.speed * dt * 0.5);
          s.rotation.x += s.userData.spin.x * dt * 0.5;
          s.rotation.y += s.userData.spin.y * dt * 0.5;
          s.material.opacity = lerp(0.92, 0, easeInCubic(Math.min(1, p * 1.5)));
        });

        stars.rotation.y += dt * 0.008;

        if (p >= 1) {
          phase = PHASE.ARRIVE;
          phaseStart = totalElapsed;
          shards.forEach((s) => (s.visible = false));
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
