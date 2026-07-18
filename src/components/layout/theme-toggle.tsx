"use client";
// theme-toggle.tsx — src/components/layout/theme-toggle.tsx — 2026-07-18
// Toggle rápido claro↔oscuro en el header. El selector de tema completo vive en /preferencias.

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { isDark, toggleMode } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleMode}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="w-9 h-9 rounded-[9px] border border-transparent grid place-items-center text-(--zaire-text-muted) hover:text-(--zaire-text) hover:bg-(--hover) hover:border-(--zaire-border) transition-colors duration-140"
    >
      {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
    </button>
  );
}
