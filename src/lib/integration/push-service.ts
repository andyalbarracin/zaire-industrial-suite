// push-service.ts — src/lib/integration/push-service.ts — 2026-08-28
// Envío de una OT/OTS al sistema externo (Zaire → Odoo).
//
// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  REGLA INNEGOCIABLE: UNA OT NUNCA PUEDE GENERAR DOS REGISTROS EN EL ERP.  ║
// ║  Duplicar una OT es plata duplicada en el sistema del cliente.            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝
//
// Hay CUATRO defensas, y son independientes entre sí a propósito: si una falla por
// un bug, las otras siguen en pie.
//
//   1. ÍNDICE ÚNICO EN LA BASE — zc_external_ids_work_order_uniq sobre
//      (provider, entity, id_zaire) para entity='work_order'. Es la única defensa
//      que no depende de que el código haga las cosas bien. Dos clicks simultáneos:
//      Postgres deja pasar una inserción y rechaza la otra.
//
//   2. RESERVAR ANTES DE ESCRIBIR — primero se inserta una fila "pending" en Zaire y
//      recién después se llama al ERP. Al revés (llamar y después guardar) hay una
//      ventana en la que un corte de red deja el registro creado en el ERP sin que
//      Zaire lo sepa, y el próximo click duplica. Reservando primero, esa ventana
//      no existe.
//
//   3. BÚSQUEDA DEFENSIVA EN EL ERP — antes de crear, el adaptador busca por
//      `referencia` (ej. "Zaire Trace OT-2026-00123"). Si el mapeo local se perdió
//      pero el registro existe en el ERP, se adopta en vez de crear otro.
//
//   4. FALLO CONSERVADOR — si algo queda a medias, el estado "pending" BLOQUEA los
//      envíos siguientes y pide revisión manual. Preferimos un botón trabado y un
//      mensaje claro antes que arriesgar un duplicado.
//
// Reenviar una OT ya enviada NO crea nada: actualiza el registro existente.

import { createClient } from "@/lib/supabase/server";
import { getIntegrationConfig } from "./config";
import { getAdapter } from "./registry";
import type { CanonicalWorkOrder, PushResult } from "./types";

/** Marca provisional que ocupa el lugar mientras se habla con el ERP. */
const PENDIENTE = "pending:";

/** Código de violación de unicidad de Postgres. */
const UNIQUE_VIOLATION = "23505";

export interface PushWorkOrderResult {
  ok: boolean;
  external_id?: string;
  created?: boolean;
  adopted?: boolean;
  message: string;
  /** Se envió, pero con una salvedad (ej. el cliente ya no existe en el sistema externo). */
  warning?: string | null;
  /** true si quedó trabado por un envío anterior a medias y necesita revisión humana. */
  needsReview?: boolean;
}

