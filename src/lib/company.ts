// company.ts — src/lib/company.ts — 2026-09-26
// Datos de empresa para los documentos de auditoría de Trace: una sola fuente (company_settings).

import { createClient } from "@/lib/supabase/server";

/** Datos de la empresa emisora que se imprimen en el encabezado y el pie de un documento. */
export interface CompanyInfo {
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
}

// Fallback NEUTRO. Nunca datos de una empresa plausible: si la configuración no se pudo leer, el
// documento tiene que verse sin configurar, no parecer el de otra empresa (ver api/company-public).
const FALLBACK: CompanyInfo = {
  nombre: "Empresa sin configurar",
  cuit: null, direccion: null, ciudad: null, telefono: null, email: null,
};

// Valores del seed/demo. Si la configuración sigue en estos, los informes avisan que hay que
// completarla (ver isCompanyConfigured). Mismos valores que EMPRESA_INFO en lib/constants.ts.
const DEMO_NOMBRE = "empresa demo s.a.";
const DEMO_CUIT = "30-00000000-0";
const DEMO_EMAIL = "demo@empresa.com";

/**
 * Lee los datos de empresa de `company_settings` (fila única id=1), la misma fuente que ya usan
 * los PDF de OT/OTS y de reparación. No incluye el logo: los informes de auditoría no lo imprimen.
 */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("company_settings")
    .select("nombre, cuit, direccion, ciudad, telefono, email")
    .eq("id", 1)
    .maybeSingle();

  if (!data?.nombre) return FALLBACK;
  return {
    nombre: data.nombre,
    cuit: data.cuit ?? null,
    direccion: data.direccion ?? null,
    ciudad: data.ciudad ?? null,
    telefono: data.telefono ?? null,
    email: data.email ?? null,
  };
}

/** `false` si la empresa no se configuró nunca o si sigue con los valores de demostración. */
export function isCompanyConfigured(info: CompanyInfo): boolean {
  const nombre = info.nombre.trim().toLowerCase();
  if (!nombre || nombre === FALLBACK.nombre.toLowerCase()) return false;
  return nombre !== DEMO_NOMBRE && info.cuit !== DEMO_CUIT && info.email !== DEMO_EMAIL;
}
