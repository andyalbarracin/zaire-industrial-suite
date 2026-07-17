// page.tsx — src/app/(dashboard)/crm/cotizaciones/nueva/page.tsx — 2026-07-17
// Zaire CRM — Nueva cotización (página completa).

import { getOpportunities, getCrmClients, getQuoteProducts, getLastPrices } from "@/lib/crm/queries";
import { QuoteForm } from "@/components/crm/quote-form";

export const dynamic = "force-dynamic";

export default async function NuevaCotizacionPage() {
  const [opportunities, clients, products, lastPrices] = await Promise.all([
    getOpportunities(),
    getCrmClients(),
    getQuoteProducts(),
    getLastPrices(),
  ]);
  const oppOptions = opportunities.map((o) => ({ id: o.id, title: o.title, client_id: o.client_id }));

  return <QuoteForm quote={null} opportunities={oppOptions} clients={clients} products={products} lastPrices={lastPrices} />;
}
