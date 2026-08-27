// registry.ts — src/lib/integration/registry.ts — 2026-08-27
// Devuelve el adaptador según INTEGRATION_PROVIDER. Único archivo a tocar para sumar
// una plataforma nueva (Tango, etc.): un `case` más apuntando a `./adapters/<x>`.
//
// El import es DINÁMICO a propósito: con el flag apagado (o con otro proveedor
// configurado) el módulo del adaptador no se evalúa nunca. Es lo que garantiza que en
// un deploy sin integración no se ejecute una sola línea de código de Odoo.

import { getIntegrationConfig, isIntegrationEnabled } from "./config";
import type { ConnectorAdapter } from "./types";

export async function getAdapter(): Promise<ConnectorAdapter> {
  if (!isIntegrationEnabled()) {
    throw new Error("La capa de integración está deshabilitada (INTEGRATION_ENABLED)");
  }

  const { provider } = getIntegrationConfig();

  switch (provider) {
    case "odoo": {
      const { OdooAdapter } = await import("./adapters/odoo");
      return new OdooAdapter();
    }
    default:
      throw new Error(`Proveedor de integración desconocido: "${provider}"`);
  }
}
