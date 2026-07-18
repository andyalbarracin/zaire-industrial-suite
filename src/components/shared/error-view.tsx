"use client";
// error-view.tsx — src/components/shared/error-view.tsx — 2026-07-17
// UI compartida de error boundary. Contiene el fallo en su subtree: el sidebar/header
// (layout del dashboard) siguen vivos, así un error de una sección no tira toda la suite.

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorView({ title = "Algo salió mal", reset }: { title?: string; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7" />
      </span>
      <h2 className="text-lg font-bold text-(--zaire-text)">{title}</h2>
      <p className="text-sm text-(--zaire-text-muted) mt-1 max-w-md">
        Ocurrió un error al cargar esta sección. El resto de la suite sigue disponible.
      </p>
      <Button onClick={reset} className="mt-4 bg-zaire-navy-mid hover:bg-zaire-navy text-white">
        <RotateCcw className="w-4 h-4 mr-1.5" /> Reintentar
      </Button>
    </div>
  );
}
