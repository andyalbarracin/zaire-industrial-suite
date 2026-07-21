// audit.ts — src/lib/assets/audit.ts — 2026-07-20
// Auditoría de mutations de Zaire Activos (escribe en audit_logs). Fire-and-forget.

import { createClient } from "@/lib/supabase/client";

type AuditAction = "create" | "update" | "delete" | "event" | "document";

export async function logAssetAudit(
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
