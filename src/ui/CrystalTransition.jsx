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
          vec4 r = texture2D(tDiffuse, uv + vec2(uRgb, 0.0));
          vec4 g = texture2D(tDiffuse, uv);
          vec4 b = texture2D(tDiffuse, uv - vec2(uRgb, 0.0));
          vec4 col = vec4(r.r, g.g, b.b, 1.0);
          float n = rand(uv * (uTime * 60.0 + 1.0));
          col.rgb += (n - 0.5) * uNoise;
          gl_FragColor = col;
        }l
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
    const W = window.innerWidth, H = window.innerHeight;
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

    /* ── Refined Black Hole Setup ── */
    const blackHoleGroup = new THREE.Group();
    
    // 1. Singularity (Core + Photon Ring)
    const singularityGroup = new THREE.Group();
    
    const coreGeo = new THREE.SphereGeometry(0.001, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    singularityGroup.add(coreMesh);

    const photonGeo = new THREE.SphereGeometry(0.00105, 32, 32);
    const photonMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 1.0 } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
          vec3 col = vec3(1.0, 0.6, 0.2) * intensity * 2.0;
          gl_FragColor = vec4(col, intensity * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const photonMesh = new THREE.Mesh(photonGeo, photonMat);
    singularityGroup.add(photonMesh);
    blackHoleGroup.add(singularityGroup);

    // 2. Realistic Accretion Disk with Swirling Gas and Doppler Beaming
    const accretionGeo = new THREE.TorusGeometry(0.85, 0.35, 16, 120);
    const accretionMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vPos;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          float dist = length(vPos.xy);
          float angle = atan(vPos.y, vPos.x);
          
          float doppler = 1.0 + 0.85 * cos(angle);
          float swirl = angle - uTime * 2.5 - dist * 2.0;
          
          float n1 = snoise(vec2(swirl * 4.0, dist * 8.0 - uTime * 0.5)) * 0.5 + 0.5;
          float n2 = snoise(vec2(swirl * 8.0, dist * 16.0 + uTime * 0.8)) * 0.5 + 0.5;
          float noiseVal = n1 * 0.7 + n2 * 0.3;

          float edgeFade = smoothstep(0.0, 1.0, sin(vUv.y * 3.14159));
          float radialNorm = (dist - 0.5) / 0.7;
          float radialFade = smoothstep(0.0, 1.0, sin(clamp(radialNorm, 0.0, 1.0) * 3.14159));
          
          vec3 hot = vec3(1.0, 0.95, 0.8);
          vec3 mid = vec3(1.0, 0.4, 0.0);
          vec3 dark = vec3(0.05, 0.0, 0.02);

          vec3 col = mix(dark, mid, smoothstep(0.1, 0.6, noiseVal));
          col = mix(col, hot, smoothstep(0.5, 0.9, noiseVal));

          col *= doppler * edgeFade * radialFade * 2.5;
          float alpha = uOpacity * edgeFade * radialFade * (0.2 + noiseVal * 0.8);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const accretionDisk = new THREE.Mesh(accretionGeo, accretionMat);
    accretionDisk.rotation.x = 1.1; // Tilted
    blackHoleGroup.add(accretionDisk);

    // 3. Gravitational Lensing Ring (Faint Outer Halo)
    const lensingGeo = new THREE.RingGeometry(1.2, 1.5, 64);
    const lensingMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float fade = sin(vUv.y * 3.14159);
          fade = pow(fade, 2.0);
          vec3 col = vec3(0.7, 0.85, 1.0);
          gl_FragColor = vec4(col, fade * uOpacity * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const lensingRing = new THREE.Mesh(lensingGeo, lensingMat);
    lensingRing.rotation.x = 1.1; // Same tilt
    blackHoleGroup.add(lensingRing);

    // 4. Atmospheric Glow (Halo behind the black hole)
    const haloGeo = new THREE.PlaneGeometry(5, 5);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, dist);
          alpha = pow(alpha, 2.5);
          gl_FragColor = vec4(1.0, 0.5, 0.2, alpha * uOpacity * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.z = -0.05;
    blackHoleGroup.add(haloMesh);

    // 5. Point Light
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

    /* ── Overlay fade ── */
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
      accretionDisk.material.uniforms.uTime.value = totalElapsed;

      /* Per-phase logic */
      if (phase === PHASE.CHARGE) {
        const p = clamp01(t / CFG.chargeDuration);
        const e = easeInCubic(p);

        camera.position.z = lerp(CFG.cameraStartZ, 3.0, e);
        
        singularityGroup.scale.setScalar(lerp(1, 150, e));
        accretionDisk.material.uniforms.uOpacity.value = lerp(0, 0.9, e);
        lensingRing.material.uniforms.uOpacity.value = lerp(0, 0.7, e);
        haloMesh.material.uniforms.uOpacity.value = lerp(0, 1.0, e);
        pointLight.intensity = lerp(0, 2.5, e);
        
        post.mat.uniforms.uRgb.value = lerp(0, 0.008, e);
        post.mat.uniforms.uNoise.value = 0;
        post.mat.uniforms.uTime.value = totalElapsed;

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

        camera.position.z = lerp(3.0, 0.8, e);
        
        singularityGroup.scale.setScalar(lerp(150, 1800, e));
        
        accretionDisk.scale.setScalar(lerp(1.0, 2.2, e));
        accretionDisk.material.uniforms.uOpacity.value = lerp(0.9, 0, e);
        
        lensingRing.scale.setScalar(lerp(1.0, 2.8, e));
        lensingRing.material.uniforms.uOpacity.value = lerp(0.7, 0, e);

        haloMesh.scale.setScalar(lerp(1.0, 5.0, e));
        haloMesh.material.uniforms.uOpacity.value = lerp(1.0, 0, e);
        
        if (p < 0.5) {
          pointLight.intensity = lerp(2.5, 8.0, p * 2);
        } else {
          pointLight.intensity = lerp(8.0, 0, (p - 0.5) * 2);
        }
        
        post.mat.uniforms.uRgb.value = lerp(0.008, 0.09, e);
        post.mat.uniforms.uNoise.value = lerp(0, 0.8, e);
        post.mat.uniforms.uTime.value = totalElapsed;

        if (scanlinesRef.current) scanlinesRef.current.style.opacity = p < 0.8 ? "0.55" : "0";

        stars.rotation.y += dt * 0.05; 

        if (p >= 1) {
          phase = PHASE.FLY;
          phaseStart = totalElapsed;
        }
      } else if (phase === PHASE.FLY) {
        const p = clamp01(t / CFG.flyDuration);
        const e = easeInOutCubic(p);

        camera.position.z = lerp(0.8, -20, e);
        camera.fov = lerp(50, 65, e);
        camera.updateProjectionMatrix();

        const singP = clamp01(p / 0.4);
        coreMat.opacity = lerp(1, 0, singP);
        photonMat.uniforms.uOpacity.value = lerp(1, 0, singP);
        
        post.mat.uniforms.uRgb.value = lerp(0.09, 0, easeOutCubic(p));
        post.mat.uniforms.uNoise.value = lerp(0.8, 0, easeOutCubic(p));
        post.mat.uniforms.uTime.value = totalElapsed;

        if (scanlinesRef.current)
          scanlinesRef.current.style.opacity = p < 0.3 ? String(lerp(0.55, 0, p / 0.3)) : "0";

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

        if (p < 0.5) {
          overlayOpacity = easeInCubic(p * 2); 
        } else {
          overlayOpacity = easeOutCubic(1 - (p - 0.5) * 2); 
        }
        if (overlayRef.current) overlayRef.current.style.opacity = String(overlayOpacity);

        post.mat.uniforms.uRgb.value = 0;
        post.mat.uniforms.uNoise.value = 0;
        post.mat.uniforms.uTime.value = totalElapsed;

        if (p >= 1) {
          phase = PHASE.DONE;
        }
      } else if (phase === PHASE.DONE) {
        cancelAnimationFrame(raf);
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
      <div ref={containerRef} className="crystal-overlay" />
      <div ref={scanlinesRef} className="crystal-scanlines" />
      <div ref={overlayRef} className="crystal-blackout" />
    </>
  );
}
