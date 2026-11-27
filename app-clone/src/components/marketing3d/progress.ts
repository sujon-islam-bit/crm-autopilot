/**
 * Shared scroll-progress store for the homepage 3D journey.
 * JourneyProgress (a ScrollTrigger) writes 0..1 here; ParticleWorld reads it
 * every frame. A plain mutable object — no React state, no re-renders.
 */
export const journeyProgress = { value: 0 };
