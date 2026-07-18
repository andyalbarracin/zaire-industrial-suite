"use client";
// info-tooltip.tsx — src/components/shared/info-tooltip.tsx — 2026-07-17
// Icono (i) con tooltip explicativo al hover/focus. Patrón para términos que requieren aclaración.
// Sin dependencias: tooltip posicionado con CSS (group-hover), accesible por teclado (focus-within).

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function InfoTooltip({ text, className, tone = "muted" }: { text: string; className?: string; tone?: "muted" | "onDark" }) {
  return (
    <span className={cn("relative inline-flex group/tip align-middle", className)}>
      <span
        role="button"
        tabIndex={0}
        aria-label={text}
        onClick={(e) => e.preventDefault()}
        className={cn(
          "cursor-help focus:outline-none",
          tone === "onDark"
            ? "text-white/70 hover:text-white focus-visible:text-white"
            : "text-(--zaire-text-muted) hover:text-zaire-blue focus-visible:text-zaire-blue"
        )}
      >
        <Info className="w-3.5 h-3.5" />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 w-max max-w-56 rounded-lg bg-zaire-navy text-white text-xs font-normal leading-snug px-2.5 py-1.5 shadow-lg opacity-0 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 transition-opacity duration-150 z-50 whitespace-normal text-left normal-case tracking-normal"
      >
        {text}
      </span>
    </span>
  );
}
