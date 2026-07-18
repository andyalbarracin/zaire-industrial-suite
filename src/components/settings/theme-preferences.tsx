"use client";
// theme-preferences.tsx — src/components/settings/theme-preferences.tsx — 2026-07-18
// Selector de tema (bronce/azul/bordó) + modo (claro/oscuro/sistema). Preferencia por usuario/dispositivo.

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, THEME_OPTIONS, MODE_OPTIONS, type ThemeMode } from "@/lib/theme";

const MODE_ICON: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemePreferences() {
  const { theme, mode, setTheme, setMode } = useTheme();

  return (
    <div className="space-y-8">
      {/* Tema de color */}
      <section>
        <h3 className="text-sm font-semibold text-(--zaire-text)">Tema de color</h3>
        <p className="text-xs text-(--zaire-text-muted) mt-0.5">Elegí la paleta de la interfaz.</p>
        <div className="grid grid-cols-3 gap-3 mt-4 max-w-md">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition-all duration-150",
                theme === t.id ? "border-brand ring-2 ring-brand/30" : "border-(--zaire-border) hover:border-(--faint)"
              )}
            >
              <span
                className="block w-full h-10 rounded-lg mb-2"
                style={{ background: `linear-gradient(135deg, ${t.swatch}, color-mix(in srgb, ${t.swatch} 45%, #000))` }}
              />
              <span className="text-xs font-medium text-(--zaire-text)">{t.label}</span>
              {theme === t.id && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand text-white grid place-items-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Modo claro / oscuro / sistema */}
      <section>
        <h3 className="text-sm font-semibold text-(--zaire-text)">Modo</h3>
        <p className="text-xs text-(--zaire-text-muted) mt-0.5">Claro, oscuro o según tu sistema operativo.</p>
        <div className="inline-flex rounded-lg border border-(--zaire-border) p-1 mt-4 bg-surface-2">
          {MODE_OPTIONS.map((m) => {
            const Icon = MODE_ICON[m.id];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  mode === m.id ? "bg-surface text-(--zaire-text) shadow-sm" : "text-(--zaire-text-muted) hover:text-(--zaire-text)"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
