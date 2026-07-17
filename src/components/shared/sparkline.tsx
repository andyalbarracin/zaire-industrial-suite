// sparkline.tsx — src/components/shared/sparkline.tsx
// Mini SVG sparkline para KPI cards: línea + área con gradiente

interface SparklineProps {
  data: number[];
  color: string;
  id: string;
}

export function Sparkline({ data, color, id }: SparklineProps) {
  const w = 96, h = 46;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 6 - ((v - min) / range) * (h - 14);
    return [x, y] as [number, number];
  });

  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${w} ${h} L0 ${h} Z`;
  const gradId = `spark-${id}`;

  return (
    <svg
      className="absolute -right-0.5 -bottom-0.5 w-24 h-11.5 opacity-50 pointer-events-none"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
