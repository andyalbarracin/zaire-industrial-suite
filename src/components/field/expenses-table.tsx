"use client";
// expenses-table.tsx — src/components/field/expenses-table.tsx — 2026-07-13
// Gastos/viáticos global: lista + filtros + aprobar/rechazar + totales + alta.

import { useState, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Check, X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [expenses, setExpenses] = useState<FieldExpense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AddData>({
    resolver: zodResolver(addSchema),
    defaultValues: { currency: "ARS", is_billable: false },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (s) {
        const hay = `${e.technician?.full_name ?? ""} ${e.description ?? ""} ${e.visit?.visit_number ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [expenses, search, categoryFilter, statusFilter]);

  const totalsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      if (e.currency !== "ARS") continue;
      const key = e.category ?? "otro";
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries());
  }, [filtered]);

  const totalArs = filtered.filter((e) => e.currency === "ARS").reduce((s, e) => s + Number(e.amount), 0);

  async function setStatus(expense: FieldExpense, status: ExpenseStatus) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const patch = status === "aprobado" || status === "rechazado" ? { status, approved_by: currentUser?.id ?? null } : { status };
    const { error } = await sb.from("field_expenses").update(patch).eq("id", expense.id);
    if (error) { toast.error("Error al actualizar el gasto"); return; }
    setExpenses((prev) => prev.map((e) => (e.id === expense.id ? { ...e, ...patch } as FieldExpense : e)));
    toast.success(status === "aprobado" ? "Gasto aprobado" : status === "rechazado" ? "Gasto rechazado" : "Actualizado");
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
    setExpenses((prev) => [created as FieldExpense, ...prev]);
    setAddOpen(false);
    toast.success("Gasto cargado");
  }

  const currency = watch("currency");
  const category = watch("category") ?? "";
  const visitId = watch("visit_id") ?? "";
  const isBillable = watch("is_billable");

  return (
    <div className="sas-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--sas-border)">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--sas-text-muted)" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-9 rounded-lg border border-(--sas-border) bg-white px-2 text-sm">
            <option value="">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-(--sas-border) bg-white px-2 text-sm">
            <option value="">Todos los estados</option>
            {EXPENSE_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
        </div>
        <Button onClick={openAdd} className="bg-sas-navy-mid hover:bg-sas-navy text-white h-9">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Gasto
        </Button>
      </div>

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
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">{formatDate(e.incurred_at)}</td>
                <td className="px-4 py-3">{e.technician?.full_name ?? "—"}</td>
                <td className="px-4 py-3">
                  {e.visit ? <Link href={`/field/visitas/${e.visit.id}`} className="font-mono text-xs text-sas-blue hover:underline">{e.visit.visit_number}</Link> : "—"}
                </td>
                <td className="px-4 py-3">{e.category ? EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] : "—"}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(e.amount), e.currency)}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", EXPENSE_STATUS_COLORS[e.status as ExpenseStatus])}>
                    {EXPENSE_STATUS_LABELS[e.status as ExpenseStatus]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">{e.is_billable ? "Sí" : "—"}</td>
                <td className="px-4 py-3">
                  {e.status === "pendiente" && (
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setStatus(e, "aprobado")} title="Aprobar" className="text-green-600">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setStatus(e, "rechazado")} title="Rechazar" className="text-red-600">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-(--sas-text-muted)">No se encontraron gastos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--sas-border) text-sm">
        <div className="flex flex-wrap gap-3 text-(--sas-text-muted)">
          {totalsByCategory.map(([cat, total]) => (
            <span key={cat}>{EXPENSE_CATEGORY_LABELS[cat as ExpenseCategory]}: <strong className="text-(--sas-text)">{formatCurrency(total, "ARS")}</strong></span>
          ))}
        </div>
        <span className="text-(--sas-text)">Total ARS: <strong>{formatCurrency(totalArs, "ARS")}</strong></span>
      </div>

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
