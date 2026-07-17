"use client";
// quote-detail.tsx — src/components/crm/quote-detail.tsx — 2026-07-17
// Ficha de cotización: datos, ítems, resumen de márgenes, condiciones, fotos adjuntas y PDF.
// Editar navega a la página de edición. Las fotos se imprimen al final del PDF.

import Link from "next/link";
import { ChevronLeft, Pencil, FileDown, Building2, Target, CalendarClock } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { CrmAttachments } from "./crm-attachments";
import { QuoteGenerateOt } from "./quote-generate-ot";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/crm/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { CrmQuote, CrmAttachment } from "@/lib/crm/types";

interface QuoteDetailProps {
  quote: CrmQuote;
  attachments: CrmAttachment[];
  currentProfile: { id: string } | null;
  traceEnabled: boolean;
}

export function QuoteDetail({ quote, attachments, currentProfile, traceEnabled }: QuoteDetailProps) {
  const showGenerateOt = traceEnabled && (quote.status === "aceptada" || !!quote.generated_work_order_id);
  const items = [...(quote.items ?? [])].sort((a, b) => a.item_number - b.item_number);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={ROUTES.crm.cotizaciones} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver a cotizaciones
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-(--zaire-text)">{quote.title}</h1>
            <span className="font-mono text-sm text-(--zaire-text-muted)">{quote.quote_number}</span>
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", QUOTE_STATUS_COLORS[quote.status])}>{QUOTE_STATUS_LABELS[quote.status]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {showGenerateOt && <QuoteGenerateOt quote={quote} currentProfile={currentProfile} />}
          <Button asChild variant="outline">
            <a href={`/api/crm/quote-pdf/${quote.id}`} target="_blank" rel="noopener noreferrer"><FileDown className="w-4 h-4 mr-1.5" /> PDF</a>
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.crm.cotizacionEditar(quote.id)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Link>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4 text-sm">
        <div className="zaire-card p-4 flex items-start gap-2">
          <Building2 className="w-4 h-4 text-(--zaire-text-muted) shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] text-(--zaire-text-muted)">Cliente</p>
            {quote.client_id ? <Link href={ROUTES.crm.cuenta(quote.client_id)} className="font-medium text-zaire-blue hover:underline line-clamp-2 wrap-break-word">{quote.client?.business_name ?? "—"}</Link> : <p className="font-medium line-clamp-2 wrap-break-word">{quote.client?.business_name ?? "—"}</p>}
          </div>
        </div>
        <div className="zaire-card p-4 flex items-start gap-2">
          <Target className="w-4 h-4 text-(--zaire-text-muted) shrink-0 mt-0.5" />
          <div className="min-w-0"><p className="text-[11px] text-(--zaire-text-muted)">Oportunidad</p><p className="font-medium line-clamp-2 wrap-break-word">{quote.opportunity?.title ?? "—"}</p></div>
        </div>
        <div className="zaire-card p-4 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
          <div><p className="text-[11px] text-(--zaire-text-muted)">Válida hasta</p><p className="font-medium">{quote.valid_until ? formatDate(quote.valid_until) : "—"}</p></div>
        </div>
        <div className="zaire-card p-4 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
          <div><p className="text-[11px] text-(--zaire-text-muted)">Creada</p><p className="font-medium">{formatDate(quote.created_at)}</p></div>
        </div>
      </div>

      {/* Ítems */}
      <div className="zaire-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 w-8">#</th>
                <th className="text-left px-4 py-2.5">Descripción</th>
                <th className="text-right px-4 py-2.5">Cant.</th>
                <th className="text-right px-4 py-2.5">Costo</th>
                <th className="text-right px-4 py-2.5">Precio</th>
                <th className="text-right px-4 py-2.5">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-2.5 text-(--zaire-text-muted)">{it.item_number}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-(--zaire-text)">{it.description}</div>
                    {it.specs && <div className="text-xs text-(--zaire-text-muted)">{it.specs}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{it.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-(--zaire-text-muted)">{formatCurrency(it.unit_cost, quote.currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(it.unit_price, quote.currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatCurrency(it.line_total, quote.currency)}</td>
                </tr>
              ))}
              {items.length === 0 && (<tr><td colSpan={6} className="px-4 py-8 text-center text-(--zaire-text-muted)">Sin ítems</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Sum label="Subtotal" value={formatCurrency(quote.subtotal, quote.currency)} />
        <Sum label="Costo" value={formatCurrency(quote.total_cost, quote.currency)} />
        <Sum label={`Margen (${quote.margin_pct.toFixed(1)}%)`} value={formatCurrency(quote.margin_amount, quote.currency)} accent={quote.margin_amount >= 0 ? "text-green-600" : "text-red-600"} />
        <Sum label={`Impuesto (${quote.tax_pct}%)`} value={formatCurrency(quote.tax_amount, quote.currency)} />
        <Sum label="Total" value={formatCurrency(quote.total, quote.currency)} strong />
      </div>

      {(quote.terms || quote.notes) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {quote.terms && <div className="zaire-card p-5"><h3 className="text-sm font-semibold text-(--zaire-text) mb-1.5">Condiciones comerciales</h3><p className="text-sm text-(--zaire-text-muted) whitespace-pre-line">{quote.terms}</p></div>}
          {quote.notes && <div className="zaire-card p-5"><h3 className="text-sm font-semibold text-(--zaire-text) mb-1.5">Notas internas</h3><p className="text-sm text-(--zaire-text-muted) whitespace-pre-line">{quote.notes}</p></div>}
        </div>
      )}

      {/* Fotos / adjuntos — se imprimen al final del PDF */}
      <div>
        <p className="text-xs text-(--zaire-text-muted) mb-2">Las <strong>imágenes</strong> adjuntas se imprimen al final del PDF (útil para justificar arreglos con fotos del campo).</p>
        <CrmAttachments entityType="quote" entityId={quote.id} initialAttachments={attachments} currentProfile={currentProfile} />
      </div>
    </div>
  );
}

function Sum({ label, value, accent, strong }: { label: string; value: string; accent?: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-(--zaire-border) bg-white p-3">
      <p className="text-[11px] text-(--zaire-text-muted) font-medium">{label}</p>
      <p className={cn("tabular-nums mt-0.5", strong ? "text-lg font-bold text-(--zaire-text)" : "text-sm font-semibold", accent ?? "text-(--zaire-text)")}>{value}</p>
    </div>
  );
}
