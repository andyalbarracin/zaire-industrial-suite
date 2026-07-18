"use client";
// quote-form.tsx — src/components/crm/quote-form.tsx — 2026-07-17
// Formulario de cotización en PÁGINA COMPLETA (antes era modal): ítems dinámicos (reusa
// catálogo products), costo/precio, margen/rentabilidad en vivo, impuesto y total. Las fotos
// se adjuntan desde la ficha (después de guardar), y se imprimen al final del PDF.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { logCrmAudit } from "@/lib/crm/audit";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientSelect } from "@/components/clients/client-select";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from "@/lib/crm/constants";
import { computeQuoteTotals } from "@/lib/crm/quote-math";
import { formatCurrency, cn } from "@/lib/utils";
import type { CrmQuote, QuoteStatus, CrmCurrency, CrmOpportunity, Client } from "@/lib/crm/types";
import type { QuoteProduct, LastPrice } from "@/lib/crm/queries";

const NONE = "__none__";

interface ItemRow {
  _key: string;
  product_id: string | null;
  description: string;
  specs: string;
  quantity: string;
  unit_cost: string;
  unit_price: string;
}

interface QuoteFormProps {
  quote: CrmQuote | null;
  opportunities: Pick<CrmOpportunity, "id" | "title" | "client_id">[];
  clients: Client[];
  products: QuoteProduct[];
  lastPrices: Record<string, LastPrice>;
}

const num = (v: string) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const newKey = () => Math.random().toString(36).slice(2);

function emptyRow(): ItemRow {
  return { _key: newKey(), product_id: null, description: "", specs: "", quantity: "1", unit_cost: "0", unit_price: "0" };
}

