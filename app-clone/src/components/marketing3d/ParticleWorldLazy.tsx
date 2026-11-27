"use client";

import dynamic from "next/dynamic";

/** Lazy-loads the Three.js world so the hero text paints before WebGL boots. */
const ParticleWorldLazy = dynamic(() => import("./ParticleWorld"), { ssr: false });

export default ParticleWorldLazy;
