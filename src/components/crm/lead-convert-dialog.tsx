"use client";
// lead-convert-dialog.tsx — src/components/crm/lead-convert-dialog.tsx — 2026-07-16
// Convierte un lead en cliente (master data compartida). Crea el clients, arrastra el
// contacto a crm_contacts y, opcionalmente, abre una oportunidad en el pipeline.
// Regla de oro del CRM: el cliente recién existe al convertir (no antes).

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logCrmAudit } from "@/lib/crm/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CrmLead } from "@/lib/crm/types";

interface LeadConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CrmLead | null;
  onConverted: (leadId: string, clientId: string) => void;
}

interface ConvertForm {
  business_name: string;
  tax_id: string;
  create_opportunity: boolean;
}

export function LeadConvertDialog({ open, onOpenChange, lead, onConverted }: LeadConvertDialogProps) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<ConvertForm>({
    defaultValues: { business_name: "", tax_id: "", create_opportunity: true },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && lead) {
      reset({ business_name: lead.company_name || lead.contact_name || "", tax_id: "", create_opportunity: true });
    }
  }, [open, lead, reset]);

  const createOpportunity = watch("create_opportunity");

  async function onConvert(form: ConvertForm) {
    if (!lead) return;
    const businessName = form.business_name.trim();
    if (!businessName) { toast.error("La razón social es obligatoria"); return; }
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // 1) Crear el cliente (master data compartida de la suite)
    const { data: client, error: clientErr } = await sb
      .from("clients")
      .insert({
        business_name: businessName,
        tax_id: form.tax_id.trim() || null,
        contact_name: lead.contact_name || null,
        email: lead.email || null,
        phone: lead.phone || null,
        is_active: true,
      })
      .select()
      .single();
    if (clientErr || !client) { toast.error("Error al crear el cliente"); setSaving(false); return; }

    // 2) Marcar el lead como convertido y enlazarlo
    const { error: leadErr } = await sb
      .from("crm_leads")
      .update({ status: "convertido", converted_client_id: client.id, converted_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (leadErr) { toast.error("Cliente creado, pero falló al enlazar el lead"); setSaving(false); return; }

    // 3) Arrastrar el contacto del lead a crm_contacts (si tenía nombre)
    if (lead.contact_name) {
      await sb.from("crm_contacts").insert({
        client_id: client.id,
        full_name: lead.contact_name,
        email: lead.email || null,
        phone: lead.phone || null,
        is_primary: true,
      });
    }

    // 4) Oportunidad opcional en el pipeline (etapa inicial)
    if (form.create_opportunity) {
      await sb.from("crm_opportunities").insert({
        title: `Oportunidad ${businessName}`,
        client_id: client.id,
        stage: "prospecto",
        amount: lead.estimated_value,
        currency: lead.currency,
        owner_id: lead.owner_id,
      });
    }

    void logCrmAudit("crm_lead", lead.id, "update", `Lead convertido a cliente: ${businessName}`);
    toast.success("Lead convertido a cliente");
    setSaving(false);
    onConverted(lead.id, client.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-zaire-blue" /> Convertir lead en cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onConvert)} className="space-y-4 mt-2">
          <p className="text-sm text-(--zaire-text-muted)">
            Se creará un cliente en la master data de la suite (disponible para Trace y Field). El lead
            quedará marcado como <span className="font-medium text-(--zaire-text)">convertido</span>.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="business_name">Razón social *</Label>
            <Input id="business_name" {...register("business_name")} placeholder="Razón social" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tax_id">CUIT</Label>
            <Input id="tax_id" {...register("tax_id")} placeholder="30-12345678-9 (opcional)" />
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-(--zaire-border) p-3">
            <Switch id="create_opp" checked={createOpportunity} onCheckedChange={(v) => setValue("create_opportunity", v)} />
            <Label htmlFor="create_opp" className="font-normal">
              Abrir una oportunidad en el pipeline con este cliente
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Convertir a cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
