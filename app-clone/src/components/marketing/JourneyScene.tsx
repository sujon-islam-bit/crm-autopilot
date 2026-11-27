"use client";

import { useEffect, useRef, useState } from "react";
import JourneyStatic from "./JourneyStatic";

/**
 * ★ "One proposal's journey" — the page's single pinned, scrubbed scene
 * (plan §3.9). An email becomes a proposal; a person approves it; it lands
 * in the CRM, logged and reversible. Light Three.js gives the stage shallow
 * depth only — the cards are real HTML. Reduced motion or no WebGL renders
 * the static 4-panel strip instead.
 */

const CAPTIONS = [
  "1 · It starts as an email.",
  "2 · Vouchso drafts the change — with evidence.",
  "3 · A person approves.",
  "4 · Your CRM updates. Logged, and reversible.",
];

const LEDGER = "Applied · Batch #1042 · Reversible for 7 days";

export default function JourneyScene() {
  const [mode, setMode] = useState<"static" | "scene">("static");
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<HTMLCanvasElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const proposalRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const crmRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const ledgerRef = useRef<HTMLParagraphElement>(null);
  const capRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      const c = document.createElement("canvas");
      gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (gl) setMode("scene");
  }, []);

  useEffect(() => {
    if (mode !== "scene") return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { MotionPathPlugin } = await import("gsap/MotionPathPlugin");
      gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
      if (disposed || !pinRef.current || !stageRef.current) return;

      /* ----- Three.js: shallow depth only (drifting planes + dust) ----- */
      let renderer: import("three").WebGLRenderer | undefined;
      let tickFn: (() => void) | undefined;
      const progress = { p: 0 };
      const active = { on: false };
      try {
        const THREE = await import("three");
        const canvas = threeRef.current;
        if (canvas && !disposed) {
          renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(42, 2, 0.1, 100);
          camera.position.set(0, 0, 9);
          const disposables: { dispose: () => void }[] = [];
          // Soft radial-fade texture so the depth planes read as glow, not cards.
          const glowCanvas = document.createElement("canvas");
          glowCanvas.width = 256;
          glowCanvas.height = 256;
          const gtx = glowCanvas.getContext("2d");
          if (gtx) {
            const grad = gtx.createRadialGradient(128, 128, 10, 128, 128, 128);
            grad.addColorStop(0, "rgba(255,255,255,0.9)");
            grad.addColorStop(0.55, "rgba(255,255,255,0.38)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            gtx.fillStyle = grad;
            gtx.fillRect(0, 0, 256, 256);
          }
          const glowTex = new THREE.CanvasTexture(glowCanvas);
          disposables.push(glowTex);
          for (let i = 0; i < 3; i++) {
            const geo = new THREE.PlaneGeometry(23 - i * 2, 12.5 - i);
            const mat = new THREE.MeshBasicMaterial({
              color: 0x6c3ce9,
              map: glowTex,
              transparent: true,
              opacity: 0.16 + i * 0.05,
              depthWrite: false,
            });
            const plane = new THREE.Mesh(geo, mat);
            plane.position.set(-2 + i * 2.2, 0.6 - i * 0.5, -2 - i * 1.7);
            plane.rotation.z = 0.04 * (i - 1);
            scene.add(plane);
            disposables.push(geo, mat);
          }
          const pCount = 130;
          const pos = new Float32Array(pCount * 3);
          for (let i = 0; i < pCount * 3; i++) pos[i] = (Math.random() - 0.5) * (i % 3 === 2 ? 5 : 17);
          const pGeo = new THREE.BufferGeometry();
          pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
          const pMat = new THREE.PointsMaterial({
            color: 0x9a7bff,
            size: 0.055,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          });
          const points = new THREE.Points(pGeo, pMat);
          scene.add(points);
          disposables.push(pGeo, pMat);

          const resize = () => {
            const rect = canvas.getBoundingClientRect();
            renderer?.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
            camera.aspect = Math.max(0.2, rect.width / Math.max(1, rect.height));
            camera.updateProjectionMatrix();
          };
          resize();
          const ro = new ResizeObserver(resize);
          ro.observe(canvas);
          tickFn = () => {
            if (!active.on || disposed) return;
            points.rotation.y += 0.0007;
            camera.position.x = Math.sin(progress.p * Math.PI) * 0.45;
            camera.rotation.y = (progress.p - 0.5) * 0.09;
            renderer?.render(scene, camera);
          };
          gsap.ticker.add(tickFn);
          const prevCleanup = cleanup;
          cleanup = () => {
            prevCleanup?.();
            ro.disconnect();
            if (tickFn) gsap.ticker.remove(tickFn);
            disposables.forEach((d) => d.dispose());
            renderer?.dispose();
          };
        }
      } catch {
        /* WebGL failed after the check — the 2D scene still runs. */
      }

      /* ----- GSAP scrubbed timeline ----- */
      const q = gsap.utils.selector(stageRef);
      const ctx = gsap.context(() => {
        const paths = [path1Ref.current, path2Ref.current].filter(Boolean) as SVGPathElement[];
        paths.forEach((p) => {
          p.style.strokeDasharray = "100";
          p.style.strokeDashoffset = "100";
        });
        gsap.set(emailRef.current, { autoAlpha: 0, x: -56 });
        gsap.set(proposalRef.current, { autoAlpha: 0, scale: 0.92, y: 18 });
        gsap.set(q("[data-prow]"), { autoAlpha: 0, y: 10 });
        gsap.set(stampRef.current, { autoAlpha: 0, scale: 2.3, rotate: -24 });
        gsap.set(fillRef.current, { scaleX: 0 });
        gsap.set(crmRef.current, { autoAlpha: 0, x: 56 });
        gsap.set(q("[data-newval]"), { autoAlpha: 0, y: 8 });
        gsap.set(pulseRef.current, { autoAlpha: 0 });
        gsap.set(ledgerRef.current?.querySelectorAll("[data-ch]") ?? [], { autoAlpha: 0 });
        capRefs.current.forEach((c, i) => {
          if (c && i > 0) gsap.set(c, { autoAlpha: 0 });
        });

        const swapCap = (tl: gsap.core.Timeline, at: number, from: number, to: number) => {
          tl.to(capRefs.current[from], { autoAlpha: 0, duration: 0.3 }, at);
          tl.to(capRefs.current[to], { autoAlpha: 1, duration: 0.3 }, at + 0.1);
        };

        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: pinRef.current,
            start: "top top+=64",
            end: "+=150%",
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              progress.p = self.progress;
            },
            onToggle: (self) => {
              active.on = self.isActive;
            },
          },
        });

        // Beat 1 — the email arrives.
        tl.to(emailRef.current, { autoAlpha: 1, x: 0, duration: 1.1 }, 0);
        // Beat 2 — the pulse carries it; the proposal assembles.
        swapCap(tl, 1.3, 0, 1);
        tl.to(path1Ref.current, { strokeDashoffset: 0, duration: 1.1, ease: "none" }, 1.0);
        tl.to(pulseRef.current, { autoAlpha: 1, duration: 0.15 }, 1.0);
        tl.to(
          pulseRef.current,
          {
            motionPath: { path: path1Ref.current as SVGPathElement, align: path1Ref.current as SVGPathElement, alignOrigin: [0.5, 0.5] },
            duration: 1.1,
            ease: "none",
          },
          1.0
        );
        tl.to(pulseRef.current, { autoAlpha: 0, duration: 0.15 }, 2.05);
        tl.to(proposalRef.current, { autoAlpha: 1, scale: 1, y: 0, duration: 0.8 }, 1.45);
        tl.to(q("[data-prow]"), { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.14 }, 1.75);
        // Beat 3 — the human beat (longest share): the button fills, the stamp lands.
        swapCap(tl, 2.9, 1, 2);
        tl.to(proposalRef.current, { scale: 1.045, duration: 1.3, ease: "power1.inOut" }, 2.8);
        tl.to(fillRef.current, { scaleX: 1, duration: 1.0, ease: "power2.inOut" }, 3.0);
        tl.to(
          stampRef.current,
          { autoAlpha: 1, scale: 1, rotate: -9, duration: 0.55, ease: "power3.in" },
          4.2
        );
        tl.to(proposalRef.current, { scale: 1.02, duration: 0.4 }, 4.8);
        // Beat 4 — it lands in the CRM; values flip; the ledger writes itself.
        swapCap(tl, 5.4, 2, 3);
        tl.to(crmRef.current, { autoAlpha: 1, x: 0, duration: 0.8 }, 5.5);
        tl.to(path2Ref.current, { strokeDashoffset: 0, duration: 1.0, ease: "none" }, 5.3);
        tl.to(pulseRef.current, { autoAlpha: 1, duration: 0.15 }, 5.3);
        tl.to(
          pulseRef.current,
          {
            motionPath: { path: path2Ref.current as SVGPathElement, align: path2Ref.current as SVGPathElement, alignOrigin: [0.5, 0.5] },
            duration: 1.0,
            ease: "none",
          },
          5.3
        );
        tl.to(pulseRef.current, { autoAlpha: 0, duration: 0.15 }, 6.2);
        tl.to(proposalRef.current, { x: 64, y: -8, scale: 0.97, duration: 1.2, ease: "power1.inOut" }, 5.4);
        tl.to(q("[data-oldval]"), { autoAlpha: 0, y: -8, duration: 0.4, stagger: 0.18 }, 7.2);
        tl.to(q("[data-newval]"), { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.18 }, 7.45);
        tl.to(ledgerRef.current?.querySelectorAll("[data-ch]") ?? [], {
          autoAlpha: 1,
          duration: 0.05,
          stagger: 0.028,
        }, 8.3);
        tl.to({}, { duration: 0.9 }); // hold the final state
      }, stageRef);

      const prevCleanup = cleanup;
      cleanup = () => {
        prevCleanup?.();
        ctx.revert();
      };
      ScrollTrigger.refresh();
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [mode]);

  if (mode === "static") return <JourneyStatic />;

  return (
    <div ref={pinRef}>
      <div className="relative mx-auto h-[64px] max-w-[720px] text-center">
        {CAPTIONS.map((c, i) => (
          <span
            key={c}
            ref={(el) => {
              capRefs.current[i] = el;
            }}
            className="absolute inset-x-0 top-0 font-jakarta text-[19px] font-bold text-white md:text-[22px]"
          >
            {c}
          </span>
        ))}
      </div>

      <div ref={stageRef} className="relative mx-auto mt-2 h-[600px] max-w-[1100px] md:h-[500px]">
        <canvas ref={threeRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
        <svg
          className="absolute inset-0 hidden h-full w-full md:block"
          viewBox="0 0 1100 500"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path ref={path1Ref} d="M262,250 C370,252 390,238 452,232" fill="none" stroke="#6C3CE9" strokeWidth="2.5" pathLength={100} />
          <path ref={path2Ref} d="M652,232 C740,238 762,248 806,250" fill="none" stroke="#6C3CE9" strokeWidth="2.5" pathLength={100} />
        </svg>
        <div
          ref={pulseRef}
          className="absolute top-0 left-0 z-20 hidden h-3.5 w-3.5 rounded-full bg-mkt-pink shadow-[0_0_18px_4px_rgba(210,59,114,0.55)] md:block"
          aria-hidden="true"
        />

        {/* Beat 1 — email */}
        <div ref={emailRef} className="absolute top-[3%] left-[2%] z-10 w-[248px] md:top-1/2 md:-mt-[72px] md:w-[262px]">
          <div className="rounded-2xl bg-white p-4 text-mkt-ink shadow-2xl">
            <p className="flex items-center gap-2 text-[11.5px] font-bold text-mkt-body">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#fdeef4] font-jbmono text-[10px] font-bold text-mkt-pink">G</span>
              Gmail · Sarah Lee, Acme Corp
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed font-medium">
              “We’ll sign once legal clears the MSA — send the proposal over and we’re good this
              week.”
            </p>
            <p className="mt-2 font-jbmono text-[10.5px] text-mkt-body">TUE 9:41 AM · THREAD OF 12</p>
          </div>
        </div>

        {/* Beat 2–3 — proposal + stamp */}
        <div
          ref={proposalRef}
          className="absolute top-[31%] left-1/2 z-10 w-[300px] -ml-[150px] md:top-1/2 md:-mt-[108px] md:w-[330px] md:-ml-[165px]"
        >
          <div className="relative rounded-2xl bg-white p-5 text-mkt-ink shadow-2xl">
            <div data-prow className="flex items-start justify-between gap-3">
              <p className="text-[14.5px] leading-snug font-bold">Acme Corp — move deal to Proposal Sent</p>
              <span className="shrink-0 rounded-md bg-mkt-violet px-2 py-1 font-jbmono text-[12px] font-semibold text-white">96%</span>
            </div>
            <p data-prow className="mt-2.5 font-jbmono text-[11.5px] text-mkt-body">
              STAGE: NEGOTIATION → <span className="font-semibold text-mkt-violet">PROPOSAL SENT</span>
            </p>
            <p data-prow className="mt-1 font-jbmono text-[11.5px] text-mkt-body">EVIDENCE ATTACHED ✓ · SOURCE: SARAH LEE, TUE 9:41 AM</p>
            <div data-prow className="mt-4">
              <span className="relative inline-flex min-h-[40px] items-center overflow-hidden rounded-[10px] bg-mkt-violet px-5 text-[14px] font-semibold text-white">
                <span ref={fillRef} className="absolute inset-0 origin-left bg-mkt-violet-dark" aria-hidden="true" />
                <span className="relative">Approve</span>
              </span>
            </div>
            <span
              ref={stampRef}
              className="absolute right-5 -bottom-3 inline-flex items-center gap-1 rounded-md border-2 border-mkt-green bg-white/90 px-2.5 py-1 text-[13px] font-extrabold tracking-wide text-mkt-green uppercase"
            >
              ✓ Applied
            </span>
          </div>
        </div>

        {/* Beat 4 — CRM rows */}
        <div ref={crmRef} className="absolute right-[2%] bottom-[9%] z-10 w-[272px] md:top-1/2 md:-mt-[88px] md:bottom-auto md:w-[296px]">
          <div className="rounded-2xl bg-white p-4 text-mkt-ink shadow-2xl">
            {[
              { brand: "HubSpot", color: "#FF7A59", field: "Deal stage" },
              { brand: "Salesforce", color: "#00A1E0", field: "Opportunity stage" },
            ].map((row) => (
              <div key={row.brand} className="border-b border-mkt-border py-2.5 first:pt-0 last:border-0 last:pb-0">
                <p className="flex items-center gap-2 text-[12.5px] font-bold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.brand}
                  <span className="font-normal text-mkt-body">· {row.field}</span>
                </p>
                <p className="relative mt-1 h-[20px] font-jbmono text-[12.5px]">
                  <span data-oldval className="absolute left-0 text-mkt-body line-through decoration-mkt-pink/60">
                    Negotiation
                  </span>
                  <span data-newval className="absolute left-0 font-semibold text-mkt-violet">
                    Proposal Sent ✓
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Ledger line */}
        <p
          ref={ledgerRef}
          className="absolute inset-x-0 bottom-0 text-center font-jbmono text-[12px] tracking-wide text-white/75 md:text-[13px]"
          aria-label={LEDGER}
        >
          {LEDGER.split("").map((ch, i) => (
            <span key={i} data-ch aria-hidden="true">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
