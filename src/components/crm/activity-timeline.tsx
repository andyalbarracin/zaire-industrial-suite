// activity-timeline.tsx — src/components/crm/activity-timeline.tsx — 2026-07-17
// Timeline read-only de actividades para las fichas de detalle (lead/contacto/cuenta).

import { Phone, Mail, Users, StickyNote, ListChecks } from "lucide-react";
import { ACTIVITY_TYPE_LABELS } from "@/lib/crm/constants";
import { formatDateTime, cn } from "@/lib/utils";
import type { CrmActivity, ActivityType } from "@/lib/crm/types";

export const ACTIVITY_ICON: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  llamada: Phone, email: Mail, reunion: Users, nota: StickyNote, tarea: ListChecks,
};

export const ACTIVITY_STYLE: Record<ActivityType, string> = {
  llamada: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300",
  email: "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300",
  reunion: "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  nota: "bg-subtle-2 text-slate-600 dark:text-slate-300",
  tarea: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300",
};

export function ActivityTimeline({ activities, emptyLabel = "Sin actividades registradas." }: { activities: CrmActivity[]; emptyLabel?: string }) {
  if (activities.length === 0) {
    return <p className="text-sm text-(--zaire-text-muted) py-4 text-center">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {activities.map((a) => {
        const Icon = ACTIVITY_ICON[a.activity_type];
        return (
          <li key={a.id} className="flex gap-3 rounded-xl border border-(--zaire-border) bg-panel p-3">
            <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", ACTIVITY_STYLE[a.activity_type])}>
              <Icon className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-(--zaire-text-muted)">{ACTIVITY_TYPE_LABELS[a.activity_type]}</span>
                <span className="text-[11px] text-(--zaire-text-muted)">· {formatDateTime(a.created_at)}</span>
                {a.creator?.full_name && <span className="text-[11px] text-(--zaire-text-muted)">· {a.creator.full_name}</span>}
              </div>
              <p className={cn("text-sm font-medium text-(--zaire-text) mt-0.5", a.done && "line-through text-(--zaire-text-muted)")}>
                {a.subject ?? ACTIVITY_TYPE_LABELS[a.activity_type]}
              </p>
              {a.body && <p className="text-sm text-(--zaire-text-muted) mt-0.5 whitespace-pre-line">{a.body}</p>}
              {a.activity_type === "tarea" && a.due_at && (
                <p className="text-xs text-(--zaire-text-muted) mt-1">⏰ Vence {formatDateTime(a.due_at)}{a.done ? " · hecha" : ""}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
