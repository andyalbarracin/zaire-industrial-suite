// index.ts — src/lib/integration/adapters/odoo/index.ts — 2026-08-27
// OdooAdapter: implementa ConnectorAdapter leyendo res.partner y product.template.
// SOLO LECTURA — este adaptador no escribe absolutamente nada en Odoo.
// Su única responsabilidad es traducir registros de Odoo al modelo canónico; qué se
// hace con ellos después es problema del núcleo (import-service.ts).

import { getOdooConfig } from "../../config";
import type {
  CanonicalCustomer,
  CanonicalProduct,
  ConnectorAdapter,
  FetchResult,
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

const CAMPOS_PARTNER = ["id", "name", "vat", "email", "phone", "mobile", "street", "street2", "city", "write_date"];
const CAMPOS_PRODUCTO = ["id", "default_code", "name", "list_price", "uom_id", "currency_id", "write_date"];

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
    // customer_rank > 0 es el marcador estándar de Odoo 13+ para "es cliente".
    // Deja afuera proveedores puros, empleados y contactos que no facturan.
    const domain: OdooDomain = [
      ["customer_rank", ">", 0],
      ["active", "=", true],
      ...filtroIncremental(since),
    ];

    const { records, truncated } = await this.client.searchReadPaginado(
      "res.partner",
      domain,
      CAMPOS_PARTNER,
      Date.now() + PRESUPUESTO_LECTURA_MS
    );

    return { records: records.map(aClienteCanonico), truncated, warnings: [] };
  }

  async fetchProducts(since?: Date): Promise<FetchResult<CanonicalProduct>> {
    // product.template y no product.product: Zaire no tiene concepto de variante,
    // así que traer variantes multiplicaría filas sin aportar información.
    const domain: OdooDomain = [["active", "=", true], ...filtroIncremental(since)];

    const { records, truncated } = await this.client.searchReadPaginado(
      "product.template",
      domain,
      CAMPOS_PRODUCTO,
      Date.now() + PRESUPUESTO_LECTURA_MS
    );

    return { records: records.map(aProductoCanonico), truncated, warnings: [] };
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
