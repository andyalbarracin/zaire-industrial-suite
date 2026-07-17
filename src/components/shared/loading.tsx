// loading.tsx — src/components/shared/loading.tsx — 2026-05-19
// Componente de carga con skeleton

import { Loader2 } from "lucide-react";

export function LoadingSpinner({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-(--zaire-text-muted)">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-9 bg-slate-100 rounded flex-1"
              style={{ flex: j === 0 ? "0 0 140px" : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
