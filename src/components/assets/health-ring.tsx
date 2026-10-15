// health-ring.tsx — src/components/assets/health-ring.tsx — 2026-10-15
// Anillo de salud del equipo. SVG inline, sin librería.
//
// Por qué SVG propio y no `RadialBarChart` de recharts: para UN valor, recharts trae
// ResponsiveContainer + tooltip + animación para dibujar un arco, y pelea con los tokens del
// tema. Son dos <circle> con strokeDasharray. Molde del `ProgressRing` de zaire-mobile, así
// que el anillo se ve igual en la app y en el celular.
//
// El anillo NUNCA va solo: el número vive en el centro y la banda/confianza debajo. Es refuerzo
// visual del dato, no el dato.

import { cn } from "@/lib/utils";
import type { TrafficLight } from "@/lib/utils";

/** El color del arco sale de los mismos tokens que el resto del semáforo de la suite. */
const ARC: Record<TrafficLight, string> = {
  green: "var(--success)",
  yellow: "var(--warning)",
  orange: "#EA7C1F",
  red: "var(--danger)",
};

export function HealthRing({
  score,
  light,
  size = 92,
  stroke = 9,
  className,
}: {
  /** 0-100. `null` = fuera de servicio: el anillo se dibuja solo como track. */
  score: number | null;
  light: TrafficLight | null;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = size / 2 - stroke / 2 - 1;
  const circ = 2 * Math.PI * r;
  const progress = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const offset = circ * (1 - progress);
  const c = size / 2;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} stroke="var(--skeleton)" />
        {score !== null && light && (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            strokeWidth={stroke}
            stroke={ARC[light]}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {score !== null ? (
          <span className="text-2xl font-bold tabular-nums text-(--zaire-text)">{score}</span>
        ) : (
          <span className="text-[10px] font-medium text-(--zaire-text-muted) text-center leading-tight px-2">
            Fuera de
            <br />
            servicio
          </span>
        )}
      </div>
    </div>
  );
}
