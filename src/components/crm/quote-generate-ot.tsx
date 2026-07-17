"use client";
// quote-generate-ot.tsx — src/components/crm/quote-generate-ot.tsx — 2026-07-18
// Fase E (CRM→Trace): genera una OT de Trace desde una cotización, con confirmación irreversible.
// Mapea los ítems de la cotización a work_order_items (currency dual ARS/USD). Gateado a crm+trace
// desde el padre (solo se renderiza si Trace está habilitado).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GitBranchPlus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import type { CrmQuote } from "@/lib/crm/types";

const BRANCH = "bb";

export function QuoteGenerateOt({ quote, currentProfile }: { quote: CrmQuote; currentProfile: { id: string } | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (quote.generated_work_order_id) {
    return (
      <Button asChild variant="outline">
        <Link href={ROUTES.trace.orden(quote.generated_work_order_id)}><ExternalLink className="w-4 h-4 mr-1.5" /> Ver OT generada</Link>
      </Button>
    );
  }

  async function generate() {
    if (!quote.client_id) { toast.error("La cotización no tiene cliente; no se puede generar la OT."); return; }
    setBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: orderNumber, error: seqError } = await sb.rpc("generate_order_number", { p_order_type: "OT", p_branch_id: BRANCH });
    if (seqError || !orderNumber) { toast.error("Error al generar el número de OT"); setBusy(false); return; }

    const today = new Date().toISOString().slice(0, 10);
    const isArs = quote.currency === "ARS";
    const { data: newOrder, error: orderError } = await sb.from("work_orders").insert({
      order_number: orderNumber, order_type: "OT", branch_id: BRANCH,
      client_id: quote.client_id, date_in: today, status: "ingresada", currency: quote.currency,
      subtotal: quote.subtotal, total: quote.total,
      general_notes: `Generada desde la cotización ${quote.quote_number ?? ""} (Zaire CRM).`,
      created_by: currentProfile?.id ?? null,
    }).select("id").single();
    if (orderError || !newOrder) { toast.error("Error al crear la OT"); setBusy(false); return; }

    const items = [...(quote.items ?? [])].sort((a, b) => a.item_number - b.item_number);
    if (items.length) {
      await sb.from("work_order_items").insert(items.map((it, i) => {
        const line = Number((it.quantity * it.unit_price).toFixed(2));
        return {
          work_order_id: newOrder.id, item_number: i + 1, product_id: it.product_id,
          custom_description: it.specs ? `${it.description} — ${it.specs}` : it.description,
          quantity: it.quantity,
          unit_price: isArs ? 0 : it.unit_price, total_price: isArs ? 0 : line,
          unit_price_ars: isArs ? it.unit_price : 0, total_price_ars: isArs ? line : 0,
          repair_required: false, status: "pendiente",
          is_quoted: true, is_remitted: false, qty_remitted: 0, is_delivered: false, qty_delivered: 0, is_invoiced: false, qty_invoiced: 0,
        };
      }));
    }

    await sb.from("crm_quotes").update({ generated_work_order_id: newOrder.id }).eq("id", quote.id);
    await sb.from("work_order_status_history").insert({
      work_order_id: newOrder.id, old_status: null, new_status: "ingresada",
      changed_by: currentProfile?.id ?? null, notes: "OT creada desde cotización de CRM",
    });
    await sb.from("audit_logs").insert({
      entity_type: "work_order", entity_id: newOrder.id, action: "create",
      description: `OT ${orderNumber} creada desde la cotización ${quote.quote_number ?? ""} (CRM)`,
      user_id: currentProfile?.id ?? null, user_name: null,
    });

    toast.success(`OT ${orderNumber} creada`);
    setBusy(false);
    router.push(ROUTES.trace.orden(newOrder.id));
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><GitBranchPlus className="w-4 h-4 mr-1.5" /> Generar OT</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Generar OT desde la cotización"
        description={`Se creará una Orden de Trabajo en Zaire Trace con los ${quote.items?.length ?? 0} ítem(s) de esta cotización. El admin completa el resto en Trace. Esta acción no puede revertirse.`}
        confirmLabel="Sí, generar OT"
        loading={busy}
        onConfirm={generate}
      />
    </>
  );
}
