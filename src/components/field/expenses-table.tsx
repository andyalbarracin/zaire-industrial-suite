"use client";
// expenses-table.tsx — src/components/field/expenses-table.tsx — 2026-07-13
// Gastos/viáticos global: resumen en mini-cards, filtros en pills, paginación + selector,
// export XLS/CSV, aprobar/rechazar con modal de confirmación.

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Check, X, Plus, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterBar } from "@/components/field/filter-bar";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUSES,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_COLORS,
} from "@/lib/field/constants";
import type { FieldExpense, ExpenseCategory, ExpenseStatus } from "@/lib/field/types";

interface VisitOption { id: string; visit_number: string | null; technician_id: string | null }

interface ExpensesTableProps {
  initialExpenses: FieldExpense[];
  visits: VisitOption[];
  currentUser: { id: string; full_name: string } | null;
}

// Color por categoría para las mini-cards (hex para la barra + clases suaves para el fondo)
const CATEGORY_COLOR: Record<string, { hex: string; bg: string; text: string }> = {
  combustible: { hex: "#576CBC", bg: "bg-blue-50", text: "text-blue-700" },
  peaje: { hex: "#06B6D4", bg: "bg-cyan-50", text: "text-cyan-700" },
  comida: { hex: "#EAB308", bg: "bg-amber-50", text: "text-amber-700" },
  hotel: { hex: "#8B5CF6", bg: "bg-violet-50", text: "text-violet-700" },
  estacionamiento: { hex: "#64748B", bg: "bg-slate-50", text: "text-slate-700" },
  insumos: { hex: "#16A34A", bg: "bg-green-50", text: "text-green-700" },
  otro: { hex: "#94A3B8", bg: "bg-slate-50", text: "text-slate-600" },
};

const PAGE_SIZES = [10, 20, 50, 100];

const addSchema = z.object({
  visit_id: z.string().min(1, "Elegí una visita"),
  category: z.string().optional(),
  amount: z.string().min(1, "Monto obligatorio"),
  currency: z.string(),
  description: z.string().optional(),
  incurred_at: z.string().optional(),
  is_billable: z.boolean(),
});
type AddData = z.infer<typeof addSchema>;

