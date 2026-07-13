"use client";
// visit-expenses-section.tsx — src/components/field/visit-expenses-section.tsx — 2026-07-13
// Gastos/viáticos de una visita: lista + alta rápida (field_expenses).

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_COLORS,
} from "@/lib/field/constants";
import type { FieldExpense, ExpenseCategory, ExpenseStatus } from "@/lib/field/types";

const schema = z.object({
  category: z.string().optional(),
  amount: z.string().min(1, "El monto es obligatorio"),
  currency: z.string(),
  description: z.string().optional(),
  incurred_at: z.string().optional(),
  is_billable: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface VisitExpensesSectionProps {
  visitId: string;
  technicianId: string | null;
  initialExpenses: FieldExpense[];
}

export function VisitExpensesSection({ visitId, technicianId, initialExpenses }: VisitExpensesSectionProps) {
  const [expenses, setExpenses] = useState<FieldExpense[]>(initialExpenses);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "ARS", is_billable: false },
  });

  const currency = watch("currency");
  const category = watch("category") ?? "";
  const isBillable = watch("is_billable");

  function openNew() {
    reset({ currency: "ARS", is_billable: false, incurred_at: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  }

  async function onSubmit(data: FormData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const payload = {
      visit_id: visitId,
      technician_id: technicianId,
      category: data.category || null,
      amount: Number(data.amount),
      currency: data.currency,
      description: data.description || null,
      incurred_at: data.incurred_at ? new Date(data.incurred_at).toISOString() : new Date().toISOString(),
      is_billable: data.is_billable,
      status: "pendiente",
    };
    const { data: created, error } = await sb.from("field_expenses").insert(payload).select().single();
    if (error) { toast.error("Error al cargar el gasto"); return; }
    toast.success("Gasto cargado");
    setExpenses((prev) => [created as FieldExpense, ...prev]);
    setOpen(false);
  }

  const totalArs = expenses.filter((e) => e.currency === "ARS").reduce((s, e) => s + Number(e.amount), 0);
  const totalUsd = expenses.filter((e) => e.currency === "USD").reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="sas-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-(--sas-text) uppercase tracking-wide flex items-center gap-2">
          <Receipt className="w-4 h-4 text-sas-blue" /> Gastos de la visita
        </h2>
        <Button size="sm" onClick={openNew} className="bg-sas-navy-mid hover:bg-sas-navy text-white h-8">
          <Plus className="w-4 h-4 mr-1" /> Agregar
        </Button>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-(--sas-text-muted) py-4 text-center">Sin gastos cargados.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-(--sas-text-muted) uppercase tracking-wide border-b border-(--sas-border)">
                <tr>
                  <th className="text-left py-2">Fecha</th>
                  <th className="text-left py-2">Categoría</th>
                  <th className="text-right py-2">Monto</th>
                  <th className="text-left py-2 pl-3">Estado</th>
                  <th className="text-center py-2">Fact.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--sas-border)">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2">{formatDate(e.incurred_at)}</td>
                    <td className="py-2">{e.category ? EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] : "—"}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(Number(e.amount), e.currency)}</td>
                    <td className="py-2 pl-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", EXPENSE_STATUS_COLORS[e.status as ExpenseStatus])}>
                        {EXPENSE_STATUS_LABELS[e.status as ExpenseStatus]}
                      </span>
                    </td>
                    <td className="py-2 text-center">{e.is_billable ? "Sí" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-4 mt-3 pt-3 border-t border-(--sas-border) text-sm">
            {totalArs > 0 && <span className="text-(--sas-text)">Total ARS: <strong>{formatCurrency(totalArs, "ARS")}</strong></span>}
            {totalUsd > 0 && <span className="text-(--sas-text)">Total USD: <strong>{formatCurrency(totalUsd, "USD")}</strong></span>}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
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
                <Input id="amount" type="number" step="0.01" {...register("amount")} placeholder="0.00" />
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
              <Switch id="exp_billable" checked={isBillable} onCheckedChange={(v) => setValue("is_billable", v)} />
              <Label htmlFor="exp_billable">Re-facturable al cliente</Label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
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
