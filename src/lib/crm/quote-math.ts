// quote-math.ts — src/lib/crm/quote-math.ts — 2026-07-17
// Cálculo puro de totales/márgenes de una cotización (testeable, sin UI).

export interface QuoteLine {
  quantity: number;
  unit_cost: number;
  unit_price: number;
}

export interface QuoteTotals {
  subtotal: number;      // Σ cantidad*precio
  totalCost: number;     // Σ cantidad*costo
  marginAmount: number;  // subtotal - costo
  marginPct: number;     // margen / subtotal * 100
  taxAmount: number;     // subtotal * tax%
  total: number;         // subtotal + impuesto
}

export function computeQuoteTotals(lines: QuoteLine[], taxPct: number): QuoteTotals {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const totalCost = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const marginAmount = subtotal - totalCost;
  const marginPct = subtotal > 0 ? (marginAmount / subtotal) * 100 : 0;
  const taxAmount = subtotal * (taxPct / 100);
  return { subtotal, totalCost, marginAmount, marginPct, taxAmount, total: subtotal + taxAmount };
}