export function QuoteForm({ quote, opportunities, clients, products, lastPrices }: QuoteFormProps) {
  const router = useRouter();
  const isEdit = !!quote;

  const [title, setTitle] = useState(quote?.title ?? "");
  const [status, setStatus] = useState<QuoteStatus>(quote?.status ?? "borrador");
  const [currency, setCurrency] = useState<CrmCurrency>(quote?.currency ?? "ARS");
  const [validUntil, setValidUntil] = useState(quote?.valid_until ?? "");
  const [taxPct, setTaxPct] = useState(String(quote?.tax_pct ?? 21));
  const [terms, setTerms] = useState(quote?.terms ?? "");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [opportunityId, setOpportunityId] = useState<string>(quote?.opportunity_id ?? NONE);
  const [clientId, setClientId] = useState<string | null>(quote?.client_id ?? null);
  const [items, setItems] = useState<ItemRow[]>(() =>
    quote?.items && quote.items.length
      ? [...quote.items].sort((a, b) => a.item_number - b.item_number).map((it) => ({
          _key: newKey(), product_id: it.product_id, description: it.description, specs: it.specs ?? "",
          quantity: String(it.quantity), unit_cost: String(it.unit_cost), unit_price: String(it.unit_price),
        }))
      : [emptyRow()]
  );
  const [saving, setSaving] = useState(false);

  const totals = useMemo(
    () => computeQuoteTotals(items.map((it) => ({ quantity: num(it.quantity), unit_cost: num(it.unit_cost), unit_price: num(it.unit_price) })), num(taxPct)),
    [items, taxPct]
  );

  function updateItem(i: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function pickProduct(i: number, productId: string) {
    if (productId === NONE) { updateItem(i, { product_id: null }); return; }
    const p = products.find((x) => x.id === productId);
    const last = lastPrices[productId];
    updateItem(i, {
      product_id: productId,
      description: p?.name ?? "",
      unit_price: String(last?.unit_price ?? p?.default_unit_price ?? 0),
      unit_cost: last?.unit_cost != null ? String(last.unit_cost) : "0",
    });
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("La cotización necesita un título"); return; }
    if (!clientId) { toast.error("Elegí un cliente"); return; }
    if (items.length === 0 || items.every((it) => !it.description.trim())) { toast.error("Agregá al menos un ítem con descripción"); return; }
    setSaving(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const validItems = items.filter((it) => it.description.trim());
    const header = {
      opportunity_id: opportunityId === NONE ? null : opportunityId,
      client_id: clientId,
      title: title.trim(),
      status,
      currency,
      valid_until: validUntil || null,
      terms: terms.trim() || null,
      notes: notes.trim() || null,
      subtotal: Number(totals.subtotal.toFixed(2)),
      total_cost: Number(totals.totalCost.toFixed(2)),
      margin_amount: Number(totals.marginAmount.toFixed(2)),
      margin_pct: Number(totals.marginPct.toFixed(2)),
      tax_pct: num(taxPct),
      tax_amount: Number(totals.taxAmount.toFixed(2)),
      total: Number(totals.total.toFixed(2)),
    };

    let quoteId = quote?.id ?? null;
    if (isEdit && quote) {
      const { error } = await sb.from("crm_quotes").update(header).eq("id", quote.id);
      if (error) { toast.error("Error al actualizar la cotización"); setSaving(false); return; }
      await sb.from("crm_quote_items").delete().eq("quote_id", quote.id);
    } else {
      const { data: numData } = await sb.rpc("generate_quote_number");
      const { data: userData } = await supabase.auth.getUser();
      const { data: created, error } = await sb
        .from("crm_quotes")
        .insert({ ...header, quote_number: numData ?? null, created_by: userData.user?.id ?? null })
        .select("id")
        .single();
      if (error || !created) { toast.error("Error al crear la cotización"); setSaving(false); return; }
      quoteId = created.id;
    }

    const itemRows = validItems.map((it, idx) => ({
      quote_id: quoteId, item_number: idx + 1, product_id: it.product_id,
      description: it.description.trim(), specs: it.specs.trim() || null,
      quantity: num(it.quantity), unit_cost: num(it.unit_cost), unit_price: num(it.unit_price),
      line_total: Number((num(it.quantity) * num(it.unit_price)).toFixed(2)),
    }));
    await sb.from("crm_quote_items").insert(itemRows);

    await sb.from("crm_price_history").insert(validItems.map((it) => ({
      product_id: it.product_id, description: it.description.trim(),
      unit_price: num(it.unit_price), unit_cost: num(it.unit_cost), currency, quote_id: quoteId,
    })));

    void logCrmAudit("crm_quote", quoteId!, isEdit ? "update" : "create", `Cotización ${isEdit ? "actualizada" : "creada"}: ${title.trim()}`);
    toast.success(isEdit ? "Cotización actualizada" : "Cotización creada");
    setSaving(false);
    router.push(ROUTES.crm.cotizacion(quoteId!));
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href={ROUTES.crm.cotizaciones} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
          <ChevronLeft className="w-4 h-4" /> Volver a cotizaciones
        </Link>
        <h1 className="text-2xl font-bold text-(--zaire-text)">{isEdit ? `Editar cotización ${quote?.quote_number ?? ""}` : "Nueva cotización"}</h1>
      </div>

      {/* Datos generales */}
      <div className="zaire-card p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="q_title">Título *</Label>
            <Input id="q_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Provisión de sellos mecánicos - Planta 1" />
          </div>
          <div className="space-y-1.5">
            <Label>Oportunidad</Label>
            <Select value={opportunityId} onValueChange={(v) => {
              const val = v ?? NONE;
              setOpportunityId(val);
              const opp = opportunities.find((o) => o.id === val);
              if (opp?.client_id) setClientId(opp.client_id);
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin oportunidad">
                  {opportunityId !== NONE ? opportunities.find((o) => o.id === opportunityId)?.title ?? "—" : "— Sin oportunidad —"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Sin oportunidad —</SelectItem>
                {opportunities.map((o) => (<SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <ClientSelect clients={clients} value={clientId} onChange={setClientId} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus((v ?? "borrador") as QuoteStatus)}>
              <SelectTrigger className="w-full"><SelectValue>{QUOTE_STATUS_LABELS[status]}</SelectValue></SelectTrigger>
              <SelectContent>{QUOTE_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => setCurrency((v ?? "ARS") as CrmCurrency)}>
              <SelectTrigger className="w-full"><SelectValue>{currency}</SelectValue></SelectTrigger>
              <SelectContent><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q_valid">Válida hasta</Label>
            <Input id="q_valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q_tax">Impuesto %</Label>
            <Input id="q_tax" type="number" min={0} step="0.01" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div className="zaire-card overflow-hidden">
        <div className="px-5 py-3 border-b border-(--zaire-border)"><h2 className="text-sm font-semibold text-(--zaire-text)">Ítems del presupuesto</h2></div>
        <div className="overflow-x-auto">
          <div className="min-w-180">
            <div className="grid grid-cols-[1fr_90px_120px_120px_120px_40px] gap-2 bg-subtle px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-(--zaire-text-muted)">
              <span>Descripción</span><span className="text-right">Cant.</span><span className="text-right">Costo</span><span className="text-right">Precio</span><span className="text-right">Subtotal</span><span></span>
            </div>
            <div className="divide-y divide-(--zaire-border)">
              {items.map((it, i) => {
                const line = num(it.quantity) * num(it.unit_price);
                const lastHint = it.product_id ? lastPrices[it.product_id] : undefined;
                return (
                  <div key={it._key} className="px-5 py-2.5 space-y-1.5">
                    <div className="grid grid-cols-[1fr_90px_120px_120px_120px_40px] gap-2 items-center">
                      <Input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Descripción del ítem" className="h-8" />
                      <Input type="number" step="0.01" value={it.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value })} className="h-8 text-right" />
                      <Input type="number" step="0.01" value={it.unit_cost} onChange={(e) => updateItem(i, { unit_cost: e.target.value })} className="h-8 text-right" />
                      <Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: e.target.value })} className="h-8 text-right" />
                      <span className="text-sm text-(--zaire-text) tabular-nums text-right">{formatCurrency(line, currency)}</span>
                      <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-(--zaire-text-muted) hover:text-red-600 dark:text-red-300 flex justify-center" title="Quitar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-[180px_1fr] gap-2 items-center">
                      <Select value={it.product_id ?? NONE} onValueChange={(v) => pickProduct(i, v ?? NONE)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Del catálogo">{it.product_id ? products.find((p) => p.id === it.product_id)?.name ?? "Producto" : "— Del catálogo —"}</SelectValue></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>— Libre (sin producto) —</SelectItem>
                          {products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input value={it.specs} onChange={(e) => updateItem(i, { specs: e.target.value })} placeholder="Especificaciones técnicas (medida, material, marca...)" className="h-7 text-xs" />
                    </div>
                    {lastHint && <p className="text-[10px] text-(--zaire-text-muted)">Último precio: {formatCurrency(lastHint.unit_price, (lastHint.currency as CrmCurrency))}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setItems((prev) => [...prev, emptyRow()])} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-zaire-blue hover:bg-subtle border-t border-(--zaire-border)">
          <Plus className="w-4 h-4" /> Agregar ítem
        </button>
      </div>

      {/* Resumen de márgenes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Summary label="Subtotal" value={formatCurrency(totals.subtotal, currency)} />
        <Summary label="Costo" value={formatCurrency(totals.totalCost, currency)} />
        <Summary label={`Margen (${totals.marginPct.toFixed(1)}%)`} value={formatCurrency(totals.marginAmount, currency)} accent={totals.marginAmount >= 0 ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300"} />
        <Summary label={`Total (c/${num(taxPct)}%)`} value={formatCurrency(totals.total, currency)} strong />
      </div>

      {/* Condiciones + notas */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="q_terms">Condiciones comerciales</Label>
          <Textarea id="q_terms" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder="Validez, forma de pago, plazo de entrega..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q_notes">Notas internas</Label>
          <Textarea id="q_notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="No se imprimen en el PDF al cliente." />
        </div>
      </div>

      {!isEdit && (
        <p className="text-xs text-(--zaire-text-muted)">Después de crear la cotización vas a poder adjuntar fotos (del campo) desde la ficha; se imprimen al final del PDF.</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(ROUTES.crm.cotizaciones)} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Guardar cambios" : "Crear cotización"}
        </Button>
      </div>
    </div>
  );
}

function Summary({ label, value, accent, strong }: { label: string; value: string; accent?: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-(--zaire-border) bg-panel p-3">
      <p className="text-[11px] text-(--zaire-text-muted) font-medium">{label}</p>
      <p className={cn("tabular-nums mt-0.5", strong ? "text-lg font-bold text-(--zaire-text)" : "text-sm font-semibold", accent ?? "text-(--zaire-text)")}>{value}</p>
    </div>
  );
}
