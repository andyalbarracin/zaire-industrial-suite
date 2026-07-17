"use client";
// filter-bar.tsx — src/components/field/filter-bar.tsx — 2026-07-13
// Barra de filtros unificada para las tablas de Zaire Field: grupos etiquetados con
// separadores tenues, pills consistentes y botón "Limpiar filtros".

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterGroup {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Clase extra para las pills seleccionadas de este grupo (opcional) */
  activeClass?: string;
}

interface FilterBarProps {
  groups: FilterGroup[];
  onClear: () => void;
}

export function FilterBar({ groups, onClear }: FilterBarProps) {
  const hasActive = groups.some((g) => g.selected.length > 0);

  return (
    <div className="px-4 py-2.5 border-b border-(--zaire-border) flex flex-wrap items-center gap-x-3 gap-y-2">
      {groups.map((g, i) => (
        <div key={g.key} className="flex items-center gap-1.5">
          {i > 0 && <span className="w-px h-5 bg-(--zaire-border) mr-2" />}
          <span className="text-[11px] font-semibold text-(--zaire-text-muted) uppercase tracking-wide mr-0.5">{g.label}</span>
          {g.options.map((o) => {
            const active = g.selected.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => g.onToggle(o.value)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  active
                    ? g.activeClass ?? "bg-zaire-navy text-white border-zaire-navy"
                    : "bg-white text-(--zaire-text-muted) border-(--zaire-border) hover:bg-slate-50"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ))}

      {hasActive && (
        <button
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-zaire-blue hover:underline"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
        </button>
      )}
    </div>
  );
}
