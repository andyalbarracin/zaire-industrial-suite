"use client";
// reliability-map.tsx — src/components/assets/reliability-map.tsx — 2026-10-22
// El Mapa de confiabilidad (§7.4): cuatro cuadrantes, un punto por equipo.
//
// Todo el cálculo vive en `lib/assets/reliability-map.ts` (puro, testeado). Acá solo se dibuja.
//
// ORIENTACIÓN — elegida para que el peor caso caiga donde la vista va primero (arriba a la
// derecha). El eje X está **invertido** a propósito: el dato es el ratio MTBF/referencia, donde
// MÁS es mejor, pero en pantalla queremos "falla más" hacia la derecha, que es como se lee.
//
// Los cuadrantes van rotulados DENTRO del gráfico. Un scatter sin rótulos obliga a cruzar la
// leyenda con la posición mentalmente, y entonces ya no se entiende "en 5 segundos".

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, ReferenceArea, ReferenceLine,
  Tooltip, ResponsiveContainer, Cell, Label,
} from "recharts";
import Link from "next/link";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { ROUTES } from "@/lib/routes";
import { QUADRANTS, type QuadrantId, type ReliabilityMap } from "@/lib/assets/reliability-map";

/** Fondo de cada cuadrante y color del punto. Suave en el fondo, sólido en el punto. */
const Q_COLOR: Record<QuadrantId, { fill: string; dot: string }> = {
  bajo_control: { fill: "var(--success)", dot: "var(--success)" },
  plan_insuficiente: { fill: "var(--warning)", dot: "var(--warning)" },
  sin_plan: { fill: "#EA7C1F", dot: "#EA7C1F" },
  apagando_incendios: { fill: "var(--danger)", dot: "var(--danger)" },
};

interface TooltipPayload {
  payload: { label: string; x: number; y: number; quadrant: QuadrantId; criticidad: number };
}

function MapTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const veces = p.x >= 1 ? p.x : 1 / p.x;
  return (
    <div className="zaire-card p-3 text-xs shadow-lg max-w-64">
      <p className="font-semibold text-(--zaire-text)">{p.label}</p>
      <p className="text-(--zaire-text-muted) mt-1">
        {p.x >= 1
          ? `Aguanta ${veces.toFixed(1)}× lo esperado`
          : `Falla ${veces.toFixed(1)}× más seguido de lo esperado`}
      </p>
      <p className="text-(--zaire-text-muted)">
        {Math.round(p.y * 10)} de cada 10 intervenciones fueron por falla
      </p>
      <p className="text-(--zaire-text-muted)">Criticidad {p.criticidad}</p>
      <p className="mt-1.5 font-medium text-(--zaire-text)">{QUADRANTS[p.quadrant].label}</p>
    </div>
  );
}

