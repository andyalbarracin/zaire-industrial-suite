// route.ts — /api/reportes/secuencia — PDF de verificación de secuencia correlativa

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { SecuenciaAuditoriaDocument } from "@/lib/pdf/report-auditoria-template";
import { getCompanyInfo } from "@/lib/company";
import { buildSequenceReport, branchLikePatterns } from "@/lib/trace/sequence";
import { BRANCHES } from "@/lib/constants";
import React from "react";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const branch = searchParams.get("branch") ?? "all";
  const type = searchParams.get("type") ?? "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Las órdenes dadas de baja no entran en un informe de auditoría (mismo criterio que los
  // reportes operativos y financieros, que ya filtran deleted_at).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any).from("work_orders")
    .select("order_number, status")
    .is("deleted_at", null)
    .like("order_number", `%-${year}-%`)
    .order("order_number");

  if (branch !== "all") {
    // Las OTS llevan el prefijo "SR" antes del código de sucursal, así que hace falta el `or`:
    // un único LIKE '%-2026-BB%' dejaba afuera todas las OTS de esa sucursal.
    const code = BRANCHES.find(b => b.id === branch)?.code ?? branch.toUpperCase();
    q = q.or(branchLikePatterns(year, code).map(p => `order_number.like.${p}`).join(","));
  }
  if (type !== "all") {
    q = q.like("order_number", `${type}-%`);
  }

  const [{ data }, companyInfo] = await Promise.all([q, getCompanyInfo()]);

  // Series, huecos y marca por fila salen del MISMO cálculo (lib/trace/sequence.ts), para que el
  // resumen y el detalle no puedan contradecirse.
  const { rows, gaps, countBySeries } = buildSequenceReport(data ?? []);

  const buffer = await renderToBuffer(
    React.createElement(SecuenciaAuditoriaDocument, {
      data: { year, branch, type, rows, gaps, countBySeries },
      companyInfo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Auditoria_Secuencia_${year}.pdf"`,
    },
  });
}
