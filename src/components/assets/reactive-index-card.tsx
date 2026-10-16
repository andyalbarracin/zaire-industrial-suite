// reactive-index-card.tsx — src/components/assets/reactive-index-card.tsx — 2026-10-15
// El índice reactivo, con 10 puntos: cuántas de cada 10 intervenciones fueron apagar un incendio.
//
// Por qué sale de la fila de KPI y viene acá: los otros cuatro (MTBF, MTBR, MTTR, disponibilidad)
// describen cómo se comporta el EQUIPO. Este describe cómo lo estamos MANTENIENDO: es un espejo
// de la gestión, no del fierro. Por eso vive al lado de "Por qué" y "Qué hacer", que es la parte
// de la ficha donde se decide. De paso llena la columna que quedaba vacía.
//
// Por qué 10 puntos y no otro anillo: la frase ya dice "5 de cada 10", y diez puntos es
// exactamente eso, visto de un saque. Un gráfico de proporción con texto al lado se lee mejor que
// un porcentaje suelto, y no depende del color: el número está escrito igual.

import { InfoTooltip } from "@/components/shared/info-tooltip";
import { cn } from "@/lib/utils";
import type { ReliabilityKpi } from "@/lib/assets/kpi-text";

export function ReactiveIndexCard({ kpi, reactiveIndex }: { kpi: ReliabilityKpi; reactiveIndex: number | null }) {
  const porFalla = reactiveIndex === null ? null : Math.round(reactiveIndex * 10);

  return (
    <div className="zaire-card p-4 flex flex-col">
      <p className="text-xs font-medium text-(--zaire-text-muted) flex items-center gap-1">
        {kpi.sigla}
        <InfoTooltip text={kpi.tooltip} />
      </p>

      {porFalla !== null && (
        <div className="flex gap-1 mt-3" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 flex-1 rounded-full",
                i < porFalla ? "bg-(--danger)" : "bg-(--skeleton)",
              )}
            />
          ))}
        </div>
      )}

      <p className="text-sm font-semibold text-(--zaire-text) leading-snug mt-3">{kpi.value}</p>
      {porFalla !== null && (
        <p className="text-[11px] text-(--zaire-text-muted) mt-1">
          {porFalla >= 7
            ? "Mantenimiento casi todo reactivo: se trabaja cuando ya se rompió."
            : porFalla <= 2
              ? "Mantenimiento mayormente planificado."
              : "Mezcla de trabajo planificado y correctivo."}
        </p>
      )}
    </div>
  );
}
