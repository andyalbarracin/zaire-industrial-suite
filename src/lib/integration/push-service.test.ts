// push-service.test.ts — src/lib/integration/push-service.test.ts — 2026-08-28
// Tests de la garantía anti-duplicado del envío de OTs.
//
// Estos tests existen porque duplicar una OT en el ERP del cliente es plata duplicada.
// No verifican que "ande": verifican que en cada escenario de falla el sistema elija
// NO ENVIAR antes que arriesgar un duplicado. Si alguno de estos se rompe, la
// protección se perdió, por más que la funcionalidad siga andando.

import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { value: null as unknown };
const adapterMock = { value: null as unknown };

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabaseMock.value }));
vi.mock("./registry", () => ({ getAdapter: async () => adapterMock.value }));

const { pushWorkOrder } = await import("./push-service");

type Resultado = { data?: unknown; error?: unknown };
type Plan = Record<string, Resultado | Resultado[]>;

/** Supabase falso: responde por "tabla.operación", en orden si hay varias respuestas. */
function fakeSb(plan: Plan) {
  const cola: Record<string, Resultado[]> = {};
  for (const [k, v] of Object.entries(plan)) cola[k] = Array.isArray(v) ? [...v] : [v];
  const ops: string[] = [];

  const sb = {
    from(table: string) {
      const estado = { table, op: "select" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b: any = {};
      for (const m of ["select", "eq", "is", "in", "like", "order", "limit"]) b[m] = () => b;
      for (const m of ["insert", "update", "delete"]) b[m] = () => { estado.op = m; return b; };

      const resolver = (): Resultado => {
        const key = `${estado.table}.${estado.op}`;
        ops.push(key);
        const r = cola[key]?.shift();
        return r ?? { data: null, error: null };
      };

      b.maybeSingle = async () => resolver();
      b.single = async () => resolver();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      b.then = (f: any, r: any) => Promise.resolve(resolver()).then(f, r);
      return b;
    },
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    _ops: ops,
  };
  return sb;
}

const OT = {
  id: "ot-1", order_number: "OT-2026-00123", order_type: "OT", currency: "USD",
  total: 1850.5, date_due: "2026-09-15", general_notes: null,
  client_id: "cli-1", clients: { id: "cli-1", business_name: "Bombas del Sur S.A." },
};

/** Respuestas comunes para que construirCanonical funcione. */
const LECTURA_OT: Plan = {
  "work_orders.select": { data: OT, error: null },
  "work_order_items.select": { data: [], error: null },
};

beforeEach(() => {
  process.env.INTEGRATION_ENABLED = "true";
  process.env.INTEGRATION_PROVIDER = "odoo";
});

describe("pushWorkOrder — no duplicar es más importante que enviar", () => {
  it("si un envío anterior quedó a medias, NO envía y pide revisión humana", async () => {
    const push = vi.fn();
    adapterMock.value = { provider: "odoo", pushWorkOrder: push };
    supabaseMock.value = fakeSb({
      "zc_external_ids.select": { data: { id: "m1", external_id: "pending:ot-1" }, error: null },
    });

    const r = await pushWorkOrder("ot-1");

    expect(r.ok).toBe(false);
    expect(r.needsReview).toBe(true);
    // Lo esencial: ni se intentó hablar con el ERP.
    expect(push).not.toHaveBeenCalled();
  });

  it("si la OT ya está mapeada, ACTUALIZA la existente y nunca crea otra", async () => {
    const push = vi.fn().mockResolvedValue({ external_id: "69", created: false });
    adapterMock.value = { provider: "odoo", pushWorkOrder: push };
    supabaseMock.value = fakeSb({
      ...LECTURA_OT,
      "zc_external_ids.select": [
        { data: { id: "m1", external_id: "69" }, error: null },  // mapeo de la OT
        { data: { external_id: "153" }, error: null },           // mapeo del cliente
      ],
      "zc_sync_runs.insert": { data: null, error: null },
    });

    const r = await pushWorkOrder("ot-1");

    expect(r.ok).toBe(true);
    expect(r.created).toBe(false);
    // El id existente viaja como segundo argumento: es lo que fuerza el update.
    expect(push).toHaveBeenCalledWith(expect.anything(), "69");
  });

  it("si dos envíos corren a la vez, el índice único frena al segundo", async () => {
    const push = vi.fn();
    adapterMock.value = { provider: "odoo", pushWorkOrder: push };
    supabaseMock.value = fakeSb({
      ...LECTURA_OT,
      "zc_external_ids.select": [
        { data: null, error: null },                    // todavía no hay mapeo
        { data: { external_id: "153" }, error: null },  // mapeo del cliente
      ],
      // La reserva choca contra zc_external_ids_work_order_uniq.
      "zc_external_ids.insert": { data: null, error: { code: "23505", message: "duplicate key" } },
    });

    const r = await pushWorkOrder("ot-1");

    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/ya se está enviando|se envió/i);
    // Nunca se llamó al ERP: la carrera se cortó antes.
    expect(push).not.toHaveBeenCalled();
  });

  it("primer envío exitoso: reserva ANTES de llamar al ERP", async () => {
    const push = vi.fn().mockResolvedValue({ external_id: "69", created: true });
    adapterMock.value = { provider: "odoo", pushWorkOrder: push };
    const sb = fakeSb({
      ...LECTURA_OT,
      "zc_external_ids.select": [
        { data: null, error: null },
        { data: { external_id: "153" }, error: null },
      ],
      "zc_external_ids.insert": { data: { id: "res-1" }, error: null },
      "zc_external_ids.update": { data: null, error: null },
      "zc_sync_runs.insert": { data: null, error: null },
    });
    supabaseMock.value = sb;

    const r = await pushWorkOrder("ot-1");

    expect(r.ok).toBe(true);
    expect(r.created).toBe(true);
    expect(r.external_id).toBe("69");
    // El orden importa: la reserva (insert) tiene que ocurrir antes del update que
    // la confirma. Si se invirtiera, un corte de red dejaría huérfano el registro
    // del ERP y el próximo click duplicaría.
    const ops = sb._ops.filter((o) => o.startsWith("zc_external_ids."));
    expect(ops.indexOf("zc_external_ids.insert")).toBeLessThan(ops.indexOf("zc_external_ids.update"));
  });

  it("si el ERP falla, libera la reserva para poder reintentar", async () => {
    const push = vi.fn().mockRejectedValue(new Error("Odoo caído"));
    adapterMock.value = { provider: "odoo", pushWorkOrder: push };
    const sb = fakeSb({
      ...LECTURA_OT,
      "zc_external_ids.select": [
        { data: null, error: null },
        { data: { external_id: "153" }, error: null },
      ],
      "zc_external_ids.insert": { data: { id: "res-1" }, error: null },
      "zc_external_ids.delete": { data: null, error: null },
      "zc_sync_runs.insert": { data: null, error: null },
    });
    supabaseMock.value = sb;

    const r = await pushWorkOrder("ot-1");

    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Odoo caído/);
    // La reserva se borra: como el ERP no llegó a crear nada, reintentar es seguro.
    expect(sb._ops).toContain("zc_external_ids.delete");
  });

  it("si el ERP creó pero Zaire no pudo anotarlo, TRABA y no libera la reserva", async () => {
    // El peor caso. Dejar la reserva en "pending" bloquea los envíos siguientes.
    // Trabado y avisado es infinitamente mejor que duplicado.
    const push = vi.fn().mockResolvedValue({ external_id: "69", created: true });
    adapterMock.value = { provider: "odoo", pushWorkOrder: push };
    const sb = fakeSb({
      ...LECTURA_OT,
      "zc_external_ids.select": [
        { data: null, error: null },
        { data: { external_id: "153" }, error: null },
      ],
      "zc_external_ids.insert": { data: { id: "res-1" }, error: null },
      "zc_external_ids.update": { data: null, error: { message: "conexión perdida" } },
      "zc_sync_runs.insert": { data: null, error: null },
    });
    supabaseMock.value = sb;

    const r = await pushWorkOrder("ot-1");

    expect(r.ok).toBe(false);
    expect(r.needsReview).toBe(true);
    // El id de Odoo tiene que llegar al usuario para que pueda reconciliar a mano.
    expect(r.external_id).toBe("69");
    expect(r.message).toMatch(/69/);
    // Y la reserva NO se borra: si se borrara, el próximo click duplicaría.
    expect(sb._ops).not.toContain("zc_external_ids.delete");
  });
});
