// guard.test.ts — src/lib/integration/guard.test.ts — 2026-08-27
// Tests de la barrera de acceso de /api/integration/*. Lo importante acá no es solo
// QUÉ devuelve, sino EN QUÉ ORDEN: con el flag apagado tiene que cortar con 404 sin
// haber tocado siquiera la sesión, para que un deploy sin integración se comporte
// como si estas rutas no existieran.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createClientMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClientMock() }));

const { bloquearSiNoAutorizado } = await import("./guard");

/** Supabase falso: una sesión y un rol. */
function supabaseCon(userId: string | null, role: string | null) {
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: role ? { role } : null }) }) }),
    }),
  };
}

describe("bloquearSiNoAutorizado", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    delete process.env.INTEGRATION_ENABLED;
  });
  afterEach(() => {
    delete process.env.INTEGRATION_ENABLED;
  });

  it("con el flag ausente devuelve 404 SIN mirar la sesión", async () => {
    const res = await bloquearSiNoAutorizado();
    expect(res?.status).toBe(404);
    // La garantía de aislamiento: no se creó ni un cliente de Supabase.
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("trata cualquier valor que no sea 'true' como apagado (fail-closed)", async () => {
    // Ojo: esto es lo contrario de lib/modules.ts, donde el valor ausente habilita todo.
    for (const valor of ["false", "1", "yes", "on", "si", ""]) {
      process.env.INTEGRATION_ENABLED = valor;
      expect((await bloquearSiNoAutorizado())?.status, `valor: "${valor}"`).toBe(404);
      expect(createClientMock).not.toHaveBeenCalled();
    }
  });

  it("normaliza espacios y mayúsculas del valor que sí habilita", async () => {
    createClientMock.mockReturnValue(supabaseCon("u1", "admin"));
    for (const valor of ["true", "TRUE", " True "]) {
      process.env.INTEGRATION_ENABLED = valor;
      expect(await bloquearSiNoAutorizado(), `valor: "${valor}"`).toBeNull();
    }
  });

  it("con el flag prendido y sin sesión devuelve 401", async () => {
    process.env.INTEGRATION_ENABLED = "true";
    createClientMock.mockReturnValue(supabaseCon(null, null));
    expect((await bloquearSiNoAutorizado())?.status).toBe(401);
  });

  it("con sesión pero rol no admin devuelve 403", async () => {
    process.env.INTEGRATION_ENABLED = "true";
    createClientMock.mockReturnValue(supabaseCon("u1", "operator"));
    expect((await bloquearSiNoAutorizado())?.status).toBe(403);

    createClientMock.mockReturnValue(supabaseCon("u1", "viewer"));
    expect((await bloquearSiNoAutorizado())?.status).toBe(403);
  });

  it("con sesión sin perfil devuelve 403 (no asume admin)", async () => {
    process.env.INTEGRATION_ENABLED = "true";
    createClientMock.mockReturnValue(supabaseCon("u1", null));
    expect((await bloquearSiNoAutorizado())?.status).toBe(403);
  });

  it("deja pasar solo al admin con el flag prendido", async () => {
    process.env.INTEGRATION_ENABLED = "true";
    createClientMock.mockReturnValue(supabaseCon("u1", "admin"));
    expect(await bloquearSiNoAutorizado()).toBeNull();
  });
});
