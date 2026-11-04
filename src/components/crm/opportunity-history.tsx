// opportunity-history.tsx — src/components/crm/opportunity-history.tsx — 2026-11-02
// El historial de una oportunidad: qué pasó, cuándo y quién lo hizo.
//
// Sale de `audit_logs`, que YA se venía escribiendo en cada alta, edición, cambio de etapa y
// borrado (`logCrmAudit`). No hizo falta una tabla nueva: lo único que faltaba era mostrarlo.
// Hasta ahora se registraba todo y no se leía desde ninguna pantalla.
//
// Es read-only a propósito: es el registro de lo que pasó. Lo que el usuario escribe a mano son
// las actividades (la otra pestaña), que además pueden tener fecha y avisar por la campana.

import { Plus, Pencil, ArrowRightLeft, Trash2 } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";
import type { AuditLog, AuditAction } from "@/lib/types/database";

const ACCION: Record<AuditAction, { label: string; icon: React.ElementType; style: string }> = {
  create: { label: "Creada", icon: Plus, style: "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-300" },
  update: { label: "Editada", icon: Pencil, style: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  status_change: { label: "Cambio de etapa", icon: ArrowRightLeft, style: "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  delete: { label: "Eliminada", icon: Trash2, style: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300" },
};

export function OpportunityHistory({ entries }: { entries: AuditLog[] }) {
  if (entries.length === 0) {
    return (
      <div className="zaire-card p-5">
        <p className="text-sm text-(--zaire-text-muted)">
          Sin movimientos registrados. Acá van quedando los cambios de etapa y las ediciones, con
          quién los hizo y cuándo.
        </p>
      </div>
    );
  }

  return (
    <div className="zaire-card p-5">
      <ul className="space-y-3">
        {entries.map((e) => {
          const a = ACCION[e.action] ?? ACCION.update;
          const Icon = a.icon;
          return (
            <li key={e.id} className="flex items-start gap-3">
              <span className={cn("w-7 h-7 rounded-lg grid place-items-center shrink-0", a.style)}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                {/* La descripción ya viene en lenguaje llano desde `logCrmAudit` ("Etapa →
                    Propuesta"), así que se muestra tal cual y la etiqueta de la acción queda
                    como respaldo cuando no hay descripción. */}
                <p className="text-sm text-(--zaire-text)">{e.description ?? a.label}</p>
                <p className="text-[11px] text-(--zaire-text-muted) mt-0.5">
                  {formatDateTime(e.created_at)}
                  {e.user_name ? ` · ${e.user_name}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
