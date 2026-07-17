// audit.ts — src/lib/crm/audit.ts — 2026-07-17
// Registro de auditoría para las mutations del CRM (escribe en audit_logs, igual que Trace).
// Fire-and-forget desde los componentes cliente: no bloquea la UX.

import { createClient } from "@/lib/supabase/client";

type AuditAction = "create" | "update" | "delete" | "status_change";

export async function logCrmAudit(
  entityType: string,
  entityId: string,
  action: AuditAction,
  description: string,
): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  let userName: string | null = null;
  if (user) {
    const { data } = await sb.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    userName = data?.full_name ?? null;
  }
  await sb.from("audit_logs").insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    description,
    user_id: user?.id ?? null,
    user_name: userName,
  });
}
