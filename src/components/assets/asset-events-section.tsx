"use client";
// asset-events-section.tsx — src/components/assets/asset-events-section.tsx — 2026-07-20
// Hoja de vida del equipo: timeline + agregar evento (asset_events, ref_type=manual). Refresca el server.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPE_LABELS, EVENT_TYPE_BADGE } from "@/lib/assets/constants";
import { logAssetAudit } from "@/lib/assets/audit";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import type { AssetEvent, EventType, Currency } from "@/lib/assets/types";

export function AssetEventsSection({ assetId, events }: { assetId: string; events: AssetEvent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EventType>("servicio");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [downtime, setDowntime] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await sb.from("asset_events").insert({
      asset_id: assetId, type, event_date: date, description: description || null, ref_type: "manual",
      cost: cost.trim() !== "" ? Number(cost) : null, currency,
      downtime_hours: downtime.trim() !== "" ? Number(downtime) : null, created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error("No se pudo agregar el evento"); return; }
    logAssetAudit("asset", assetId, "event", `Evento ${EVENT_TYPE_LABELS[type]} agregado`);
    toast.success("Evento agregado");
    setDescription(""); setCost(""); setDowntime(""); setType("servicio"); setOpen(false);
    router.refresh();
  }

  return (
    <div className="zaire-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-(--zaire-border)">
        <h3 className="font-semibold text-(--zaire-text)">Hoja de vida</h3>
        <Button size="sm" onClick={() => setOpen(true)} className="h-8"><Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar evento</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
            <tr><th className="text-left px-5 py-2.5">Fecha</th><th className="text-left px-5 py-2.5">Tipo</th><th className="text-left px-5 py-2.5">Descripción</th><th className="text-right px-5 py-2.5">Costo</th><th className="text-right px-5 py-2.5">Parada</th></tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="px-5 py-2.5 text-(--zaire-text-muted) whitespace-nowrap">{formatDate(e.event_date)}</td>
                <td className="px-5 py-2.5"><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", EVENT_TYPE_BADGE[e.type])}>{EVENT_TYPE_LABELS[e.type]}</span></td>
                <td className="px-5 py-2.5 text-(--zaire-text)">{e.description ?? "—"}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-(--zaire-text-muted)">{e.cost != null ? formatCurrency(e.cost, e.currency) : "—"}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-(--zaire-text-muted)">{e.downtime_hours != null ? `${e.downtime_hours} h` : "—"}</td>
              </tr>
            ))}
            {events.length === 0 && (<tr><td colSpan={5} className="px-5 py-8 text-center text-(--zaire-text-muted)">Sin eventos aún</td></tr>)}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Agregar evento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType((v as EventType) ?? "servicio")}>
                  <SelectTrigger className="mt-1"><SelectValue>{EVENT_TYPE_LABELS[type]}</SelectValue></SelectTrigger>
                  <SelectContent>{Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" /></div>
            </div>
            <div><Label>Descripción</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Costo</Label><Input type="number" step="any" value={cost} onChange={(e) => setCost(e.target.value)} className="mt-1" /></div>
              <div>
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={(v) => setCurrency((v as Currency) ?? "ARS")}>
                  <SelectTrigger className="mt-1"><SelectValue>{currency}</SelectValue></SelectTrigger>
                  <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Parada (h)</Label><Input type="number" step="any" value={downtime} onChange={(e) => setDowntime(e.target.value)} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="button" onClick={add} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
