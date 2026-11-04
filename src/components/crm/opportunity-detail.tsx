"use client";
// opportunity-detail.tsx — src/components/crm/opportunity-detail.tsx — 2026-11-02
// Zaire CRM — Ficha de una oportunidad: se ve y se edita en el mismo lugar.
//
// Por qué existe: leads, cuentas, contactos y cotizaciones ya tenían ficha propia; la
// oportunidad era la única que vivía dentro de un modal de edición. Y es la que más cosas tiene
// colgando (actividades, archivos, historial), así que era justo la que peor entraba en un
// diálogo.
//
// POR QUÉ SE EDITA EN LA PÁGINA Y NO EN UN MODAL
// Un modal obliga a elegir entre mirar y cambiar. Acá los campos son los mismos que se leen: se
// tocan y se guardan. El botón de guardar aparece **solo cuando algo cambió** — si está siempre
// activo no se sabe si queda algo sin guardar, que es la duda que hace apretar "Guardar" por las
// dudas al salir de cualquier pantalla.
//
// LA ETAPA ES LA EXCEPCIÓN: se guarda sola, apenas se elige.
// Mover de etapa es la acción más frecuente del pipeline y se hace de a una; pedir confirmación
// cada vez molesta. Cambiar el monto o la probabilidad sí amerita guardado explícito.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Plus, Save, Loader2, User, FileText, History, Paperclip,
  CalendarClock, CircleSlash,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientSelect } from "@/components/clients/client-select";
import { ActivityForm } from "./activity-form";
import { ActivityTimeline } from "./activity-timeline";
import { CrmAttachments } from "./crm-attachments";
import { OpportunityHistory } from "./opportunity-history";
import { logCrmAudit } from "@/lib/crm/audit";
import { stageBadge, stageDot } from "@/lib/crm/constants";
import { formatDate, cn } from "@/lib/utils";
import type { CrmOpportunity, CrmActivity, CrmAttachment, CrmPipelineStage, CrmCurrency } from "@/lib/crm/types";
import type { AuditLog, Client, Profile } from "@/lib/types/database";

/** Los campos editables, como texto: es lo que vive en los inputs. */
interface Form {
  title: string;
  client_id: string | null;
  amount: string;
  currency: CrmCurrency;
  probability: string;
  expected_close_date: string;
  owner_id: string;
  next_action_at: string;
  notes: string;
}

const NONE = "none";

