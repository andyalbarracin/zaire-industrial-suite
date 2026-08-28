// config.ts — src/lib/integration/config.ts — 2026-08-27
// Configuración y flag maestro de Zaire Connect (capa de integración con ERP/CRM externos).
//
// ⚠️ OJO — ESTE HELPER ES FAIL-CLOSED, AL REVÉS QUE `lib/modules.ts`.
// El gating de módulos (NEXT_PUBLIC_ENABLED_MODULES) es fail-OPEN: si la variable
// no está, se habilitan TODOS los módulos. Acá eso sería exactamente lo contrario
// de lo que queremos: un cliente que no sabe nada de integraciones (ej. SAS) no
// tiene INTEGRATION_ENABLED en su deploy, y con la semántica fail-open le quedaría
// la integración PRENDIDA. Por eso: solo "true" habilita. Ausente = apagado.
// No "corregir" esto para que se parezca a modules.ts.
//
// Todas las variables son SERVER-SIDE (sin prefijo NEXT_PUBLIC_): ODOO_API_KEY es
// secreta y no puede terminar inlineada en el bundle del browser.

export type IntegrationProvider = "odoo";
export type SyncMode = "import" | "oneway" | "twoway";

/** Flag maestro. Solo INTEGRATION_ENABLED="true" habilita la capa. */
export function isIntegrationEnabled(): boolean {
  return process.env.INTEGRATION_ENABLED?.trim().toLowerCase() === "true";
}

/** Proveedor activo y modo de sincronización. Fase 1: solo odoo + import. */
export function getIntegrationConfig(): { provider: IntegrationProvider; syncMode: SyncMode } {
  const provider = (process.env.INTEGRATION_PROVIDER?.trim().toLowerCase() || "odoo") as IntegrationProvider;
  const syncMode = (process.env.INTEGRATION_SYNC_MODE?.trim().toLowerCase() || "import") as SyncMode;
  return { provider, syncMode };
}

/**
 * URL base del sistema externo, solo para armar links en la UI.
 * A diferencia de getOdooConfig(), no lanza: si no está configurada, no hay link y listo.
 */
export function getExternalBaseUrl(): string | null {
  const url = process.env.ODOO_URL?.trim();
  return url ? url.replace(/\/+$/, "") : null;
}

export interface OdooConfig {
  url: string;
  db: string;
  user: string;
  apiKey: string;
}

/**
 * Credenciales de Odoo. Lanza si falta alguna: preferimos un error explícito y
 * visible en el panel antes que una conexión que falla de forma rara más adelante.
 * (Contrasta a propósito con el fallback silencioso de `lib/supabase/service.ts`.)
 */
export function getOdooConfig(): OdooConfig {
  const url = process.env.ODOO_URL?.trim();
  const db = process.env.ODOO_DB?.trim();
  const user = process.env.ODOO_API_USER?.trim();
  const apiKey = process.env.ODOO_API_KEY?.trim();

  const missing = [
    !url && "ODOO_URL",
    !db && "ODOO_DB",
    !user && "ODOO_API_USER",
    !apiKey && "ODOO_API_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno de Odoo: ${missing.join(", ")}`);
  }

  // Sin barra final: los endpoints se arman como `${url}/jsonrpc`.
  return { url: url!.replace(/\/+$/, ""), db: db!, user: user!, apiKey: apiKey! };
}
