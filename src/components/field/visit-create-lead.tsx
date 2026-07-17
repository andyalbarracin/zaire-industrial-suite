"use client";
// visit-create-lead.tsx — src/components/field/visit-create-lead.tsx — 2026-07-18
// Fase E (Field→CRM): desde una visita con propósito 'visita_comercial', crea un lead en el CRM.
// Auto-gateado: solo se renderiza si CRM está habilitado y el propósito es visita comercial.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { isModuleEnabled } from "@/lib/modules";
import type { FieldVisit } from "@/lib/field/types";

export function VisitCreateLead({ visit }: { visit: FieldVisit }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!isModuleEnabled("crm") || visit.purpose !== "visita_comercial") return null;

  async function createLead() {
    setBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: userData } = await supabase.auth.getUser();
    const company = visit.client?.business_name ?? visit.site?.name ?? "Prospecto de visita comercial";
    const { data, error } = await sb
      .from("crm_leads")
      .insert({
        company_name: company,
        source: "visita_comercial",
        status: "nuevo",
        notes: `Generado desde la visita comercial ${visit.visit_number ?? ""} (Zaire Field).`,
        created_by: userData.user?.id ?? null,
      })
      .select("id")
      .single();
    if (error || !data) { toast.error("Error al crear el lead"); setBusy(false); return; }
    toast.success("Lead creado desde la visita");
    router.push(ROUTES.crm.lead(data.id));
  }

  return (
    <Button variant="outline" onClick={createLead} disabled={busy}>
      <UserPlus className="w-4 h-4 mr-1.5" /> Crear lead
    </Button>
  );
}
