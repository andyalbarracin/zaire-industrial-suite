"use client";
// integration-panel.tsx — src/components/integration/integration-panel.tsx — 2026-08-27
// Panel de Zaire Connect dentro de Ajustes. Solo se monta si INTEGRATION_ENABLED está
// prendido (lo decide la página, que es Server Component y lee el flag server-side).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Users, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SyncEntity, SyncRun, SyncRunResult, SyncRunStatus, TestConnectionResult } from "@/lib/integration/types";

interface IntegrationPanelProps {
  provider: string;
  lastRuns: SyncRun[];
}

const ETIQUETA: Record<SyncEntity, string> = { customer: "Clientes", product: "Productos" };

async function consultarConexion(): Promise<TestConnectionResult> {
  try {
    const res = await fetch("/api/integration/test", { cache: "no-store" });
    return await res.json();
  } catch {
    return { ok: false, error: "No se pudo contactar al servidor" };
  }
}

/** Forma común para mostrar tanto una corrida guardada como una recién terminada. */
interface ResumenCorrida {
  status: SyncRunStatus;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string | null;
  fecha: string | null;
}

export function IntegrationPanel({ provider, lastRuns }: IntegrationPanelProps) {
  const router = useRouter();
  const [conexion, setConexion] = useState<TestConnectionResult | null>(null);
  const [probando, setProbando] = useState(true);
  const [importando, setImportando] = useState<SyncEntity | null>(null);
  // Corridas hechas en esta sesión; pisan a las que vinieron por props.
  const [recientes, setRecientes] = useState<Partial<Record<SyncEntity, SyncRunResult>>>({});

  // Sondeo inicial. El estado se toca recién con la respuesta, no de forma síncrona.
  useEffect(() => {
    let vivo = true;
    consultarConexion().then((r) => {
      if (!vivo) return;
      setConexion(r);
      setProbando(false);
    });
    return () => { vivo = false; };
  }, []);

  async function reintentar() {
    setProbando(true);
    setConexion(await consultarConexion());
    setProbando(false);
  }

  async function importar(entity: SyncEntity) {
    setImportando(entity);
    try {
      const res = await fetch("/api/integration/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "No se pudo importar");
        return;
      }

      const r = data as SyncRunResult;
      const resumen = `${r.created} creados · ${r.updated} actualizados · ${r.skipped} sin cambios`;

      if (r.status === "ok") toast.success(`${ETIQUETA[entity]}: ${resumen}`);
      else if (r.status === "partial") toast.warning(`${ETIQUETA[entity]}: ${resumen} · ${r.errors} con error`);
      else toast.error(`${ETIQUETA[entity]}: ${r.message ?? "la importación falló"}`);

      setRecientes((prev) => ({ ...prev, [entity]: r }));
      // Las pantallas de Clientes/Productos ya tienen datos nuevos que mostrar.
      router.refresh();
    } catch {
      toast.error("No se pudo contactar al servidor");
    } finally {
      setImportando(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Estado de conexión */}
      <div className="flex items-start gap-3 rounded-[9px] border border-(--zaire-border) p-3.5">
        {probando ? (
          <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin text-(--zaire-text-muted)" />
        ) : conexion?.ok ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-(--zaire-text)">
            {probando ? "Probando conexión…" : conexion?.ok ? `Conectado a ${provider}` : `Sin conexión a ${provider}`}
          </p>
          <p className="text-xs text-(--zaire-text-muted) mt-0.5 break-words">
            {probando ? " " : conexion?.ok ? conexion.info : conexion?.error}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={reintentar} disabled={probando}>
          <RefreshCw className={`w-3.5 h-3.5 ${probando ? "animate-spin" : ""}`} />
          Reintentar
        </Button>
      </div>

      {/* Importaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["customer", "product"] as SyncEntity[]).map((entity) => {
          const resumen = resumir(recientes[entity], lastRuns.find((r) => r.entity === entity));
          const Icono = entity === "customer" ? Users : Package;

          return (
            <div key={entity} className="rounded-[9px] border border-(--zaire-border) p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Icono className="w-4 h-4 text-(--zaire-text-muted)" />
                <span className="text-sm font-medium text-(--zaire-text)">{ETIQUETA[entity]}</span>
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={() => importar(entity)}
                disabled={importando !== null || !conexion?.ok}
              >
                {importando === entity ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importando…</>
                ) : (
                  `Importar ${ETIQUETA[entity].toLowerCase()}`
                )}
              </Button>

              <UltimaCorrida resumen={resumen} />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-(--zaire-text-muted)">
        La importación es de solo lectura: trae datos del sistema externo hacia Zaire y nunca escribe en él.
        Volver a importar no duplica registros.
      </p>
    </div>
  );
}

/** La corrida de esta sesión gana sobre la que vino de la base. */
function resumir(reciente: SyncRunResult | undefined, guardada: SyncRun | undefined): ResumenCorrida | null {
  if (reciente) {
    return { ...reciente, message: reciente.message ?? null, fecha: null };
  }
  if (guardada) {
    return { ...guardada, message: guardada.message ?? null, fecha: guardada.started_at };
  }
  return null;
}

function UltimaCorrida({ resumen }: { resumen: ResumenCorrida | null }) {
  if (!resumen) return <p className="text-xs text-(--zaire-text-muted)">Sin corridas todavía.</p>;

  const color =
    resumen.status === "ok" ? "text-emerald-600 dark:text-emerald-400"
    : resumen.status === "partial" ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-1">
      <p className="text-xs text-(--zaire-text-muted)">
        <span className={`font-medium ${color}`}>{resumen.created}</span> creados ·{" "}
        <span className={`font-medium ${color}`}>{resumen.updated}</span> actualizados ·{" "}
        {resumen.skipped} sin cambios
        {resumen.errors > 0 && <> · <span className="text-red-600 dark:text-red-400 font-medium">{resumen.errors} con error</span></>}
      </p>
      {resumen.fecha && (
        <p className="text-xs text-(--zaire-text-muted)">
          {new Date(resumen.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      )}
      {resumen.message && <p className="text-xs text-amber-700 dark:text-amber-400">{resumen.message}</p>}
    </div>
  );
}
