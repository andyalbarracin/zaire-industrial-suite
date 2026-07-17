// page.tsx — src/app/(dashboard)/historial/page.tsx — 2026-05-19
// Log de auditoría completo con filtros y detalle expandible

import { createClient } from "@/lib/supabase/server";
import { AuditLogTable } from "@/components/shared/audit-log-table";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, entity_type, entity_id, action, description, old_data, new_data, user_id, user_name, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Historial de Auditoría</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          Registro completo de acciones en el sistema
        </p>
      </div>
      <AuditLogTable logs={logs ?? []} />
    </div>
  );
}
