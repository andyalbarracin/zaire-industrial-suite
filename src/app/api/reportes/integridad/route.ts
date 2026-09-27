// route.ts — /api/reportes/integridad — PDF de informe de integridad

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { IntegridadAuditoriaDocument } from "@/lib/pdf/report-auditoria-template";
import { getCompanyInfo } from "@/lib/company";
import { branchLikePatterns } from "@/lib/trace/sequence";
import { BRANCHES } from "@/lib/constants";
import { sumDualTotals } from "@/lib/trace/amounts";
import React from "react";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const branch = searchParams.get("branch") ?? "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Las OTS llevan el prefijo "SR" antes del código de sucursal: sin el `or` de branchLikePatterns
  // el filtro por sucursal dejaba afuera todas las OTS de esa sucursal.
  const branchFilter = branch !== "all"
    ? branchLikePatterns(year, BRANCHES.find(b => b.id === branch)?.code ?? branch.toUpperCase())
        .map(p => `order_number.like.${p}`).join(",")
    : null;

  // Los importes se traen de los ÍTEMS, en sus dos monedas: es la fuente confiable (la cabecera
  // de la orden no siempre tiene total_ars — ver nota en lib/trace/amounts.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any).from("work_orders")
    .select("order_number, order_type, status, total, work_order_items(total_price, total_price_ars)")
    .is("deleted_at", null)
    .like("order_number", `%-${year}-%`);

  // Las órdenes dadas de baja quedan fuera de los conteos, pero se informan aparte: el check de
  // integridad tiene que verificar el soft delete de verdad, no afirmarlo.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qBajas = (supabase as any).from("work_orders")
    .select("order_number", { count: "exact", head: true })
    .not("deleted_at", "is", null)
    .like("order_number", `%-${year}-%`);

  if (branchFilter) {
    q = q.or(branchFilter);
    qBajas = qBajas.or(branchFilter);
  }

  const [{ data: orders }, { count: bajas }, companyInfo] = await Promise.all([q, qBajas, getCompanyInfo()]);
  const all = orders ?? [];

  const numbers = all.map((o: { order_number: string }) => o.order_number).filter(Boolean);

  // Importe de una orden = suma de sus ítems, por moneda.
  type OrderRow = { status: string; work_order_items?: { total_price: number; total_price_ars: number }[] };
  const itemsUsd = (o: OrderRow) => (o.work_order_items ?? []).reduce((s, i) => s + (Number(i.total_price) || 0), 0);
  const itemsArs = (o: OrderRow) => (o.work_order_items ?? []).reduce((s, i) => s + (Number(i.total_price_ars) || 0), 0);

  const facturadas = all.filter((o: OrderRow) => o.status === "facturada");
  const pendientes = all.filter((o: OrderRow) => !["facturada", "cancelada"].includes(o.status));
  const facturado = sumDualTotals(facturadas, itemsUsd, itemsArs);
  const pendiente = sumDualTotals(pendientes, itemsUsd, itemsArs);

  const data = {
    year, branch,
    total: all.length,
    ot: all.filter((o: { order_type: string }) => o.order_type === "OT").length,
    ots: all.filter((o: { order_type: string }) => o.order_type === "OTS").length,
    facturadas: facturadas.length,
    canceladas: all.filter((o: { status: string }) => o.status === "cancelada").length,
    activas: pendientes.length,
    totalFacturadoUsd: facturado.usd,
    totalFacturadoArs: facturado.ars,
    totalPendienteUsd: pendiente.usd,
    totalPendienteArs: pendiente.ars,
    hasDuplicates: new Set(numbers).size < numbers.length,
    hasNoNumber: all.some((o: { order_number: string }) => !o.order_number),
    dadasDeBaja: bajas ?? 0,
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(IntegridadAuditoriaDocument, { data, companyInfo }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Auditoria_Integridad_${year}.pdf"`,
    },
  });
}
