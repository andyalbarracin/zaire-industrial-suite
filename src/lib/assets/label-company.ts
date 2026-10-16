// label-company.ts — src/lib/assets/label-company.ts — 2026-10-15
// Los datos de empresa que salen impresos en la etiqueta QR de un equipo. Solo para eso.
//
// ⚠️ DUPLICACIÓN DELIBERADA. `src/lib/company.ts` ya hace algo parecido para los PDF de Trace, y
// dice ser "una sola fuente". Esto NO lo reemplaza ni lo modifica: es una copia acotada, a pedido,
// para que un cambio en la etiqueta de Assets no pueda tocar los documentos de Trace, que son los
// que ve el cliente en producción.
//
// Lo que se duplica son los valores que marcan una configuración que NO es real (la fila sin
// configurar y los del seed de demostración). Si alguna vez cambian en `lib/company.ts`, hay que
// cambiarlos acá también — por eso están juntos y señalados, y no desparramados.
//
// Qué NO se duplicó: el logo. La etiqueta no lo imprime.

import { createClient } from "@/lib/supabase/server";

/** Lo único que la etiqueta necesita saber de la empresa. */
export interface LabelCompany {
  nombre: string;
  telefono: string | null;
  web: string | null;
}

// —— Copia de los centinelas de `lib/company.ts`. Ver la advertencia de arriba. ——
const SIN_CONFIGURAR = "empresa sin configurar";
const DEMO_NOMBRE = "empresa demo s.a.";
const DEMO_CUIT = "30-00000000-0";
const DEMO_EMAIL = "demo@empresa.com";

/**
 * Datos de empresa para la etiqueta, **o `null`**.
 *
 * `null` significa "no hay nada que imprimir", y la etiqueta no debe dibujar NADA en su lugar: ni
 * placeholder, ni recuadro vacío, ni el nombre de una empresa de ejemplo. Un sticker pegado a una
 * bomba con el nombre de otra empresa es peor que un sticker sin nombre.
 *
 * El teléfono y la web pueden venir vacíos: se imprime lo que haya.
 */
export async function getLabelCompany(): Promise<LabelCompany | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("company_settings")
    .select("nombre, cuit, email, telefono, web")
    .eq("id", 1)
    .maybeSingle();

  const nombre = (data?.nombre ?? "").trim();
  if (!nombre) return null;

  // Configuración que no es real: la fila por defecto o los valores del seed.
  // Alcanza con que UNO de los tres siga en demo, igual que `isCompanyConfigured()`. Si alguien
  // cambió el nombre pero dejó el mail de ejemplo, la configuración todavía no es de nadie.
  const n = nombre.toLowerCase();
  if (n === SIN_CONFIGURAR) return null;
  if (n === DEMO_NOMBRE || data.cuit === DEMO_CUIT || data.email === DEMO_EMAIL) return null;

  return {
    nombre,
    telefono: data.telefono?.trim() || null,
    web: data.web?.trim() || null,
  };
}
