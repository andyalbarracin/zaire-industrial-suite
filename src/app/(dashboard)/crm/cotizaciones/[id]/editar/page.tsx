// page.tsx — src/app/(dashboard)/crm/cotizaciones/[id]/editar/page.tsx — 2026-07-17
// Zaire CRM — Editar cotización (página completa).

import { notFound } from "next/navigation";
import { getQuote, getOpportunities, getCrmClients, getQuoteProducts, getLastPrices } from "@/lib/crm/queries";
import { QuoteForm } from "@/components/crm/quote-form";

export const dynamic = "force-dynamic";

export default async function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quote, opportunities, clients, products, lastPrices] = await Promise.all([
    getQuote(id),
    getOpportunities(),
    getCrmClients(),
    getQuoteProducts(),
    getLastPrices(),
  ]);
  if (!quote) notFound();
  const oppOptions = opportunities.map((o) => ({ id: o.id, title: o.title, client_id: o.client_id }));

  return <QuoteForm quote={quote} opportunities={oppOptions} clients={clients} products={products} lastPrices={lastPrices} />;
}