export async function pushWorkOrder(orderId: string): Promise<PushWorkOrderResult> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { provider } = getIntegrationConfig();
  const { data: { user } } = await supabase.auth.getUser();

  const adapter = await getAdapter();
  if (!adapter.pushWorkOrder) {
    return { ok: false, message: `El adaptador "${provider}" no soporta el envío de órdenes.` };
  }

  // ---------- 1. Estado actual del mapeo ----------
  const { data: mapeoRaw, error: mapeoError } = await sb
    .from("zc_external_ids")
    .select("id, external_id")
    .eq("provider", provider)
    .eq("entity", "work_order")
    .eq("id_zaire", orderId)
    .maybeSingle();

  if (mapeoError) {
    return {
      ok: false,
      message: `No se pudo leer el mapeo de envíos. ¿Corriste zaire_connect_push_ot.sql en esta base? (${mapeoError.message})`,
    };
  }

  const mapeo = mapeoRaw as { id: string; external_id: string } | null;

  // DEFENSA 4: un envío anterior quedó a medias. No se toca nada hasta que un humano revise.
  if (mapeo && mapeo.external_id.startsWith(PENDIENTE)) {
    return {
      ok: false,
      needsReview: true,
      message:
        "Hay un envío anterior de esta OT que quedó incompleto. Antes de reintentar, " +
        "revisá en el sistema externo si la oportunidad se llegó a crear. No se envía " +
        "nada para no arriesgar un duplicado.",
    };
  }

  // ---------- 2. Armar el paquete desde la OT ----------
  const wo = await construirCanonical(sb, provider, orderId);
  if ("error" in wo) return { ok: false, message: wo.error };

  // ---------- 3. Camino A: ya está mapeada → ACTUALIZAR, jamás crear ----------
  if (mapeo) {
    try {
      const r = await adapter.pushWorkOrder(wo, mapeo.external_id);
      await registrarCorrida(sb, provider, user?.id, "ok", 0, 1, r.warning ?? `Actualizada la oportunidad ${r.external_id}`);
      return {
        ok: true, external_id: r.external_id, created: false, warning: r.warning ?? null,
        message: `Actualizada en el sistema externo (id ${r.external_id}). No se creó ningún registro nuevo.`,
      };
    } catch (e) {
      const msg = (e as Error).message;
      await registrarCorrida(sb, provider, user?.id, "error", 0, 0, msg);
      return { ok: false, message: `No se pudo actualizar: ${msg}` };
    }
  }

  // ---------- 4. Camino B: primer envío. DEFENSA 2 — reservar antes de escribir ----------
  const { data: reservaRaw, error: reservaError } = await sb
    .from("zc_external_ids")
    .insert({ provider, entity: "work_order", external_id: `${PENDIENTE}${orderId}`, id_zaire: orderId })
    .select("id")
    .single();

  if (reservaError) {
    // DEFENSA 1: el índice único rechazó la reserva. Otro click ganó la carrera.
    if (reservaError.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        message: "Esta OT ya se está enviando (o se envió) desde otra pestaña. Recargá la página para ver el estado.",
      };
    }
    return { ok: false, message: `No se pudo reservar el envío: ${reservaError.message}` };
  }

  const reservaId = (reservaRaw as { id: string }).id;

  // ---------- 5. Hablar con el ERP (DEFENSA 3 va dentro del adaptador) ----------
  let r: PushResult;
  try {
    r = await adapter.pushWorkOrder(wo);
  } catch (e) {
    // Falló antes de crear nada: se libera la reserva para poder reintentar.
    // Se borra por id y solo si sigue en "pending", para no tocar un mapeo real.
    await sb.from("zc_external_ids").delete().eq("id", reservaId).like("external_id", `${PENDIENTE}%`);
    const msg = (e as Error).message;
    await registrarCorrida(sb, provider, user?.id, "error", 0, 0, msg);
    return { ok: false, message: `No se pudo enviar: ${msg}` };
  }

  // ---------- 6. Confirmar la reserva con el id real ----------
  const { error: confirmError } = await sb
    .from("zc_external_ids")
    .update({ external_id: r.external_id, external_write_date: new Date().toISOString() })
    .eq("id", reservaId);

  if (confirmError) {
    // Lo peor que puede pasar: el ERP creó el registro y Zaire no pudo anotarlo.
    // La reserva queda en "pending" A PROPÓSITO: traba los envíos siguientes.
    // Trabado y avisado es infinitamente mejor que duplicado.
    const msg =
      `La oportunidad SE CREÓ en el sistema externo con id ${r.external_id}, pero no se pudo ` +
      `guardar la referencia en Zaire (${confirmError.message}). Anotá ese id: el botón queda ` +
      `bloqueado para no duplicar.`;
    await registrarCorrida(sb, provider, user?.id, "error", 1, 0, msg);
    return { ok: false, needsReview: true, external_id: r.external_id, message: msg };
  }

  await registrarCorrida(
    sb, provider, user?.id, "ok",
    r.created ? 1 : 0, r.created ? 0 : 1,
    r.warning ?? (r.adopted ? `Se adoptó la oportunidad ${r.external_id} que ya existía en el sistema externo` : null)
  );

  return {
    ok: true, external_id: r.external_id, created: r.created, adopted: r.adopted, warning: r.warning ?? null,
    message: r.adopted
      ? `Ya existía en el sistema externo (id ${r.external_id}): se vinculó y actualizó, no se creó un duplicado.`
      : r.created
        ? `Enviada al sistema externo (id ${r.external_id}).`
        : `Actualizada en el sistema externo (id ${r.external_id}).`,
  };
}

