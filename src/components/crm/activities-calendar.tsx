"use client";
// activities-calendar.tsx — src/components/crm/activities-calendar.tsx — 2026-07-17
// Vista Calendario (mes) de actividades: cada actividad se ubica por su fecha relevante
// (due_at para tareas, si no created_at). Click en una actividad abre el form (editar).

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPE_LABELS } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";
import type { CrmActivity, ActivityType } from "@/lib/crm/types";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const TYPE_CHIP: Record<ActivityType, string> = {
  llamada: "bg-blue-100 text-blue-700",
  email: "bg-violet-100 text-violet-700",
  reunion: "bg-cyan-100 text-cyan-700",
  nota: "bg-slate-100 text-slate-700",
  tarea: "bg-amber-100 text-amber-800",
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ActivitiesCalendar({ activities, onSelect }: { activities: CrmActivity[]; onSelect: (a: CrmActivity) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const byDay = useMemo(() => {
    const map = new Map<string, CrmActivity[]>();
    for (const a of activities) {
      const when = a.due_at ?? a.created_at;
      if (!when) continue;
      const k = dateKey(new Date(when));
      const list = map.get(k);
      if (list) list.push(a);
      else map.set(k, [a]);
    }
    return map;
  }, [activities]);

  // Grilla: arranca el lunes de la semana del día 1, 6 semanas (42 celdas).
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const todayKey = dateKey(new Date());

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-(--zaire-text)">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h3>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())} className="h-8">Hoy</Button>
          <Button variant="outline" size="sm" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-(--zaire-border) rounded-lg overflow-hidden border border-(--zaire-border)">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-(--zaire-text-muted) px-2 py-1.5 text-center">{w}</div>
        ))}
        {cells.map((d, i) => {
          const k = dateKey(d);
          const list = byDay.get(k) ?? [];
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = k === todayKey;
          return (
            <div key={i} className={cn("bg-white min-h-24 p-1.5 flex flex-col gap-1", !inMonth && "bg-slate-50/60")}>
              <span className={cn("text-[11px] font-medium self-end w-5 h-5 flex items-center justify-center rounded-full", isToday ? "bg-zaire-navy text-white" : inMonth ? "text-(--zaire-text)" : "text-(--zaire-text-muted)")}>{d.getDate()}</span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {list.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    title={`${ACTIVITY_TYPE_LABELS[a.activity_type]}: ${a.subject ?? ""}`}
                    className={cn("text-[10px] leading-tight text-left truncate rounded px-1 py-0.5 hover:opacity-80", TYPE_CHIP[a.activity_type], a.done && "line-through opacity-60")}
                  >
                    {a.subject ?? ACTIVITY_TYPE_LABELS[a.activity_type]}
                  </button>
                ))}
                {list.length > 3 && <span className="text-[10px] text-(--zaire-text-muted) px-1">+{list.length - 3} más</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
