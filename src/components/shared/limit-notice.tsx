// limit-notice.tsx — src/components/shared/limit-notice.tsx — 2026-07-16
// Aviso cuando una tabla alcanzó el límite de carga (los registros se cargan hasta un tope
// preventivo; si se llega al tope puede haber más sin mostrar). Evita el truncado silencioso.

import { AlertCircle } from "lucide-react";

export function LimitNotice({ count, limit }: { count: number; limit: number }) {
  if (count < limit) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 text-xs text-amber-800 dark:text-amber-200">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>
        Mostrando los primeros <strong>{limit}</strong> registros (límite de carga). Puede haber más:
        refiná con los filtros o la búsqueda para acotar el resultado.
      </span>
    </div>
  );
}
