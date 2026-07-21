"use client";
// register-asset-service.tsx — src/components/assets/register-asset-service.tsx — 2026-07-20
// Cross-módulo Assets↔Trace/Field (gateado): registrar un evento en la hoja de vida de un equipo
// desde una OT o visita. Autocontenido: fetchea los equipos al abrir; NO cambia props del server page.

import { useState } from "react";
import { Cog, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { isModuleEnabled } from "@/lib/modules";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_TYPE_LABELS } from "@/lib/assets/constants";
import { logAssetAudit } from "@/lib/assets/audit";
import type { EventType, Currency } from "@/lib/assets/types";

interface Props {
  refType: "ot" | "visita";
  refId: string;
  defaultCost?: number | null;
  defaultDescription?: string;
}

export function RegisterAssetService({ refType, refId, defaultCost, defaultDescription }: Props) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<{ id: string; name: string; tag: string | null }[]>([]);
  const [assetId, setAssetId] = useState("");
  const [type, setType] = useState<EventType>("servicio");
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [cost, setCost] = useState(defaultCost != null ? String(defaultCost) : "");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isModuleEnabled("assets")) return null;

  async function onOpen() {
    setOpen(true); setLoading(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data } = await sb.from("assets").select("id, name, tag").is("deleted_at", null).order("name");
    setAssets((data ?? []) as { id: string; name: string; tag: string | null }[]);
    setLoading(false);
  }

  async function save() {
    if (!assetId) return;
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await sb.from("asset_events").insert({
      asset_id: assetId, type, event_date: new Date().toISOString().slice(0, 10),
      description: description || null, ref_type: refType, ref_id: refId,
      cost: cost.trim() !== "" ? Number(cost) : null, currency, created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error("No se pudo registrar el evento"); return; }
    logAssetAudit("asset", assetId, "event", `Evento ${EVENT_TYPE_LABELS[type]} desde ${refType.toUpperCase()}`);
    toast.success("Registrado en la hoja de vida del equipo");
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={onOpen}><Cog className="w-3.5 h-3.5 mr-1.5" /> Registrar en equipo</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar en la hoja de vida de un equipo</DialogTitle></DialogHeader>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-(--zaire-text-muted)" /></div>
          ) : assets.length === 0 ? (
            <p className="text-sm text-(--zaire-text-muted) py-6 text-center">No hay equipos. Creá uno en Zaire Assets → Equipos.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Equipo *</Label>
                <Select value={assetId} onValueChange={(v) => setAssetId(v ?? "")}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Elegir equipo">{assets.find((a) => a.id === assetId)?.name}</SelectValue></SelectTrigger>
                  <SelectContent>{assets.map((a) => (<SelectItem key={a.id} value={a.id}>{a.tag ? `[${a.tag}] ` : ""}{a.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de evento</Label>
                  <Select value={type} onValueChange={(v) => setType((v as EventType) ?? "servicio")}>
                    <SelectTrigger className="mt-1"><SelectValue>{EVENT_TYPE_LABELS[type]}</SelectValue></SelectTrigger>
                    <SelectContent>{(["servicio", "inspeccion", "falla", "nota"] as EventType[]).map((t) => (<SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Costo</Label><Input type="number" step="any" value={cost} onChange={(e) => setCost(e.target.value)} className="mt-1" /></div>
                  <div>
                    <Label>Moneda</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency((v as Currency) ?? "ARS")}>
                      <SelectTrigger className="mt-1"><SelectValue>{currency}</SelectValue></SelectTrigger>
                      <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div><Label>Descripción</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" /></div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={save} disabled={!assetId || saving}>{saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Registrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
