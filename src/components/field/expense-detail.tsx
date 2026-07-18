"use client";
// expense-detail.tsx — src/components/field/expense-detail.tsx — 2026-07-13
// Detalle de gasto: estado, aprobar/rechazar/revertir (con confirmación), comentarios y
// timeline de auditoría (field_expense_events, append-only). Toda acción queda registrada.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import {
  ChevronLeft, Check, X, RotateCcw, MessageSquarePlus, Loader2,
  CircleDollarSign, Pencil, PlusCircle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  EXPENSE_CATEGORY_LABELS, EXPENSE_STATUS_LABELS, EXPENSE_STATUS_COLORS,
} from "@/lib/field/constants";
import type { FieldExpense, FieldExpenseEvent, ExpenseCategory, ExpenseStatus, ExpenseEventType } from "@/lib/field/types";

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  creado: PlusCircle, editado: Pencil, aprobado: Check, rechazado: X,
  reintegrado: CircleDollarSign, revertido: RotateCcw, comentario: MessageSquarePlus, adjunto: PlusCircle,
};

interface ExpenseDetailProps {
  expense: FieldExpense;
  events: FieldExpenseEvent[];
  currentUser: { id: string; full_name: string; role?: string | null } | null;
}

export function ExpenseDetail({ expense, events, currentUser }: ExpenseDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ExpenseStatus>(expense.status);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ type: ExpenseEventType; newStatus: ExpenseStatus; label: string; destructive?: boolean } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function logEvent(sb: any, ev: { event_type: ExpenseEventType; old_status?: string | null; new_status?: string | null; comment?: string | null }) {
    await sb.from("field_expense_events").insert({
      expense_id: expense.id,
      event_type: ev.event_type,
      old_status: ev.old_status ?? null,
      new_status: ev.new_status ?? null,
      comment: ev.comment ?? null,
      created_by: currentUser?.id ?? null,
    });
    await sb.from("audit_logs").insert({
      entity_type: "field_expense",
      entity_id: expense.id,
      action: ev.event_type === "editado" ? "update" : ev.event_type === "creado" ? "create" : "status_change",
      description: `Gasto: ${ev.event_type}${ev.new_status ? ` → ${ev.new_status}` : ""}`,
      user_id: currentUser?.id ?? null,
      user_name: currentUser?.full_name ?? null,
    });
  }

  async function applyStatus(type: ExpenseEventType, newStatus: ExpenseStatus) {
    setBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus === "aprobado" || newStatus === "rechazado") patch.approved_by = currentUser?.id ?? null;
    if (newStatus === "pendiente") patch.approved_by = null;
    const { error } = await sb.from("field_expenses").update(patch).eq("id", expense.id);
    if (error) { toast.error("Error al actualizar el gasto"); setBusy(false); return; }
    await logEvent(sb, { event_type: type, old_status: status, new_status: newStatus });
    setStatus(newStatus);
    setConfirm(null);
    setBusy(false);
    toast.success("Gasto actualizado");
    router.refresh();
  }

  async function addComment() {
    if (!comment.trim()) return;
    setBusy(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await logEvent(sb, { event_type: "comentario", comment: comment.trim() });
    setComment("");
    setBusy(false);
    toast.success("Comentario registrado");
    router.refresh();
  }

  // Acciones disponibles según estado (aprobar/rechazar/revertir es solo de administradores)
  const isAdmin = currentUser?.role === "admin";
  const actions: { type: ExpenseEventType; newStatus: ExpenseStatus; label: string; icon: React.ComponentType<{ className?: string }>; destructive?: boolean; cls?: string }[] = [];
  if (isAdmin) {
    if (status === "pendiente") {
      actions.push({ type: "aprobado", newStatus: "aprobado", label: "Aprobar", icon: Check, cls: "bg-green-600 hover:bg-green-700 text-white" });
      actions.push({ type: "rechazado", newStatus: "rechazado", label: "Rechazar", icon: X, destructive: true });
    }
    if (status === "aprobado") {
      actions.push({ type: "reintegrado", newStatus: "reintegrado", label: "Marcar reintegrado", icon: CircleDollarSign, cls: "bg-zaire-navy-mid hover:bg-zaire-navy text-white" });
      actions.push({ type: "revertido", newStatus: "pendiente", label: "Revertir a pendiente", icon: RotateCcw });
    }
    if (status === "rechazado" || status === "reintegrado") {
      actions.push({ type: "revertido", newStatus: "pendiente", label: "Revertir a pendiente", icon: RotateCcw });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={ROUTES.field.gastos} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
          <ChevronLeft className="w-4 h-4" /> Volver a gastos
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-(--zaire-text)">{formatCurrency(Number(expense.amount), expense.currency)}</h1>
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", EXPENSE_STATUS_COLORS[status])}>
            {EXPENSE_STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Datos + acciones */}
        <div className="space-y-6">
          <div className="zaire-card p-5 space-y-2.5 text-sm">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-1">Datos del gasto</h2>
            <Row label="Técnico" value={expense.technician?.full_name ?? "—"} />
            <div className="flex items-center gap-2">
              <span className="text-(--zaire-text-muted) w-24 shrink-0">Visita</span>
              {expense.visit ? <Link href={ROUTES.field.visita(expense.visit.id)} className="text-zaire-blue hover:underline font-mono">{expense.visit.visit_number}</Link> : <span>—</span>}
            </div>
            <Row label="Categoría" value={expense.category ? EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory] : "—"} />
            <Row label="Fecha" value={formatDate(expense.incurred_at)} />
            <Row label="Facturable" value={expense.is_billable ? "Sí" : "No"} />
            {expense.description && <div className="pt-1"><p className="text-(--zaire-text-muted)">Descripción</p><p className="text-(--zaire-text)">{expense.description}</p></div>}
          </div>

          <div className="zaire-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Acciones</h2>
            {actions.length === 0 && (
              <p className="text-sm text-(--zaire-text-muted)">
                {isAdmin ? "Sin acciones disponibles para este estado." : "Solo un administrador puede aprobar o rechazar gastos."}
              </p>
            )}
            {actions.map((a) => (
              <Button
                key={a.type + a.newStatus}
                variant={a.destructive ? "destructive" : a.cls ? "default" : "outline"}
                className={cn("w-full justify-start", a.cls)}
                onClick={() => setConfirm({ type: a.type, newStatus: a.newStatus, label: a.label, destructive: a.destructive })}
              >
                <a.icon className="w-4 h-4 mr-2" /> {a.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Comentario + timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="zaire-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide">Agregar constancia / comentario</h2>
            <p className="text-xs text-(--zaire-text-muted)">Dejá constancia de un pedido de más información, una observación o una queja. Queda registrado en la auditoría.</p>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Escribí una observación..." />
            <div className="flex justify-end">
              <Button onClick={addComment} disabled={busy || !comment.trim()} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquarePlus className="w-4 h-4 mr-2" />} Registrar
              </Button>
            </div>
          </div>

          <div className="zaire-card p-5">
            <h2 className="text-sm font-semibold text-(--zaire-text) uppercase tracking-wide mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-zaire-blue" /> Historial de auditoría
            </h2>
            {events.length === 0 ? (
              <p className="text-sm text-(--zaire-text-muted) py-4 text-center">Sin eventos registrados. (Los gastos creados antes de la Fase 2 pueden no tener historial.)</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-(--zaire-border)" />
                <div className="space-y-4">
                  {events.map((ev) => {
                    const Icon = EVENT_ICON[ev.event_type] ?? MessageSquarePlus;
                    return (
                      <div key={ev.id} className="relative flex gap-4 pl-10">
                        <div className="absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 bg-panel border-(--zaire-border) text-zaire-blue">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 pb-1">
                          <p className="text-sm text-(--zaire-text)">
                            <span className="font-medium capitalize">{ev.event_type}</span>
                            {ev.old_status && ev.new_status && <span className="text-(--zaire-text-muted)"> · {ev.old_status} → {ev.new_status}</span>}
                          </p>
                          {ev.comment && <p className="text-sm text-(--zaire-text-muted) mt-0.5">“{ev.comment}”</p>}
                          <p className="text-xs text-(--zaire-text-muted) mt-0.5">{ev.profile?.full_name ?? "Sistema"} · {formatDateTime(ev.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.label ?? ""}
        description={confirm ? `¿Confirmás "${confirm.label}"? La acción queda registrada en la auditoría del gasto.` : ""}
        confirmLabel={confirm?.label ?? "Confirmar"}
        variant={confirm?.destructive ? "destructive" : "default"}
        loading={busy}
        onConfirm={() => confirm && applyStatus(confirm.type, confirm.newStatus)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-(--zaire-text-muted) w-24 shrink-0">{label}</span>
      <span className="text-(--zaire-text) font-medium">{value}</span>
    </div>
  );
}
