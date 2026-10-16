// reliability-kpis.tsx — src/components/assets/reliability-kpis.tsx — 2026-10-15
// Los KPI de confiabilidad del equipo, en lenguaje de taller (§7.1).
//
// Componente "tonto" a propósito: todo el texto lo arma `lib/assets/kpi-text.ts`, que es puro y
// testeado. Acá solo se decide cómo se ve.
//
// Jerarquía de cada card: la FRASE es el protagonista; la sigla va chica con tooltip, para quien
// la conozca; la fuente del dato va en gris abajo, y es lo que vuelve discutible el número.

import { InfoTooltip } from "@/components/shared/info-tooltip";
import type { ReliabilityKpi } from "@/lib/assets/kpi-text";

export function ReliabilityKpis({ kpis }: { kpis: ReliabilityKpi[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <div key={k.sigla} className="zaire-card p-3.5 flex flex-col gap-1">
          <p className="text-[11px] font-medium text-(--zaire-text-muted) flex items-center gap-1">
            {k.sigla}
            <InfoTooltip text={k.tooltip} />
          </p>
          <p className="text-sm font-semibold text-(--zaire-text) leading-snug">{k.value}</p>
          {k.source && <p className="text-[10.5px] text-(--zaire-text-muted) leading-tight">{k.source}</p>}
          {k.hint && <p className="text-[10.5px] text-zaire-blue leading-tight">{k.hint}</p>}
        </div>
      ))}
    </div>
  );
}
