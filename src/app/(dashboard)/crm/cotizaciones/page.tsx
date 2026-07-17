// page.tsx — src/app/(dashboard)/crm/cotizaciones/page.tsx — 2026-07-17
// Zaire CRM — Cotizaciones / Presupuestos (lista).

import { getQuotes } from "@/lib/crm/queries";
import { QuotesTable } from "@/components/crm/quotes-table";

export const dynamic = "force-dynamic";

export default async function CotizacionesPage() {
  const quotes = await getQuotes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Cotizaciones</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {quotes.length} presupuestos comerciales
        </p>
      </div>
      <QuotesTable initialQuotes={quotes} />
    </div>
  );
}