export function ReliabilityMapChart({ map }: { map: ReliabilityMap }) {
  const { ratioCorte: rc, reactivoCorte: yc, ratioMax: rmax } = map;

  // Esquinas de cada cuadrante en coordenadas del dato. Con el eje X invertido, "x menor" queda
  // a la derecha de la pantalla.
  const areas: { q: QuadrantId; x1: number; x2: number; y1: number; y2: number }[] = [
    { q: "bajo_control", x1: rc, x2: rmax, y1: 0, y2: yc },
    { q: "sin_plan", x1: rc, x2: rmax, y1: yc, y2: 1 },
    { q: "plan_insuficiente", x1: 0, x2: rc, y1: 0, y2: yc },
    { q: "apagando_incendios", x1: 0, x2: rc, y1: yc, y2: 1 },
  ];

  if (map.points.length === 0) {
    return (
      <div className="zaire-card p-5">
        <Encabezado />
        <div className="h-48 grid place-items-center text-center px-6">
          <div>
            <p className="text-sm text-(--zaire-text-muted)">
              Todavía no hay ningún equipo que se pueda ubicar en el mapa.
            </p>
            <p className="text-xs text-(--zaire-text-muted) mt-1.5">
              Hace falta que un equipo tenga al menos una falla registrada y una referencia con la
              cual compararse. Se va llenando solo a medida que se carga la hoja de vida.
            </p>
          </div>
        </div>
        <SinUbicar map={map} />
      </div>
    );
  }

  return (
    <div className="zaire-card p-5">
      <Encabezado />

      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 8 }}>
          {areas.map((a) => (
            <ReferenceArea
              key={a.q} x1={a.x1} x2={a.x2} y1={a.y1} y2={a.y2}
              fill={Q_COLOR[a.q].fill} fillOpacity={0.07} stroke="none" ifOverflow="visible"
            >
              <Label value={QUADRANTS[a.q].label} position="insideTopLeft"
                     style={{ fill: "var(--zaire-text-muted)", fontSize: 10.5, fontWeight: 600 }} />
            </ReferenceArea>
          ))}

          <ReferenceLine x={rc} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <ReferenceLine y={yc} stroke="var(--chart-grid)" strokeDasharray="3 3" />

          {/* `reversed`: el dato es MTBF/referencia (más = mejor), pero en pantalla "falla más"
              tiene que ir a la derecha. */}
          <XAxis
            type="number" dataKey="x" domain={[0, rmax]} reversed
            ticks={[0, rc, rmax]}
            tickFormatter={(v: number) => (v === rc ? "lo esperado" : v === 0 ? "falla más" : "falla menos")}
            tick={{ fontSize: 10.5, fill: "var(--zaire-text-muted)" }}
            stroke="var(--chart-grid)"
          />
          <YAxis
            type="number" dataKey="y" domain={[0, 1]} ticks={[0, yc, 1]}
            tickFormatter={(v: number) => (v === 0 ? "planificado" : v === 1 ? "reactivo" : "mitad")}
            tick={{ fontSize: 10.5, fill: "var(--zaire-text-muted)" }}
            stroke="var(--chart-grid)" width={72}
          />
          <ZAxis type="number" dataKey="size" range={[60, 320]} />
          <Tooltip content={<MapTooltip />} cursor={{ strokeDasharray: "3 3" }} />

          <Scatter data={map.points} isAnimationActive={false}>
            {map.points.map((p) => (
              <Cell key={p.id} fill={Q_COLOR[p.quadrant].dot} fillOpacity={0.75} stroke={Q_COLOR[p.quadrant].dot} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Qué hacer con cada cuadrante. El mapa ubica; esto dice qué significa estar ahí. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 mt-4 pt-4 border-t border-(--zaire-border)">
        {(Object.keys(QUADRANTS) as QuadrantId[]).map((q) => {
          const n = map.points.filter((p) => p.quadrant === q).length;
          return (
            <div key={q} className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: Q_COLOR[q].dot }} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-(--zaire-text)">
                  {QUADRANTS[q].label}
                  <span className="text-(--zaire-text-muted) font-normal"> · {n} equipo{n === 1 ? "" : "s"}</span>
                </p>
                <p className="text-[11px] text-(--zaire-text-muted) leading-snug">{QUADRANTS[q].hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      <SinUbicar map={map} />
    </div>
  );
}

function Encabezado() {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <h3 className="text-sm font-semibold text-(--zaire-text)">Mapa de confiabilidad</h3>
      <InfoTooltip text="Cada punto es un equipo. A la derecha, los que fallan más seguido de lo esperado para ellos; arriba, los que se atienden solo cuando ya fallaron. El tamaño del punto es la criticidad." />
    </div>
  );
}

/**
 * Los equipos que no entraron al mapa, con el motivo.
 *
 * Al principio van a ser mayoría. Un mapa con tres puntos y sin explicación parece un mapa roto;
 * con esta línea, se entiende que el sistema no sabe todavía y por qué.
 */
function SinUbicar({ map }: { map: ReliabilityMap }) {
  if (map.excluded.length === 0) return null;
  const n = map.excluded.length;
  return (
    <details className="mt-3 group">
      <summary className="text-[11px] text-(--zaire-text-muted) cursor-pointer hover:text-(--zaire-text) list-none">
        {n} equipo{n === 1 ? "" : "s"} todavía no se {n === 1 ? "puede" : "pueden"} ubicar en el mapa
        <span className="text-zaire-blue"> · ver por qué</span>
      </summary>
      <ul className="mt-2 space-y-1">
        {map.excluded.map((e) => (
          <li key={e.id} className="text-[11px] text-(--zaire-text-muted)">
            <Link href={ROUTES.assets.equipo(e.id)} className="hover:text-zaire-blue hover:underline">
              {e.text}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