/** ¿Esta OT ya fue enviada? Para que el botón sepa qué mostrar. */
export async function getWorkOrderPushState(
  orderId: string
): Promise<{ sent: boolean; externalId: string | null; needsReview: boolean }> {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("zc_external_ids")
      .select("external_id")
      .eq("provider", getIntegrationConfig().provider)
      .eq("entity", "work_order")
      .eq("id_zaire", orderId)
      .maybeSingle();

    const ext = (data?.external_id as string | undefined) ?? null;
    if (!ext) return { sent: false, externalId: null, needsReview: false };
    if (ext.startsWith(PENDIENTE)) return { sent: false, externalId: null, needsReview: true };
    return { sent: true, externalId: ext, needsReview: false };
  } catch {
    // Las tablas zc_ pueden no existir en esta base. El botón simplemente no se muestra.
    return { sent: false, externalId: null, needsReview: false };
  }
}

// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Arma el paquete canónico leyendo la OT, sus ítems y el mapeo del cliente. */
async function construirCanonical(
  sb: any, provider: string, orderId: string
): Promise<CanonicalWorkOrder | { error: string }> {
  const { data: order } = await sb
    .from("work_orders")
    .select("id, order_number, order_type, currency, total, date_due, general_notes, client_id, clients(id, business_name)")
    .eq("id", orderId)
    .is("deleted_at", null)
    .single();

  if (!order) return { error: "No se encontró la orden." };

  const { data: items } = await sb
    .from("work_order_items")
    .select("item_number, quantity, custom_description, unit_price, total_price, products(name, code)")
    .eq("work_order_id", orderId)
    .order("item_number");

  // El cliente se liga en el ERP solo si vino de una importación. Si se cargó a mano
  // en Zaire, no hay a quién ligarlo: se manda igual, con el nombre en el detalle.
  let clienteExternalId: string | null = null;
  if (order.client_id) {
    const { data: mapCliente } = await sb
      .from("zc_external_ids")
      .select("external_id")
      .eq("provider", provider)
      .eq("entity", "customer")
      .eq("id_zaire", order.client_id)
      .maybeSingle();
    clienteExternalId = (mapCliente?.external_id as string | undefined) ?? null;
  }

  const moneda = (order.currency as string) ?? "USD";
  const nombreCliente = (order.clients?.business_name as string | undefined) ?? null;

  const lineas = (items ?? []).map((i: any) => {
    const desc = i.products?.name ?? i.custom_description ?? "Ítem";
    const codigo = i.products?.code ? ` (${escapar(i.products.code)})` : "";
    return `<li>${escapar(desc)}${codigo} — ${i.quantity} un. — ${moneda} ${fmt(i.total_price)}</li>`;
  });

  const detalle =
    `<p>Generada automáticamente desde <b>Zaire Trace</b> — ${escapar(order.order_number)}</p>` +
    (lineas.length > 0 ? `<ul>${lineas.join("")}</ul>` : "<p><i>Sin ítems cargados.</i></p>") +
    `<p><b>Total: ${moneda} ${fmt(order.total)}</b></p>` +
    (order.general_notes ? `<p>${escapar(order.general_notes)}</p>` : "");

  return {
    id_zaire: order.id,
    // Estable e inequívoca: es lo que permite reencontrarla en el ERP si se pierde el mapeo.
    referencia: `Zaire Trace ${order.order_number}`,
    titulo: `${order.order_number}${nombreCliente ? ` · ${nombreCliente}` : ""}`,
    cliente_external_id: clienteExternalId,
    cliente_nombre: nombreCliente,
    importe: Number(order.total) || 0,
    moneda,
    fecha_estimada: (order.date_due as string | null) ?? null,
    detalle,
  };
}

async function registrarCorrida(
  sb: any, provider: string, userId: string | undefined,
  status: "ok" | "error", creados: number, actualizados: number, message: string | null
): Promise<void> {
  // La bitácora nunca debe hacer fallar el envío: si no se puede escribir, se sigue.
  try {
    await sb.from("zc_sync_runs").insert({
      provider, entity: "work_order", mode: "oneway", status,
      created: creados, updated: actualizados, skipped: 0,
      errors: status === "error" ? 1 : 0, fetched: 1,
      message, started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
      triggered_by: userId ?? null,
    });
  } catch {
    /* la corrida no se registró; el envío ya está hecho y su resultado se devuelve igual */
  }
}

function escapar(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmt(n: unknown): string {
  return (Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
