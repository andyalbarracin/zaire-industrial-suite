// modules.ts — src/lib/modules.ts — 2026-07-16
// Habilitación de módulos por deployment/cliente (base del gating cross-módulo).
// Fuente actual: env NEXT_PUBLIC_ENABLED_MODULES (coma-separado, ej. "trace,field").
//   - Sin configurar / vacío  → TODOS habilitados (comportamiento actual, no rompe nada).
//   - "field"                 → solo Field. "trace" → solo Trace.
// El helper abstrae la fuente: a futuro se puede leer de company_settings.enabled_modules
// sin cambiar los call sites. Funciona en Server y Client (NEXT_PUBLIC_ se inlinea en build).

export type ModuleId = "trace" | "field" | "crm" | "stock" | "assets";

const ALL_MODULES: ModuleId[] = ["trace", "field", "crm", "stock", "assets"];

export function getEnabledModules(): ModuleId[] {
  const raw = process.env.NEXT_PUBLIC_ENABLED_MODULES?.trim();
  if (!raw) return ALL_MODULES;
  const requested = raw.split(",").map((s) => s.trim().toLowerCase());
  const enabled = ALL_MODULES.filter((m) => requested.includes(m));
  // Nunca dejar la suite sin módulos: si la config no matchea ninguno, se asume todos.
  return enabled.length > 0 ? enabled : ALL_MODULES;
}

export function isModuleEnabled(mod: ModuleId): boolean {
  return getEnabledModules().includes(mod);
}
