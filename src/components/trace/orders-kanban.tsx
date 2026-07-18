"use client";
// orders-kanban.tsx — src/components/trace/orders-kanban.tsx — 2026-07-16
// Tablero Kanban de órdenes por estado. Drag-and-drop para cambiar estado respetando
// STATUS_TRANSITIONS, con el mismo modal de confirmación + auditoría que el detalle de OT.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OrderTypeBadge } from "./order-status-badge";
import { ROUTES } from "@/lib/routes";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, STATUS_TRANSITIONS } from "@/lib/trace/constants";
import { BRANCHES } from "@/lib/constants";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import type { OrderStatus, OrderType, Currency } from "@/lib/types/database";
import type { OrderRow } from "./orders-table";

// Punto de color por estado (clases literales para Tailwind).
const DOT: Record<string, string> = {
  slate: "bg-slate-400", blue: "bg-blue-500", violet: "bg-violet-500", cyan: "bg-cyan-500",
  amber: "bg-amber-500", lime: "bg-lime-500", green: "bg-green-500", indigo: "bg-indigo-500", red: "bg-red-500",
};

interface OrdersKanbanProps {
  orders: OrderRow[];
  currentProfile: { id: string; full_name: string } | null;
}

export function OrdersKanban({ orders, currentProfile }: OrdersKanbanProps) {
  const router = useRouter();
  const [dragging, setDragging] = useState<{ id: string; status: string } | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ order: OrderRow; target: OrderStatus } | null>(null);
  const [saving, setSaving] = useState(false);

  const byStatus = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    for (const s of ORDER_STATUSES) map.set(s.value, []);
    for (const o of orders) {
      const list = map.get(o.status);
      if (list) list.push(o);
      else map.set(o.status, [o]); // estado desconocido: no perder la tarjeta
    }
    return map;
  }, [orders]);

  const canDrop = (target: string) =>
    !!dragging && dragging.status !== target && (STATUS_TRANSITIONS[dragging.status] ?? []).includes(target);

  function handleDrop(target: string) {
    const drag = dragging;
    setOverStatus(null);
    setDragging(null);
    if (!drag || drag.status === target) return;
    const order = orders.find((o) => o.id === drag.id);
    if (!order) return;
    if (!(STATUS_TRANSITIONS[drag.status] ?? []).includes(target)) {
      toast.error(`No se puede pasar de "${ORDER_STATUS_LABELS[drag.status as OrderStatus]}" a "${ORDER_STATUS_LABELS[target as OrderStatus]}"`);
      return;
    }
    setConfirm({ order, target: target as OrderStatus });
  }

  async function doStatusChange() {
    if (!confirm) return;
    const { order, target } = confirm;
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { error } = await sb.from("work_orders").update({ status: target }).eq("id", order.id);
    if (error) { toast.error("Error al cambiar el estado"); setSaving(false); return; }

    await sb.from("work_order_status_history").insert({
      work_order_id: order.id, old_status: order.status, new_status: target,
      changed_by: currentProfile?.id ?? null, notes: null,
    });
    await sb.from("audit_logs").insert({
      entity_type: "work_order", entity_id: order.id, action: "status_change",
      description: `Estado cambiado: ${ORDER_STATUS_LABELS[order.status as OrderStatus]} → ${ORDER_STATUS_LABELS[target]}`,
      user_id: currentProfile?.id ?? null, user_name: currentProfile?.full_name ?? null,
    });

    toast.success(`${order.order_number}: ${ORDER_STATUS_LABELS[target]}`);
    setSaving(false);
    setConfirm(null);
    router.refresh();
  }

  return (
    <>
      <div className="overflow-x-auto p-4">
        <div className="flex gap-3 min-w-max pb-2">
          {ORDER_STATUSES.map((col) => {
            const list = byStatus.get(col.value) ?? [];
            const isTarget = overStatus === col.value;
            const valid = canDrop(col.value);
            return (
              <div
                key={col.value}
                onDragOver={(e) => { if (dragging) { e.preventDefault(); setOverStatus(col.value); } }}
                onDragLeave={() => setOverStatus((s) => (s === col.value ? null : s))}
                onDrop={(e) => { e.preventDefault(); handleDrop(col.value); }}
                className={cn(
                  "w-64 shrink-0 rounded-xl border bg-subtle/60 flex flex-col max-h-[calc(100vh-19rem)]",
                  isTarget && valid && "border-green-400 bg-green-50 dark:bg-green-500/15/60 ring-1 ring-green-300",
                  isTarget && !valid && "border-red-300 bg-red-50 dark:bg-red-500/15/40",
                  !isTarget && "border-(--zaire-border)"
                )}
              >
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-(--zaire-border) sticky top-0 bg-subtle/90 backdrop-blur-sm rounded-t-xl">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", DOT[col.color] ?? "bg-slate-400")} />
                  <span className="text-xs font-semibold text-(--zaire-text) uppercase tracking-wide truncate">{col.label}</span>
                  <span className="ml-auto text-xs font-semibold text-(--zaire-text-muted) bg-panel border border-(--zaire-border) rounded-full px-1.5 min-w-5 text-center">{list.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {list.length === 0 ? (
                    <p className="text-xs text-(--zaire-text-muted) text-center py-6">—</p>
                  ) : (
                    list.map((o) => {
                      const b = BRANCHES.find((x) => x.id === o.branch_id);
                      const isDragging = dragging?.id === o.id;
                      return (
                        <div
                          key={o.id}
                          draggable
                          onDragStart={() => setDragging({ id: o.id, status: o.status })}
                          onDragEnd={() => { setDragging(null); setOverStatus(null); }}
                          className={cn(
                            "group bg-panel border border-(--zaire-border) rounded-lg p-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-opacity",
                            o.order_type === "OTS" ? "border-l-2 border-l-orange-300" : "border-l-2 border-l-blue-300",
                            isDragging && "opacity-40"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={ROUTES.trace.orden(o.id)}
                              onClick={(e) => e.stopPropagation()}
                              draggable={false}
                              className={cn("font-mono text-xs font-semibold hover:underline", o.order_type === "OT" ? "text-blue-700 dark:text-blue-300" : "text-orange-700 dark:text-orange-300")}
                            >
                              {o.order_number}
                            </Link>
                            <OrderTypeBadge type={o.order_type as OrderType} />
                          </div>
                          <p className="text-xs text-(--zaire-text) mt-1.5 truncate">{o.clients?.business_name ?? "—"}</p>
                          <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-(--zaire-text-muted)">
                            <span className="inline-flex items-center gap-1">
                              {b && <span className="font-bold text-slate-600 dark:text-slate-300">{b.code}</span>}
                              <span>{formatDate(o.date_in)}</span>
                            </span>
                            <span className="font-semibold text-(--zaire-text) tabular-nums">{formatCurrency(o.total, o.currency as Currency)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title="Cambiar estado de la orden"
        description={
          confirm
            ? `Vas a cambiar ${confirm.order.order_number} de "${ORDER_STATUS_LABELS[confirm.order.status as OrderStatus]}" a "${ORDER_STATUS_LABELS[confirm.target]}". Queda registrado en el historial y no puede revertirse.`
            : ""
        }
        confirmLabel={confirm?.target === "cancelada" ? "Sí, cancelar orden" : "Sí, cambiar estado"}
        variant={confirm?.target === "cancelada" ? "destructive" : "default"}
        loading={saving}
        onConfirm={doStatusChange}
      />
    </>
  );
}
