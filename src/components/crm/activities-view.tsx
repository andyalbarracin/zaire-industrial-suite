"use client";
// activities-view.tsx — src/components/crm/activities-view.tsx — 2026-07-16
// Timeline de actividades comerciales: filtro por tipo, alta/edición y (para tareas)
// marcar como hecha. Reemplaza el "timeline de visitas" de Field como referencia.

import { useState, useMemo } from "react";
import { Plus, Search, Phone, Mail, Users, StickyNote, ListChecks, Pencil, List, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterBar } from "@/components/field/filter-bar";
import { LimitNotice } from "@/components/shared/limit-notice";
import { ActivityForm } from "./activity-form";
import { ActivitiesCalendar } from "./activities-calendar";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, ACTIVITIES_LIMIT } from "@/lib/crm/constants";
import { formatDateTime, cn } from "@/lib/utils";
import type { CrmActivity, ActivityType, CrmOpportunity, Client } from "@/lib/crm/types";

const TYPE_ICON: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  llamada: Phone,
  email: Mail,
  reunion: Users,
  nota: StickyNote,
  tarea: ListChecks,
};

const TYPE_STYLE: Record<ActivityType, string> = {
  llamada: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300",
  email: "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300",
  reunion: "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  nota: "bg-subtle-2 text-slate-600 dark:text-slate-300",
  tarea: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300",
};

interface ActivitiesViewProps {
  initialActivities: CrmActivity[];
  clients: Client[];
  opportunities: Pick<CrmOpportunity, "id" | "title" | "client_id">[];
}

export function ActivitiesView({ initialActivities, clients, opportunities }: ActivitiesViewProps) {
  const [activities, setActivities] = useState<CrmActivity[]>(initialActivities);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrmActivity | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return activities.filter((a) => {
      if (typeFilter && a.activity_type !== typeFilter) return false;
      if (s) {
        const hay = `${a.subject ?? ""} ${a.body ?? ""} ${a.client?.business_name ?? ""} ${a.opportunity?.title ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [activities, search, typeFilter]);

  function handleSaved(a: CrmActivity) {
    setActivities((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...a }; return next; }
      return [a, ...prev];
    });
  }

  async function toggleDone(a: CrmActivity) {
    const nextDone = !a.done;
    const doneAt = nextDone ? new Date().toISOString() : null;
    // Optimista
    setActivities((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: nextDone, done_at: doneAt } : x)));
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await sb.from("crm_activities").update({ done: nextDone, done_at: doneAt }).eq("id", a.id);
    if (error) {
      toast.error("No se pudo actualizar la tarea");
      setActivities((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: a.done, done_at: a.done_at } : x)));
    }
  }

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(a: CrmActivity) { setEditing(a); setFormOpen(true); }

  return (
    <div className="space-y-4">
      <LimitNotice count={activities.length} limit={ACTIVITIES_LIMIT} />

      <div className="zaire-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--zaire-border)">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
            <Input placeholder="Buscar actividades..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-(--zaire-border) overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={cn("flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition-colors", view === "list" ? "bg-zaire-navy text-white" : "bg-panel text-(--zaire-text-muted) hover:bg-subtle")}
              >
                <List className="w-4 h-4" /> Lista
              </button>
              <button
                onClick={() => setView("calendar")}
                className={cn("flex items-center gap-1.5 px-3 h-9 text-sm font-medium transition-colors border-l border-(--zaire-border)", view === "calendar" ? "bg-zaire-navy text-white" : "bg-panel text-(--zaire-text-muted) hover:bg-subtle")}
              >
                <CalendarDays className="w-4 h-4" /> Calendario
              </button>
            </div>
            <Button onClick={openNew} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9"><Plus className="w-4 h-4 mr-1.5" /> Nueva Actividad</Button>
          </div>
        </div>

        {view === "list" && (
          <FilterBar
            groups={[
              {
                key: "tipo", label: "Tipo",
                options: ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label })),
                selected: typeFilter ? [typeFilter] : [],
                onToggle: (v) => setTypeFilter(typeFilter === v ? "" : v),
              },
            ]}
            onClear={() => setTypeFilter("")}
          />
        )}

        {view === "calendar" ? (
          <ActivitiesCalendar activities={filtered} onSelect={openEdit} />
        ) : (
        <div className="p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-(--zaire-text-muted) text-center py-12">No hay actividades registradas.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((a) => {
                const Icon = TYPE_ICON[a.activity_type];
                const parent = a.client?.business_name ?? a.lead?.company_name ?? a.lead?.contact_name ?? null;
                return (
                  <li key={a.id} className="group flex gap-3 rounded-xl border border-(--zaire-border) bg-panel p-3 hover:bg-subtle/60">
                    <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", TYPE_STYLE[a.activity_type])}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-(--zaire-text-muted)">{ACTIVITY_TYPE_LABELS[a.activity_type]}</span>
                        <span className="text-[11px] text-(--zaire-text-muted)">· {formatDateTime(a.created_at)}</span>
                        {a.creator?.full_name && <span className="text-[11px] text-(--zaire-text-muted)">· {a.creator.full_name}</span>}
                      </div>
                      <p className={cn("text-sm font-medium text-(--zaire-text) mt-0.5", a.done && "line-through text-(--zaire-text-muted)")}>
                        {a.subject ?? ACTIVITY_TYPE_LABELS[a.activity_type]}
                      </p>
                      {a.body && <p className="text-sm text-(--zaire-text-muted) mt-0.5 whitespace-pre-line">{a.body}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-(--zaire-text-muted)">
                        {parent && <span>👤 {parent}</span>}
                        {a.opportunity?.title && <span>🎯 {a.opportunity.title}</span>}
                        {a.activity_type === "tarea" && a.due_at && <span>⏰ Vence {formatDateTime(a.due_at)}</span>}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      {a.activity_type === "tarea" && (
                        <label className="flex items-center gap-1.5 text-xs text-(--zaire-text-muted) cursor-pointer">
                          <Checkbox checked={a.done} onCheckedChange={() => toggleDone(a)} />
                          {a.done ? "Hecha" : "Pendiente"}
                        </label>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        )}
      </div>

      <ActivityForm open={formOpen} onOpenChange={setFormOpen} activity={editing} clients={clients} opportunities={opportunities} onSaved={handleSaved} />
    </div>
  );
}
