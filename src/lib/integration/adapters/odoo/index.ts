// index.ts — src/lib/integration/adapters/odoo/index.ts — 2026-08-27
// OdooAdapter: implementa ConnectorAdapter leyendo res.partner y product.template.
// SOLO LECTURA — este adaptador no escribe absolutamente nada en Odoo.
// Su única responsabilidad es traducir registros de Odoo al modelo canónico; qué se
// hace con ellos después es problema del núcleo (import-service.ts).

import { getOdooConfig } from "../../config";
import type {
  CanonicalCustomer,
  CanonicalProduct,
  CanonicalWorkOrder,
  ConnectorAdapter,
  FetchResult,
  PushResult,
  TestConnectionResult,
} from "../../types";
import {
  OdooClient,
  aFechaOdoo,
  odooEtiquetaRelacion,
  odooFechaISO,
  odooNumero,
  odooTexto,
  type OdooDomain,
  type OdooRecord,
} from "./client";

/** Presupuesto de lectura. El resto del tiempo de la request queda para escribir en Supabase. */
const PRESUPUESTO_LECTURA_MS = 30_000;

// Campos que existen en cualquier Odoo con Contactos instalado.
const CAMPOS_PARTNER = ["id", "name", "vat", "email", "phone", "street", "street2", "city", "write_date"];
const CAMPOS_PRODUCTO = ["id", "default_code", "name", "list_price", "uom_id", "currency_id", "write_date"];

// Campos que dependen de qué apps tenga instaladas la instancia, o de su versión.
// Pedir un campo inexistente en `fields` hace fallar el search_read entero, y filtrar
// por un campo inexistente también: hay que preguntar antes (ver camposDisponibles).
//   · customer_rank → lo agrega el módulo `sale`. Sin Ventas instalado no existe.
//   · mobile        → Odoo 19 lo unificó dentro de `phone`.
const PARTNER_OPCIONALES = ["customer_rank", "mobile"];

export class OdooAdapter implements ConnectorAdapter {
  readonly provider = "odoo" as const;
  private readonly client: OdooClient;

