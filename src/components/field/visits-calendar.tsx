"use client";
// visits-calendar.tsx — src/components/field/visits-calendar.tsx — 2026-07-22
// Vista calendario (mensual) de las visitas de Zaire Field. Ubica cada visita en su día
// (scheduled_at), coloreada por estado y clickeable al detalle. Complementa la vista lista.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { VISIT_STATUS_COLORS, VISIT_STATUS_LABELS, VISIT_STATUSES } from "@/lib/field/constants";
import type { FieldVisit, VisitStatus } from "@/lib/field/types";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export function VisitsCalendar({ visits }: { visits: FieldVisit[] }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  // Visitas agrupadas por día (solo las que tienen fecha agendada).
  const byDay = useMemo(() => {
    const m: Record<string, FieldVisit[]> = {};
    for (const v of visits) {
      if (!v.scheduled_at) continue;
      const d = new Date(v.scheduled_at);
      (m[dayKey(d)] ??= []).push(v);
    }
    for (const k in m) m[k].sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1));
    return m;
  }, [visits]);

  const noDate = useMemo(() => visits.filter((v) => !v.scheduled_at).length, [visits]);

  // Grilla de 6 semanas (42 días) que arranca el lunes de la semana del día 1.
  const days = useMemo(() => {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (monthStart.getDay() + 6) % 7; // lunes = 0
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const todayKey = dayKey(new Date());
  const month = cursor.getMonth();

  return (
    <div className="p-4">
      {/* Navegación de mes */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="w-8 h-8 grid place-items-center rounded-lg border border-(--zaire-border) text-(--zaire-text-muted) hover:bg-(--hover) hover:text-(--zaire-text) transition-colors" title="Mes anterior"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); }} className="h-8 px-3 rounded-lg border border-(--zaire-border) text-xs font-medium text-(--zaire-text-muted) hover:bg-(--hover) hover:text-(--zaire-text) transition-colors">Hoy</button>
          <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="w-8 h-8 grid place-items-center rounded-lg border border-(--zaire-border) text-(--zaire-text-muted) hover:bg-(--hover) hover:text-(--zaire-text) transition-colors" title="Mes siguiente"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <h3 className="text-sm font-semibold text-(--zaire-text) capitalize">{monthLabel}</h3>
        <div className="text-xs text-(--zaire-text-muted) text-right">{visits.length} visita(s){noDate > 0 ? ` · ${noDate} sin fecha` : ""}</div>
      </div>

      {/* Grilla del mes */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-(--zaire-text-muted)">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-t border-l border-(--zaire-border)">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === month;
              const isToday = dayKey(d) === todayKey;
              const dayVisits = byDay[dayKey(d)] ?? [];
              return (
                <div key={i} className={cn("min-h-[104px] border-r border-b border-(--zaire-border) p-1.5", !inMonth && "bg-subtle/40")}>
                  <div className="flex items-center justify-end mb-1">
                    <span className={cn("inline-grid place-items-center w-5 h-5 rounded-full text-xs", isToday ? "bg-zaire-navy text-white font-semibold" : inMonth ? "text-(--zaire-text)" : "text-(--zaire-text-muted)")}>{d.getDate()}</span>
                  </div>
                  <div className="space-y-1">
                    {dayVisits.slice(0, 3).map((v) => (
                      <Link
                        key={v.id}
                        href={ROUTES.field.visita(v.id)}
                        title={`${hhmm(v.scheduled_at!)} · ${VISIT_STATUS_LABELS[v.status]} · ${v.client?.business_name ?? v.site?.name ?? ""}`}
                        className={cn("block rounded px-1.5 py-1 text-[11px] leading-tight border truncate hover:opacity-80 transition-opacity", VISIT_STATUS_COLORS[v.status])}
                      >
                        <span className="font-semibold">{hhmm(v.scheduled_at!)}</span> {v.client?.business_name ?? v.site?.name ?? v.visit_number ?? "Visita"}
                      </Link>
                    ))}
                    {dayVisits.length > 3 && (
                      <div className="text-[10px] text-(--zaire-text-muted) px-1">+{dayVisits.length - 3} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leyenda de estados */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-(--zaire-border)">
        {VISIT_STATUSES.map((s) => (
          <span key={s.value} className="inline-flex items-center gap-1.5 text-xs text-(--zaire-text-muted)">
            <span className={cn("inline-block w-2.5 h-2.5 rounded-full border", VISIT_STATUS_COLORS[s.value as VisitStatus])} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
