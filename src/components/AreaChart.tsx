/* ============================================================
   Cantila Console — lightweight SVG charts
   Pure / deterministic — no chart library, no client JS.
   Callers pass a unique `id` so gradient defs never collide.
   ============================================================ */

import { cx } from "./ui";

type Tone = "ember" | "live" | "info" | "violet" | "warn" | "down";

const TONE_HEX: Record<Tone, string> = {
  ember: "#ff6a3d",
  live: "#3ddc84",
  info: "#6aa3ff",
  violet: "#a78bfa",
  warn: "#f6b352",
  down: "#ff5d6e",
};

/* build a smooth path through the points */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const n = pts[i + 1];
    const mx = (p.x + n.x) / 2;
    d += ` Q ${p.x} ${p.y} ${mx} ${(p.y + n.y) / 2}`;
    d += ` T ${n.x} ${n.y}`;
  }
  return d;
}

export function AreaChart({
  data,
  id,
  tone = "ember",
  height = 96,
  className,
}: {
  data: number[];
  id: string;
  tone?: Tone;
  height?: number;
  className?: string;
}) {
  const W = 320;
  const H = height;
  const pad = 6;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / span) * (H - pad * 2),
  }));

  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  const hex = TONE_HEX[tone];
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cx("w-full", className)}
      style={{ height }}
    >
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="0.32" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#fill-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={hex}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r="3.4" fill={hex} />
      <circle cx={last.x} cy={last.y} r="3.4" fill={hex} opacity="0.35">
        <animate
          attributeName="r"
          values="3.4;8;3.4"
          dur="2.4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.35;0;0.35"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

/* tiny inline sparkline — no fill, no axes */
export function Sparkline({
  data,
  tone = "ember",
  width = 96,
  height = 28,
}: {
  data: number[];
  tone?: Tone;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: 2 + (1 - (v - min) / span) * (height - 4),
  }));
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <path
        d={smoothPath(pts)}
        fill="none"
        stroke={TONE_HEX[tone]}
        strokeWidth="1.75"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* horizontal bar gauge — used for fleet / usage */
export function BarGauge({
  value,
  tone = "ember",
}: {
  value: number;
  tone?: Tone;
}) {
  const hex = TONE_HEX[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(2, Math.min(100, value))}%`,
          background: hex,
        }}
      />
    </div>
  );
}