  constructor() {
    this.client = new OdooClient(getOdooConfig());
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      // Primero version() (no requiere auth): distingue "no llego al servidor" de
      // "llego pero la credencial está mal", que es el diagnóstico útil.
      const version = await this.client.version();
      const uid = await this.client.authenticate();
      return { ok: true, info: `Odoo ${version} · usuario uid ${uid}` };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  async fetchCustomers(since?: Date): Promise<FetchResult<CanonicalCustomer>> {
    const hay = await this.camposDisponibles("res.partner", PARTNER_OPCIONALES);
    const warnings: string[] = [];

    const fields = [...CAMPOS_PARTNER, ...(hay.has("mobile") ? ["mobile"] : [])];

    // customer_rank > 0 es el marcador estándar de Odoo para "es cliente": deja afuera
    // proveedores puros, empleados y contactos que no facturan. Solo existe si está
    // instalado el módulo Ventas; sin él se traen todos los contactos y se avisa.
    const domain: OdooDomain = [["active", "=", true], ...filtroIncremental(since)];
    if (hay.has("customer_rank")) {
      domain.push(["customer_rank", ">", 0]);
    } else {
      warnings.push(
        "Esta instancia de Odoo no tiene el campo customer_rank (falta la app Ventas): " +
          "se importan TODOS los contactos, no solo los marcados como clientes."
      );
    }

    const { records, truncated } = await this.client.searchReadPaginado(
      "res.partner",
      domain,
      fields,
      Date.now() + PRESUPUESTO_LECTURA_MS
    );

    return { records: records.map(aClienteCanonico), truncated, warnings };
  }

  async fetchProducts(since?: Date): Promise<FetchResult<CanonicalProduct>> {
    // product.template y no product.product: Zaire no tiene concepto de variante,
    // así que traer variantes multiplicaría filas sin aportar información.
    const domain: OdooDomain = [["active", "=", true], ...filtroIncremental(since)];

    let records;
    let truncated;
    try {
      ({ records, truncated } = await this.client.searchReadPaginado(
        "product.template",
        domain,
        CAMPOS_PRODUCTO,
        Date.now() + PRESUPUESTO_LECTURA_MS
      ));
    } catch (e) {
      // El modelo product.template lo aporta el módulo `product`, que llega con Ventas
      // o Inventario. Sin ninguna de esas apps el error crudo de Odoo no orienta a nadie.
      if (/product\.template/.test((e as Error).message)) {
        throw new Error(
          "Esta instancia de Odoo no tiene productos: instalá la app Ventas o Inventario " +
            "para que exista el modelo product.template."
        );
      }
      throw e;
    }

    return { records: records.map(aProductoCanonico), truncated, warnings: [] };
  }

  /**
   * Envía una OT como oportunidad (`crm.lead`) de Odoo.
   *
   * Se usa `crm.lead` y no `sale.order` a propósito: `sale.order` exige la app Ventas,
   * mientras que `crm.lead` está disponible con el CRM solo. Un cliente que tenga Ventas
   * puede querer un presupuesto formal — eso sería otro método, no este.
   *
   * El campo `referred` guarda la referencia de Zaire. Es lo que permite reencontrar la
   * oportunidad en Odoo si el mapeo local se perdiera, y por eso NUNCA hay que sacarlo.
   */
  async pushWorkOrder(wo: CanonicalWorkOrder, existingExternalId?: string): Promise<PushResult> {
    const { partnerId, warning } = await this.resolverContacto(wo.cliente_external_id);

    const valores = {
      name: wo.titulo,
      type: "opportunity",
      expected_revenue: wo.importe,
      description: wo.detalle,
      referred: wo.referencia,
      ...(wo.fecha_estimada ? { date_deadline: wo.fecha_estimada } : {}),
      ...(partnerId !== null ? { partner_id: partnerId } : {}),
    };

    // Ya sabemos cuál es: actualizar. Este camino jamás crea.
    if (existingExternalId) {
      await this.client.executeKw("crm.lead", "write", [[Number(existingExternalId)], valores]);
      return { external_id: existingExternalId, created: false, warning };
    }

    // DEFENSA 3 — ¿ya existe en Odoo algo con esta referencia? Cubre el caso de que el
    // mapeo de Zaire se haya perdido (base restaurada, borrado manual) mientras la
    // oportunidad sigue viva en Odoo. Sin esto, ahí se duplicaría.
    const existentes = await this.client.executeKw<{ id: number }[]>(
      "crm.lead",
      "search_read",
      [[["referred", "=", wo.referencia]]],
      { fields: ["id"], limit: 1 }
    );

    if (existentes.length > 0) {
      const id = String(existentes[0].id);
      await this.client.executeKw("crm.lead", "write", [[existentes[0].id], valores]);
      return { external_id: id, created: false, adopted: true, warning };
    }

    const nuevoId = await this.client.executeKw<number>("crm.lead", "create", [valores]);
    return { external_id: String(nuevoId), created: true, warning };
  }

  /**
   * Confirma que el contacto sigue existiendo en Odoo antes de referenciarlo.
   *
   * Sin esto, un contacto borrado en Odoo hace fallar el envío entero con un mensaje
   * de Odoo que despista por completo: "The operation cannot be completed: Another
   * model is using the record you are trying to delete. The troublemaker is: 'Lead'".
   * No habla de borrar nada: es como Odoo dice "ese id de contacto no existe".
   *
   * Se usa `active_test: false` para que un contacto ARCHIVADO cuente como existente
   * (archivar en Odoo no es borrar, y el vínculo sigue siendo válido).
   */
  private async resolverContacto(
    externalId: string | null
  ): Promise<{ partnerId: number | null; warning: string | null }> {
    if (!externalId) return { partnerId: null, warning: null };

    const id = Number(externalId);
    if (!Number.isFinite(id)) return { partnerId: null, warning: null };

    const existe = await this.client.executeKw<number>(
      "res.partner",
      "search_count",
      [[["id", "=", id]]],
      { context: { active_test: false } }
    );

    if (existe > 0) return { partnerId: id, warning: null };

    return {
      partnerId: null,
      warning:
        `El cliente ya no existe en Odoo (id ${externalId}): se envió sin vincularlo al contacto. ` +
        `Volvé a importar clientes para actualizar la correspondencia.`,
    };
  }

  /**
   * Qué campos opcionales existen realmente en este Odoo.
   * Hace falta porque pedir un campo inexistente —o filtrar por él— hace fallar el
   * search_read completo, y la disponibilidad depende de las apps instaladas y de la
   * versión. Es una sola llamada extra por importación.
   */
  private async camposDisponibles(modelo: string, candidatos: string[]): Promise<Set<string>> {
    const definicion = await this.client.executeKw<Record<string, unknown>>(modelo, "fields_get", [], {
      attributes: ["type"],
    });
    return new Set(candidatos.filter((c) => c in definicion));
  }
}

/** Filtro incremental por fecha de modificación, si el llamador pasó `since`. */
function filtroIncremental(since?: Date): OdooDomain {
  return since ? [["write_date", ">", aFechaOdoo(since)]] : [];
}

function aClienteCanonico(r: OdooRecord): CanonicalCustomer {
  // Odoo parte la calle en street/street2; Zaire tiene una sola columna `address`.
  const direccion = [odooTexto(r.street), odooTexto(r.street2)].filter(Boolean).join(", ");

  return {
    external_id: String(r.id),
    external_write_date: odooFechaISO(r.write_date),
    nombre: odooTexto(r.name) ?? "",
    cuit: odooTexto(r.vat),
    email: odooTexto(r.email),
    telefono: odooTexto(r.phone) ?? odooTexto(r.mobile),
    direccion: direccion || null,
    ciudad: odooTexto(r.city),
  };
}

function aProductoCanonico(r: OdooRecord): CanonicalProduct {
  return {
    external_id: String(r.id),
    external_write_date: odooFechaISO(r.write_date),
    codigo: odooTexto(r.default_code),
    nombre: odooTexto(r.name) ?? "",
    precio: odooNumero(r.list_price),
    // many2one → la etiqueta es el nombre de la moneda ("USD") y de la unidad ("Units").
    moneda: odooEtiquetaRelacion(r.currency_id),
    unidad: odooEtiquetaRelacion(r.uom_id),
  };
}
