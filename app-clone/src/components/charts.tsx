/** Smooth SVG sparkline with soft area fill, from a numeric series. */
export function Sparkline({
  data,
  color,
  width = 220,
  height = 38,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 4 - ((v - min) / range) * (height - 10);
    return [x, y] as const;
  });
  const path = smoothPath(pts);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={color} opacity={0.1} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** Pipeline Pulse: two cumulative lines with axes and an end value chip. */
export function PulseChart({
  points,
  nowLabel,
}: {
  points: { label: string; thisWeek: number; lastWeek: number }[];
  nowLabel: string;
}) {
  const W = 560;
  const H = 178;
  const PADL = 36;
  const PADR = 8;
  const PADT = 16;
  const PADB = 22;
  const MAX = 1_500_000;
  const x = (i: number) => PADL + (i / (points.length - 1)) * (W - PADL - PADR);
  const y = (v: number) => PADT + (1 - v / MAX) * (H - PADT - PADB);
  const tw = points.map((p, i) => [x(i), y(p.thisWeek)] as const);
  const lw = points.map((p, i) => [x(i), y(p.lastWeek)] as const);
  const endX = x(points.length - 1);
  const endY = y(points[points.length - 1].thisWeek);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      {[0.5, 1.0, 1.5].map((m) => (
        <g key={m}>
          <line x1={PADL} x2={W - PADR} y1={y(m * 1_000_000)} y2={y(m * 1_000_000)} stroke="#eceaf2" strokeWidth={1} />
          <text x={PADL - 7} y={y(m * 1_000_000) + 3.5} textAnchor="end" fontSize={10} fill="#9a9db0">
            {m.toFixed(1)}M
          </text>
        </g>
      ))}
      <path d={smoothPath(lw)} fill="none" stroke="#c3cdf5" strokeWidth={2} strokeLinecap="round" />
      <path d={smoothPath(tw)} fill="none" stroke="#2b6bf0" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={endX} cy={endY} r={4} fill="#2b6bf0" stroke="#fff" strokeWidth={2} />
      <g transform={`translate(${endX - 56}, ${endY - 34})`}>
        <rect width={56} height={21} rx={6} fill="#23233a" />
        <text x={28} y={14.5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#fff">
          {nowLabel}
        </text>
      </g>
      {points.map((p, i) => (
        <text key={p.label} x={x(i)} y={H - 5} textAnchor="middle" fontSize={10.5} fill="#9a9db0">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

/** Segmented donut for Data Health. A null score = never scored (new
 *  workspace): render the muted track only with an honest "—" centre. */
export function Donut({
  score,
  segments,
}: {
  score: number | null;
  segments: { color: string; value: number }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg width={128} height={128} viewBox="0 0 128 128" aria-hidden>
      <circle cx={64} cy={64} r={R} fill="none" stroke="#f0eff5" strokeWidth={13} />
      {segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * C;
        const offset = -acc * C;
        acc += frac;
        return (
          <circle
            key={i}
            cx={64}
            cy={64}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={13}
            strokeDasharray={`${Math.max(0, dash - 3)} ${C - dash + 3}`}
            strokeDashoffset={offset}
            transform="rotate(-90 64 64)"
            strokeLinecap="butt"
          />
        );
      })}
      {score === null ? (
        <text x={64} y={73} textAnchor="middle" fontSize={30} fontWeight={800} fill="#9a9db0">
          —
        </text>
      ) : (
        <>
          <text x={64} y={66} textAnchor="middle" fontSize={30} fontWeight={800} fill="#16161d">
            {score}
          </text>
          <text x={64} y={86} textAnchor="middle" fontSize={12.5} fill="#71748a">
            /100
          </text>
        </>
      )}
    </svg>
  );
}