function toForm(o: CrmOpportunity): Form {
  return {
    title: o.title,
    client_id: o.client_id,
    amount: o.amount != null ? String(o.amount) : "",
    currency: o.currency,
    probability: o.probability != null ? String(o.probability) : "",
    expected_close_date: o.expected_close_date ?? "",
    owner_id: o.owner_id ?? NONE,
    next_action_at: o.next_action_at ? o.next_action_at.slice(0, 16) : "",
    notes: o.notes ?? "",
  };
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function OpportunityDetail({
  opportunity, activities, attachments, history, stages, clients, profiles, currentProfile,
}: {
  opportunity: CrmOpportunity;
  activities: CrmActivity[];
  attachments: CrmAttachment[];
  history: AuditLog[];
  stages: CrmPipelineStage[];
  clients: Client[];
  profiles: Pick<Profile, "id" | "full_name">[];
  currentProfile: { id: string } | null;
}) {
  const router = useRouter();
  const inicial = useMemo(() => toForm(opportunity), [opportunity]);
  const [f, setF] = useState<Form>(inicial);
  const [stage, setStage] = useState(opportunity.stage);
  const [saving, setSaving] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [tab, setTab] = useState<"actividades" | "archivos" | "historial">("actividades");

  // "Cambió algo" se decide comparando contra lo que vino del servidor, no con un flag que se
  // prende al primer tecleo: si el usuario escribe y después deshace, el botón vuelve a apagarse.
  const dirty = useMemo(
    () => (Object.keys(inicial) as (keyof Form)[]).some((k) => f[k] !== inicial[k]),
    [f, inicial],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const stageInfo = stages.find((s) => s.key === stage);
  const stageColor = stageInfo?.color ?? "slate";

  async function guardar() {
    if (!dirty || !f.title.trim()) {
      if (!f.title.trim()) toast.error("El título no puede quedar vacío");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("crm_opportunities").update({
      title: f.title.trim(),
      client_id: f.client_id,
      amount: num(f.amount),
      currency: f.currency,
      probability: num(f.probability),
      expected_close_date: f.expected_close_date || null,
      owner_id: f.owner_id === NONE ? null : f.owner_id,
      next_action_at: f.next_action_at ? new Date(f.next_action_at).toISOString() : null,
      notes: f.notes.trim() || null,
    }).eq("id", opportunity.id);
    setSaving(false);

    if (error) {
      // Los datos quedan en pantalla para reintentar: perder lo escrito es peor que el error.
      toast.error("No se pudo guardar. Lo que escribiste sigue acá, probá de nuevo.");
      return;
    }
    void logCrmAudit("crm_opportunity", opportunity.id, "update", `Oportunidad actualizada: ${f.title.trim()}`);
    toast.success("Cambios guardados");
    router.refresh();
  }

  async function cambiarEtapa(next: string) {
    const anterior = stage;
    setStage(next);                                  // la UI responde ya; si falla, se revierte
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("crm_opportunities").update({ stage: next }).eq("id", opportunity.id);
    if (error) {
      setStage(anterior);
      toast.error("No se pudo cambiar la etapa");
      return;
    }
    const nombre = stages.find((s) => s.key === next)?.name ?? next;
    void logCrmAudit("crm_opportunity", opportunity.id, "status_change", `Etapa → ${nombre}`);
    toast.success(`Etapa: ${nombre}`);
    router.refresh();
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={ROUTES.crm.pipeline} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver al pipeline
          </Link>
          {/* El título se edita donde se lee: no hay una versión "de lectura" y otra "de edición". */}
          <input
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            aria-label="Título de la oportunidad"
            className="text-2xl font-bold text-(--zaire-text) bg-transparent border-b border-transparent hover:border-(--zaire-border) focus:border-zaire-blue focus:outline-none w-full max-w-2xl"
          />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", stageBadge(stageColor))}>
              <span className={cn("w-1.5 h-1.5 rounded-full", stageDot(stageColor))} />
              {stageInfo?.name ?? stage}
            </span>
            {opportunity.closed_at && (
              <span className="inline-flex items-center gap-1 text-xs text-(--zaire-text-muted)">
                <CircleSlash className="w-3.5 h-3.5" /> Cerrada el {formatDate(opportunity.closed_at)}
              </span>
            )}
          </div>
        </div>

        {/* La etapa se guarda sola: es la acción más frecuente del tablero. */}
        <div className="space-y-1.5 w-56">
          <Label>Etapa</Label>
          <Select value={stage} onValueChange={(v) => v && v !== stage && cambiarEtapa(v)}>
            <SelectTrigger className="w-full"><SelectValue>{stageInfo?.name ?? stage}</SelectValue></SelectTrigger>
            <SelectContent>
              {stages.map((s) => (<SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-(--zaire-text-muted)">Se guarda al elegirla.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Datos, editables */}
        <div className="zaire-card p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <ClientSelect clients={clients} value={f.client_id} onChange={(v) => set("client_id", v)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" type="number" step="any" value={f.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={f.currency} onValueChange={(v) => set("currency", (v as CrmCurrency) ?? "ARS")}>
                <SelectTrigger className="w-full"><SelectValue>{f.currency}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="probability">Probabilidad (%)</Label>
              <Input id="probability" type="number" min={0} max={100} value={f.probability} onChange={(e) => set("probability", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="close">Cierre estimado</Label>
              <Input id="close" type="date" value={f.expected_close_date} onChange={(e) => set("expected_close_date", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Responsable</Label>
            <Select value={f.owner_id} onValueChange={(v) => set("owner_id", v ?? NONE)}>
              <SelectTrigger className="w-full">
                <SelectValue>{profiles.find((p) => p.id === f.owner_id)?.full_name ?? "Sin asignar"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin asignar</SelectItem>
                {profiles.map((p) => (<SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="next">Próxima acción</Label>
            <Input id="next" type="datetime-local" value={f.next_action_at} onChange={(e) => set("next_action_at", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={4} value={f.notes} onChange={(e) => set("notes", e.target.value)}
                      placeholder="Contexto, condiciones habladas, con quién se está negociando…" />
          </div>

          {/* Datos que no se editan desde acá: son vínculos, no campos. */}
          {(opportunity.contact_id || opportunity.lead_id) && (
            <div className="pt-3 border-t border-(--zaire-border) space-y-1.5 text-sm">
              {opportunity.contact_id && (
                <Vinculo icon={User} label="Contacto"
                         text={opportunity.contact?.full_name ?? "Contacto"}
                         href={ROUTES.crm.contacto(opportunity.contact_id)} />
              )}
              {opportunity.lead_id && (
                <Vinculo icon={FileText} label="Lead de origen"
                         text={opportunity.lead?.company_name ?? opportunity.lead?.contact_name ?? "Lead"}
                         href={ROUTES.crm.lead(opportunity.lead_id)} />
              )}
            </div>
          )}
        </div>

        {/* Actividades · Archivos · Historial */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex rounded-lg border border-(--zaire-border) overflow-hidden">
              <Tab on={tab === "actividades"} onClick={() => setTab("actividades")} icon={CalendarClock}>
                Actividades ({activities.length})
              </Tab>
              <Tab on={tab === "archivos"} onClick={() => setTab("archivos")} icon={Paperclip}>
                Archivos ({attachments.length})
              </Tab>
              <Tab on={tab === "historial"} onClick={() => setTab("historial")} icon={History}>
                Historial ({history.length})
              </Tab>
            </div>
            {tab === "actividades" && (
              <Button variant="outline" size="sm" onClick={() => setActivityOpen(true)} className="h-9">
                <Plus className="w-4 h-4 mr-1.5" /> Agregar actividad
              </Button>
            )}
          </div>

          {tab === "actividades" && (
            <div className="zaire-card p-5">
              <ActivityTimeline
                activities={activities}
                emptyLabel="Sin actividades todavía. Las que cargues acá también aparecen en la sección Actividades."
              />
            </div>
          )}
          {tab === "archivos" && (
            <CrmAttachments
              entityType="opportunity" entityId={opportunity.id}
              initialAttachments={attachments} currentProfile={currentProfile}
            />
          )}
          {tab === "historial" && <OpportunityHistory entries={history} />}
        </div>
      </div>

      {/* Barra fija: aparece solo cuando hay algo sin guardar. Si estuviera siempre, no se
          distinguiría "no toqué nada" de "toqué y me falta guardar". */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-(--zaire-border) bg-(--zaire-bg)/95 backdrop-blur px-4 py-3">
          <div className="flex items-center justify-end gap-3 max-w-(--breakpoint-2xl) mx-auto">
            <span className="text-xs text-(--zaire-text-muted) mr-auto">Hay cambios sin guardar</span>
            <Button variant="outline" onClick={() => setF(inicial)} disabled={saving}>Descartar</Button>
            <Button onClick={guardar} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      )}

      {/* La actividad nace con esta oportunidad y su cliente ya puestos. Si es del tipo "tarea"
          y tiene fecha, aparece sola en la campana. */}
      <ActivityForm
        open={activityOpen} onOpenChange={setActivityOpen}
        activity={null}
        clients={clients}
        opportunities={[{ id: opportunity.id, title: opportunity.title, client_id: opportunity.client_id }]}
        preset={{ clientId: f.client_id, opportunityId: opportunity.id }}
        onSaved={() => { setActivityOpen(false); router.refresh(); }}
      />
    </div>
  );
}

function Tab({
  on, onClick, icon: Icon, children,
}: {
  on: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 h-9 text-sm font-medium cursor-pointer transition-colors",
        on ? "bg-zaire-blue/10 text-zaire-blue" : "text-(--zaire-text-muted) hover:bg-subtle",
      )}
    >
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

function Vinculo({
  icon: Icon, label, text, href,
}: {
  icon: React.ElementType; label: string; text: string; href: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-(--zaire-text-muted) shrink-0 mt-0.5" />
      <span className="text-(--zaire-text-muted) w-28 shrink-0">{label}</span>
      <Link href={href} className="text-(--zaire-text) hover:text-zaire-blue hover:underline break-words">{text}</Link>
    </div>
  );
}
