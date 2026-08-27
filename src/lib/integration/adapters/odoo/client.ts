// client.ts — src/lib/integration/adapters/odoo/client.ts — 2026-08-27
// Transporte JSON-RPC contra Odoo. Solo `fetch` nativo: cero dependencias npm nuevas.
//
// Se usa el RPC clásico (`POST {ODOO_URL}/jsonrpc`), con los dos servicios de siempre:
//   · service "common" → version() (sin auth) y authenticate() → uid
//   · service "object" → execute_kw(db, uid, key, modelo, metodo, args, kwargs)
// Es la API estable y compatible con Odoo 16-18, incluido Odoo Online.
//
// A FUTURO: Odoo deprecia el RPC clásico hacia 2027-28 en favor de la External JSON-2
// API (endpoints REST bajo /json/2/...). Cuando toque migrar, se reescribe SOLO este
// archivo: `index.ts` habla con esta clase, no con el protocolo.

import type { OdooConfig } from "../../config";

/** Odoo Online limita a ~60 req/min. Un hueco mínimo de 1.1s nos deja en ~54/min. */
const HUECO_MINIMO_MS = 1100;

/** Registros por página en search_read. */
export const TAMANO_PAGINA = 200;

/** Valor de un campo Odoo. Los campos vacíos vuelven como `false`, no como null. */
export type OdooValue = string | number | boolean | [number, string] | null;
export type OdooRecord = Record<string, OdooValue>;

/** Dominio de búsqueda de Odoo: [["campo", "operador", valor], …] */
export type OdooDomain = unknown[];

interface JsonRpcResponse<T> {
  result?: T;
  error?: {
    message?: string;
    data?: { message?: string; name?: string };
  };
}

export class OdooClient {
  private uid: number | null = null;
  private ultimaLlamadaAt = 0;

  constructor(private readonly cfg: OdooConfig) {}

  /** Espacia las llamadas para no pasarnos del rate limit de Odoo. */
  private async esperarTurno(): Promise<void> {
    const transcurrido = Date.now() - this.ultimaLlamadaAt;
    if (this.ultimaLlamadaAt > 0 && transcurrido < HUECO_MINIMO_MS) {
      await new Promise((r) => setTimeout(r, HUECO_MINIMO_MS - transcurrido));
    }
    this.ultimaLlamadaAt = Date.now();
  }

  private async rpc<T>(service: "common" | "object", method: string, args: unknown[]): Promise<T> {
    await this.esperarTurno();

    let res: Response;
    try {
      res = await fetch(`${this.cfg.url}/jsonrpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: { service, method, args },
          id: Date.now(),
        }),
        cache: "no-store",
      });
    } catch (e) {
      throw new Error(`No se pudo conectar con ${this.cfg.url}: ${(e as Error).message}`);
    }

    if (!res.ok) {
      throw new Error(`Odoo respondió HTTP ${res.status} en ${this.cfg.url}/jsonrpc`);
    }

    let body: JsonRpcResponse<T>;
    try {
      body = (await res.json()) as JsonRpcResponse<T>;
    } catch {
      // Típico cuando ODOO_URL apunta a algo que no es un Odoo: devuelve HTML.
      throw new Error(`Odoo devolvió una respuesta que no es JSON. Revisá ODOO_URL (${this.cfg.url}).`);
    }

    if (body.error) {
      throw new Error(body.error.data?.message || body.error.message || "Error desconocido de Odoo");
    }

    return body.result as T;
  }

  /** Versión del servidor. No requiere autenticación: sirve para separar "no llego" de "credencial mala". */
  async version(): Promise<string> {
    const r = await this.rpc<{ server_version?: string }>("common", "version", []);
    return r?.server_version ?? "desconocida";
  }

  /** Autentica y cachea el uid para el resto de la corrida. */
  async authenticate(): Promise<number> {
    if (this.uid !== null) return this.uid;

    const uid = await this.rpc<number | false>("common", "authenticate", [
      this.cfg.db,
      this.cfg.user,
      this.cfg.apiKey,
      {},
    ]);

    if (!uid || typeof uid !== "number") {
      throw new Error(
        `Odoo rechazó las credenciales. Revisá ODOO_DB ("${this.cfg.db}"), ODOO_API_USER y ODOO_API_KEY.`
      );
    }

    this.uid = uid;
    return uid;
  }

  async executeKw<T>(modelo: string, metodo: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
    const uid = await this.authenticate();
    return this.rpc<T>("object", "execute_kw", [this.cfg.db, uid, this.cfg.apiKey, modelo, metodo, args, kwargs]);
  }

  /**
   * search_read paginado. Corta cuando se agota el resultado o cuando se acaba el
   * presupuesto de tiempo (`hastaMs`), en cuyo caso devuelve `truncated: true` y la
   * corrida queda 'partial'. Ordena por id para que la paginación sea estable.
   */
  async searchReadPaginado(
    modelo: string,
    domain: OdooDomain,
    fields: string[],
    hastaMs: number
  ): Promise<{ records: OdooRecord[]; truncated: boolean }> {
    const records: OdooRecord[] = [];
    let offset = 0;

    for (;;) {
      if (Date.now() >= hastaMs) return { records, truncated: true };

      const pagina = await this.executeKw<OdooRecord[]>(modelo, "search_read", [domain], {
        fields,
        limit: TAMANO_PAGINA,
        offset,
        order: "id",
      });

      records.push(...pagina);
      if (pagina.length < TAMANO_PAGINA) return { records, truncated: false };
      offset += TAMANO_PAGINA;
    }
  }
}

// ---------- Normalización de valores de Odoo ----------

/** Odoo devuelve `false` en vez de null/"" para los campos vacíos. */
export function odooTexto(v: OdooValue | undefined): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

export function odooNumero(v: OdooValue | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Campos many2one: llegan como [id, "etiqueta"] o como `false`. */
export function odooEtiquetaRelacion(v: OdooValue | undefined): string | null {
  return Array.isArray(v) && typeof v[1] === "string" ? odooTexto(v[1]) : null;
}

/** Odoo maneja datetimes UTC sin zona ("2026-08-27 14:33:12"). Los pasamos a ISO. */
export function odooFechaISO(v: OdooValue | undefined): string | null {
  const s = odooTexto(v);
  if (!s) return null;
  const d = new Date(`${s.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Formato que espera Odoo en los dominios de búsqueda: "YYYY-MM-DD HH:MM:SS" en UTC. */
export function aFechaOdoo(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}