export function ExpensesTable({ initialExpenses, visits, currentUser }: ExpensesTableProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<FieldExpense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ expense: FieldExpense; status: ExpenseStatus } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AddData>({
    resolver: zodResolver(addSchema),
    defaultValues: { currency: "ARS", is_billable: false },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter.length && !categoryFilter.includes(e.category ?? "otro")) return false;
      if (statusFilter.length && !statusFilter.includes(e.status)) return false;
      if (s) {
        const hay = `${e.technician?.full_name ?? ""} ${e.description ?? ""} ${e.visit?.visit_number ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [expenses, search, categoryFilter, statusFilter]);

  // Resumen por categoría (ARS) para las mini-cards
  const summary = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const e of filtered) {
      if (e.currency !== "ARS") continue;
      const k = e.category ?? "otro";
      map.set(k, (map.get(k) ?? 0) + Number(e.amount));
      total += Number(e.amount);
    }
    const cats = Array.from(map.entries())
      .map(([cat, amount]) => ({ cat, amount, share: total > 0 ? amount / total : 0 }))
      .sort((a, b) => b.amount - a.amount);
    return { cats, total };
  }, [filtered]);

  // Paginación manual (sobre filtered)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setPage(0);
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function doSetStatus() {
    if (!confirm) return;
    setConfirmLoading(true);
    const { expense, status } = confirm;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const patch = status === "aprobado" || status === "rechazado" ? { status, approved_by: currentUser?.id ?? null } : { status };
    const { error } = await sb.from("field_expenses").update(patch).eq("id", expense.id);
    if (error) { toast.error("Error al actualizar el gasto"); setConfirmLoading(false); return; }
    // Auditoría: log inmutable por-gasto + audit global
    await sb.from("field_expense_events").insert({
      expense_id: expense.id,
      event_type: status,
      old_status: expense.status,
      new_status: status,
      created_by: currentUser?.id ?? null,
    });
    await sb.from("audit_logs").insert({
      entity_type: "field_expense",
      entity_id: expense.id,
      action: "status_change",
      description: `Gasto ${expense.status} → ${status}`,
      user_id: currentUser?.id ?? null,
      user_name: currentUser?.full_name ?? null,
    });
    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, ...patch } as FieldExpense : e)));
    toast.success(status === "aprobado" ? "Gasto aprobado" : "Gasto rechazado");
    setConfirmLoading(false);
    setConfirm(null);
  }

  function openAdd() {
    reset({ currency: "ARS", is_billable: false, incurred_at: new Date().toISOString().slice(0, 10) });
    setAddOpen(true);
  }

  async function onAdd(data: AddData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const visit = visits.find((v) => v.id === data.visit_id);
    const payload = {
      visit_id: data.visit_id,
      technician_id: visit?.technician_id ?? null,
      category: data.category || null,
      amount: Number(data.amount),
      currency: data.currency,
      description: data.description || null,
      incurred_at: data.incurred_at ? new Date(data.incurred_at).toISOString() : new Date().toISOString(),
      is_billable: data.is_billable,
      status: "pendiente",
    };
    const { data: created, error } = await sb
      .from("field_expenses")
      .insert(payload)
      .select("id, visit_id, technician_id, category, amount, currency, description, incurred_at, receipt_path, status, is_billable, approved_by, created_at, updated_at, deleted_at, technician:field_technicians(id, full_name), visit:field_visits(id, visit_number)")
      .single();
    if (error) { toast.error("Error al cargar el gasto"); return; }
    // Auditoría: evento "creado"
    await sb.from("field_expense_events").insert({
      expense_id: created.id,
      event_type: "creado",
      new_status: "pendiente",
      created_by: currentUser?.id ?? null,
    });
    setExpenses((prev) => [created as FieldExpense, ...prev]);
    setAddOpen(false);
    toast.success("Gasto cargado");
  }

  function buildExportRows() {
    return filtered.map((e) => ({
      Fecha: formatDate(e.incurred_at),
      Técnico: e.technician?.full_name ?? "",
      Visita: e.visit?.visit_number ?? "",
      Categoría: e.category ? EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] : "",
      Monto: Number(e.amount),
      Moneda: e.currency,
      Estado: EXPENSE_STATUS_LABELS[e.status as ExpenseStatus],
      Facturable: e.is_billable ? "Sí" : "No",
      Descripción: e.description ?? "",
    }));
  }
  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    XLSX.writeFile(wb, `Zaire_Field_Gastos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  function exportCSV() {
    const rows = buildExportRows();
    const headers = Object.keys(rows[0] ?? { Fecha: "" });
    const body = rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(";"));
    const csv = "﻿" + [headers.join(";"), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Zaire_Field_Gastos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const currency = watch("currency");
  const category = watch("category") ?? "";
  const visitId = watch("visit_id") ?? "";
  const isBillable = watch("is_billable");

  return (
    <div className="space-y-4">
      {/* Resumen por categoría (responsive: las cards crecen para llenar el ancho) */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 basis-[160px] min-w-[150px] rounded-xl p-3.5 bg-sas-navy text-white shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-white/70">Total ARS (filtrado)</span>
          <span className="text-xl font-bold mt-1">{formatCurrency(summary.total, "ARS")}</span>
        </div>
        {summary.cats.map(({ cat, amount, share }) => {
          const c = CATEGORY_COLOR[cat] ?? CATEGORY_COLOR.otro;
          return (
            <div key={cat} className="flex-1 basis-[160px] min-w-[150px] rounded-xl border border-(--sas-border) bg-white p-3.5 shadow-sm flex flex-col">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-(--sas-text)">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                  {EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory]}
                </span>
                <span className="text-[10px] text-(--sas-text-muted)">{Math.round(share * 100)}%</span>
              </div>
              <span className="text-base font-bold text-(--sas-text) mt-1.5">{formatCurrency(amount, "ARS")}</span>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, 4)}%`, backgroundColor: c.hex }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="sas-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--sas-border)">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--sas-text-muted)" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-9">CSV</Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="h-9"><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
            <Button onClick={openAdd} className="bg-sas-navy-mid hover:bg-sas-navy text-white h-9">
              <Plus className="w-4 h-4 mr-1.5" /> Nuevo Gasto
            </Button>
          </div>
        </div>

        {/* Filtros unificados */}
        <FilterBar
          groups={[
            { key: "cat", label: "Categoría", options: EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })), selected: categoryFilter, onToggle: (v) => toggle(categoryFilter, setCategoryFilter, v) },
            { key: "estado", label: "Estado", options: EXPENSE_STATUSES.map((s) => ({ value: s.value, label: s.label })), selected: statusFilter, onToggle: (v) => toggle(statusFilter, setStatusFilter, v) },
          ]}
          onClear={() => { setCategoryFilter([]); setStatusFilter([]); setPage(0); }}
        />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-(--sas-border) text-xs text-(--sas-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Técnico</th>
                <th className="text-left px-4 py-3">Visita</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-center px-4 py-3">Fact.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--sas-border)">
              {pageRows.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => router.push(`/field/gastos/${e.id}`)}
                  className="hover:bg-slate-50/80 cursor-pointer"
                >
                  <td className="px-4 py-3">{formatDate(e.incurred_at)}</td>
                  <td className="px-4 py-3">{e.technician?.full_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {e.visit ? <Link href={`/field/visitas/${e.visit.id}`} onClick={(ev) => ev.stopPropagation()} className="font-mono text-xs text-sas-blue hover:underline">{e.visit.visit_number}</Link> : "—"}
                  </td>
                  <td className="px-4 py-3">{e.category ? EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] : "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(e.amount), e.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", EXPENSE_STATUS_COLORS[e.status as ExpenseStatus])}>
                      {EXPENSE_STATUS_LABELS[e.status as ExpenseStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{e.is_billable ? "Sí" : "—"}</td>
                  <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                    {e.status === "pendiente" && (
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ expense: e, status: "aprobado" })} title="Aprobar" className="text-green-600">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ expense: e, status: "rechazado" })} title="Rechazar" className="text-red-600">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-(--sas-text-muted)">No se encontraron gastos</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación + selector de registros por página */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--sas-border) text-sm text-(--sas-text-muted)">
          <div className="flex items-center gap-2">
            <span>{filtered.length} registros</span>
            <span className="text-(--sas-border)">·</span>
            <label className="flex items-center gap-1.5">
              Mostrar
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="h-8 rounded-lg border border-(--sas-border) bg-white px-2 text-sm text-(--sas-text)"
              >
                {PAGE_SIZES.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>Anterior</Button>
            <span className="text-xs">Página {safePage + 1} de {pageCount}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}>Siguiente</Button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación aprobar/rechazar */}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.status === "aprobado" ? "Aprobar gasto" : "Rechazar gasto"}
        description={
          confirm
            ? `¿Confirmás ${confirm.status === "aprobado" ? "aprobar" : "rechazar"} el gasto de ${formatCurrency(Number(confirm.expense.amount), confirm.expense.currency)}${confirm.expense.category ? ` (${EXPENSE_CATEGORY_LABELS[confirm.expense.category as ExpenseCategory]})` : ""}? Queda registrado en la auditoría.`
            : ""
        }
        confirmLabel={confirm?.status === "aprobado" ? "Aprobar" : "Rechazar"}
        variant={confirm?.status === "rechazado" ? "destructive" : "default"}
        loading={confirmLoading}
        onConfirm={doSetStatus}
      />

      {/* Alta */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onAdd)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Visita *</Label>
              <Select value={visitId} onValueChange={(v) => setValue("visit_id", v ?? "", { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Elegí una visita...">{visitId ? visits.find((v) => v.id === visitId)?.visit_number : null}</SelectValue></SelectTrigger>
                <SelectContent>
                  {visits.map((v) => (<SelectItem key={v.id} value={v.id}>{v.visit_number ?? v.id.slice(0, 8)}</SelectItem>))}
                </SelectContent>
              </Select>
              {errors.visit_id && <p className="text-xs text-red-600">{errors.visit_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={(v) => setValue("category", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Seleccionar...">{category ? EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] : null}</SelectValue></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Monto *</Label>
                <Input id="amount" type="number" step="0.01" {...register("amount")} />
                {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={currency} onValueChange={(v) => setValue("currency", v ?? "ARS")}>
                  <SelectTrigger><SelectValue>{currency}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="incurred_at">Fecha</Label>
              <Input id="incurred_at" type="date" {...register("incurred_at")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" {...register("description")} rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="g_billable" checked={isBillable} onCheckedChange={(v) => setValue("is_billable", v)} />
              <Label htmlFor="g_billable">Re-facturable al cliente</Label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-sas-navy-mid hover:bg-sas-navy text-white">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Cargar gasto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
