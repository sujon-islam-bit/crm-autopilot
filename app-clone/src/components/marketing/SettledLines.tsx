"use client";

import { useEffect, useRef } from "react";

/**
 * "Settled Lines" — the hero's generative art (Algorithmic Art skill).
 * Thousands of thin strokes begin scattered, like facts buried across inboxes,
 * calendars and call notes; a slow flow field turns each one until it aligns
 * into calm, near-parallel lines — the moment a person approves.
 * Canvas 2D, fixed seed (same art every load), pauses off-screen, fewer
 * strokes on small screens, one still frame under prefers-reduced-motion.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Stroke = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  kind: number; // 0 pale, 1 violet, 2 pink thread segment
};

export default function SettledLines({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = mulberry32(20261128);
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    let visible = true;
    let strokes: Stroke[] = [];
    let t = 0;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

    const field = (x: number, y: number, time: number) => {
      // Gentle analytic flow field: mostly horizontal, slow waves.
      const a =
        Math.sin(x * 0.0016 + time * 0.00016) * 0.55 +
        Math.cos(y * 0.0021 - time * 0.00011) * 0.45 +
        Math.sin((x + y) * 0.0007 + time * 0.00007) * 0.3;
      return a * 0.62; // radians of deviation from horizontal — calm, settled
    };

    const spawn = (anywhere = false): Stroke => ({
      x: rand() * w,
      y: rand() * h,
      life: anywhere ? rand() * 240 : 0,
      maxLife: 160 + rand() * 220,
      kind: rand() < 0.06 ? 1 : 0,
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const density = w < 640 ? 0.16 : 0.34; // strokes per 1000 px², calmer on phones
      const count = Math.round(((w * h) / 1000) * density);
      strokes = Array.from({ length: count }, () => spawn(true));
      if (reduced) drawStill();
    };

    const step = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      for (let i = 0; i < strokes.length; i++) {
        const s = strokes[i];
        const ang = field(s.x, s.y, t);
        const speed = 0.55;
        const nx = s.x + Math.cos(ang) * speed * 6;
        const ny = s.y + Math.sin(ang) * speed * 6;
        const fade = Math.sin((s.life / s.maxLife) * Math.PI); // in/out
        if (s.kind === 1) {
          ctx.strokeStyle = `rgba(108,60,233,${0.34 * fade})`;
          ctx.lineWidth = 1.3;
        } else {
          ctx.strokeStyle = `rgba(96,84,128,${0.16 * fade})`;
          ctx.lineWidth = 1.1;
        }
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        s.x = nx;
        s.y = ny;
        s.life += 1;
        if (s.life > s.maxLife || s.x < -10 || s.x > w + 10 || s.y < -10 || s.y > h + 10) {
          strokes[i] = spawn();
        }
      }
      // One pink thread: a single continuous path riding the field.
      ctx.strokeStyle = "rgba(210,59,114,0.5)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let px = -10;
      let py = h * 0.6 + Math.sin(t * 0.002) * 6;
      ctx.moveTo(px, py);
      for (let x = 0; x <= w + 10; x += 14) {
        const ang = field(x, py, t);
        py += Math.sin(ang) * 2.4;
        ctx.lineTo(x, py);
      }
      ctx.stroke();
    };

    const drawStill = () => {
      // Reduced motion: render a single settled frame and stop.
      for (let k = 0; k < 90; k++) step();
    };

    const loop = () => {
      if (running && visible && !document.hidden) step();
      raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.02 }
    );
    io.observe(canvas);

    if (reduced) {
      drawStill();
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
