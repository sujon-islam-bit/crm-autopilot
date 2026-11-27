"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { journeyProgress } from "./progress";

/**
 * The one persistent Three.js world behind the homepage journey.
 *
 * A single particle field (~9k points desktop, ~3.4k phone) whose positions
 * morph between authored shapes as the visitor scrolls — the scroll progress
 * (0..1, written by JourneyProgress) is the only conductor, so the same
 * scroll position always recreates the same frame, forward or backward:
 *
 *   swirl (hero) → chaos (the mess) → proposal card (the proposal/approval)
 *   → health ring (cleanup) → swirl, far (ledger) → parallel lines (arrival)
 *
 * Colours are light only — pink #D23B72, warm ivory, deep violet tints.
 * No blue exists in this file. Reduced motion renders one still frame of the
 * settled lines; no-WebGL falls back to a styled static sky.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TARGET_NAMES = ["swirl", "chaos", "card", "ring", "lines"] as const;
type TargetName = (typeof TARGET_NAMES)[number];

/** keyframes: [progress, target, cameraZ] */
const KEYS: [number, TargetName, number][] = [
  [0.0, "swirl", 30],
  [0.09, "swirl", 31],
  [0.16, "chaos", 34],
  [0.24, "card", 27],
  [0.36, "card", 21.5],
  [0.5, "card", 23.5],
  [0.6, "ring", 26],
  [0.68, "ring", 27],
  [0.78, "swirl", 33],
  [0.9, "lines", 30],
  [1.0, "lines", 30],
];

function buildTargets(count: number): Record<TargetName, Float32Array> {
  const rng = mulberry32(1407);
  const swirl = new Float32Array(count * 3);
  const chaos = new Float32Array(count * 3);
  const card = new Float32Array(count * 3);
  const ring = new Float32Array(count * 3);
  const lines = new Float32Array(count * 3);

  const CW = 13.5; // card width
  const CH = 8.6; // card height
  const rowsY = [2.7, 1.55, 0.25, -1.05, -2.45];
  const rowsSpan: [number, number][] = [
    [-5.9, 3.2],
    [-5.9, 5.3],
    [-5.9, 1.1],
    [-5.9, 4.5],
    [-5.9, 2.4],
  ];
  const lineRows = 14;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // — swirl: a galaxy disc seen at a shallow angle
    {
      const t = rng();
      const r = 1.6 + Math.pow(t, 0.72) * 14.5;
      const a = t * 4.4 + r * 0.14 + (rng() - 0.5) * 0.4;
      swirl[i3] = Math.cos(a) * r;
      swirl[i3 + 1] = Math.sin(a) * r * 0.6 + (rng() - 0.5) * 1.1;
      swirl[i3 + 2] = (rng() - 0.5) * 2.4;
    }

    // — chaos: a scattered cloud, nothing aligned
    {
      chaos[i3] = (rng() - 0.5) * 37;
      chaos[i3 + 1] = (rng() - 0.5) * 23;
      chaos[i3 + 2] = (rng() - 0.5) * 11 - 1;
    }

    // — card: the outline of a proposal card + its text rows
    {
      const pick = rng();
      if (pick < 0.52) {
        // border, distributed by perimeter
        const per = 2 * (CW + CH);
        let d = rng() * per;
        let x: number, y: number;
        if (d < CW) {
          x = -CW / 2 + d;
          y = CH / 2;
        } else if (d < CW + CH) {
          x = CW / 2;
          y = CH / 2 - (d - CW);
        } else if (d < 2 * CW + CH) {
          x = CW / 2 - (d - CW - CH);
          y = -CH / 2;
        } else {
          x = -CW / 2;
          y = -CH / 2 + (d - 2 * CW - CH);
        }
        card[i3] = x + (rng() - 0.5) * 0.14;
        card[i3 + 1] = y + 0.2 + (rng() - 0.5) * 0.14;
        card[i3 + 2] = (rng() - 0.5) * 0.3;
      } else {
        const row = Math.floor(rng() * rowsY.length);
        const [x0, x1] = rowsSpan[row];
        card[i3] = x0 + rng() * (x1 - x0);
        card[i3 + 1] = rowsY[row] + 0.2 + (rng() - 0.5) * 0.17;
        card[i3 + 2] = (rng() - 0.5) * 0.3;
      }
    }

    // — ring: the health-score ring, a few sparks inside
    {
      if (rng() < 0.8) {
        const a = rng() * Math.PI * 2;
        const r = 6.4 + (rng() - 0.5) * 0.35;
        ring[i3] = Math.cos(a) * r;
        ring[i3 + 1] = Math.sin(a) * r + 0.2;
        ring[i3 + 2] = (rng() - 0.5) * 0.4;
      } else {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 5.2;
        ring[i3] = Math.cos(a) * r;
        ring[i3 + 1] = Math.sin(a) * r + 0.2;
        ring[i3 + 2] = (rng() - 0.5) * 0.6;
      }
    }

    // — lines: calm parallel rows — the settled CRM
    {
      const row = Math.floor(rng() * lineRows);
      lines[i3] = (rng() - 0.5) * 33;
      lines[i3 + 1] = -5.3 + row * (10.6 / (lineRows - 1)) + (rng() - 0.5) * 0.13;
      lines[i3 + 2] = (rng() - 0.5) * 0.5;
    }
  }
  return { swirl, chaos, card, ring, lines };
}

function dotTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.75)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export default function ParticleWorld() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = window as unknown as Record<string, unknown>;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    } catch {
      w.__vouchsoWebgl = false;
      setFailed(true);
      return;
    }
    w.__vouchsoWebgl = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isPhone = window.innerWidth < 768;
    const cores = navigator.hardwareConcurrency ?? 8;
    const count = isPhone ? 3400 : cores <= 4 ? 6000 : 9000;
    const dpr = Math.min(window.devicePixelRatio || 1, isPhone ? 1.5 : 1.75);

    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 30);

    const targets = buildTargets(count);
    const phases = new Float32Array(count);
    {
      const rng = mulberry32(97);
      for (let i = 0; i < count; i++) phases[i] = rng() * Math.PI * 2;
    }

    const positions = new Float32Array(count * 3);
    positions.set(targets.swirl);

    const colors = new Float32Array(count * 3);
    {
      const rng = mulberry32(4242);
      const ivory = new THREE.Color("#f4efe8");
      const pink = new THREE.Color("#d23b72");
      const pinkL = new THREE.Color("#e7548f");
      const violet = new THREE.Color("#6c3ce9");
      const violetD = new THREE.Color("#4a2a9e");
      const tmp = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const r = rng();
        if (r < 0.52) tmp.copy(ivory).multiplyScalar(0.55 + rng() * 0.45);
        else if (r < 0.74) tmp.copy(rng() < 0.5 ? pink : pinkL).multiplyScalar(0.7 + rng() * 0.4);
        else tmp.copy(rng() < 0.5 ? violet : violetD).multiplyScalar(0.75 + rng() * 0.45);
        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const tex = dotTexture();
    const mat = new THREE.PointsMaterial({
      size: 0.17,
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // One deep violet glow behind everything — light, not a surface.
    const glowMat = new THREE.SpriteMaterial({
      map: tex,
      color: new THREE.Color("#3d1e80"),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(56);
    glow.position.z = -14;
    scene.add(glow);

    // A sparse far starfield for depth.
    const starCount = isPhone ? 260 : 520;
    const starPos = new Float32Array(starCount * 3);
    {
      const rng = mulberry32(31);
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (rng() - 0.5) * 90;
        starPos[i * 3 + 1] = (rng() - 0.5) * 55;
        starPos[i * 3 + 2] = -18 - rng() * 22;
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.14,
      map: tex,
      color: new THREE.Color("#8f83ad"),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const renderFrame = (time: number) => {
      const p = THREE.MathUtils.clamp(journeyProgress.value, 0, 1);

      // find keyframe segment
      let k = 0;
      while (k < KEYS.length - 2 && p > KEYS[k + 1][0]) k++;
      const [p0, nameA, camA] = KEYS[k];
      const [p1, nameB, camB] = KEYS[k + 1];
      const local = smooth(THREE.MathUtils.clamp((p - p0) / Math.max(p1 - p0, 0.0001), 0, 1));
      const A = targets[nameA];
      const B = targets[nameB];

      // chaos energy: peaks inside the mess segment
      const chaosAmt =
        smooth(THREE.MathUtils.clamp((p - 0.1) / 0.05, 0, 1)) *
        (1 - smooth(THREE.MathUtils.clamp((p - 0.17) / 0.06, 0, 1)));
      const amp = 0.035 + chaosAmt * 0.55;
      const tt = time * 0.001;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const ph = phases[i];
        arr[i3] = A[i3] + (B[i3] - A[i3]) * local + Math.sin(tt * 1.6 + ph) * amp;
        arr[i3 + 1] = A[i3 + 1] + (B[i3 + 1] - A[i3 + 1]) * local + Math.cos(tt * 1.3 + ph * 1.7) * amp;
        arr[i3 + 2] = A[i3 + 2] + (B[i3 + 2] - A[i3 + 2]) * local + Math.sin(tt * 0.9 + ph * 0.6) * amp * 0.6;
      }
      posAttr.needsUpdate = true;

      // Tilt peaks mid-journey (the card floats in 3D space) and settles back
      // to perfectly level for the parallel lines at the end.
      const tilt = Math.sin(p * Math.PI);
      points.rotation.z = tilt * 0.13 + Math.sin(tt * 0.07) * 0.01;
      points.rotation.y = tilt * 0.12;
      stars.rotation.z = tt * 0.0022;

      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      camera.position.x = mouse.x * 1.7;
      camera.position.y = -mouse.y * 1.0;
      camera.position.z = camA + (camB - camA) * local;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    let raf = 0;
    let frames = 0;
    let fpsTime = performance.now();
    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      renderFrame(time);
      frames++;
      const now = performance.now();
      if (now - fpsTime >= 1000) {
        w.__vouchsoFps = Math.round((frames * 1000) / (now - fpsTime));
        frames = 0;
        fpsTime = now;
      }
    };

    if (reduced) {
      // One still frame: the settled lines, the journey's calm end state.
      journeyProgress.value = Math.max(journeyProgress.value, 0.97);
      renderFrame(1200);
      w.__vouchsoFps = 0;
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      starGeo.dispose();
      starMat.dispose();
      glowMat.dispose();
      tex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  if (failed) {
    return <div className="fallback-sky fixed inset-0 z-0" aria-hidden="true" />;
  }
  return <div ref={mountRef} className="fixed inset-0 z-0" aria-hidden="true" />;
}
