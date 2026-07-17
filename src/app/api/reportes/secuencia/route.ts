// route.ts — /api/reportes/secuencia — PDF de verificación de secuencia correlativa

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { SecuenciaAuditoriaDocument } from "@/lib/pdf/report-auditoria-template";
import { BRANCHES } from "@/lib/constants";
import React from "react";

// Sucursal NORMALIZADA + secuencia. OTS usa prefijo "SR"; el contador es por sucursal
// compartido entre OT y OTS → SRBB y BB son la misma sucursal (BB). Agrupar por sucursal
// evita reportar huecos falsos entre sucursales independientes.
function parseOrder(orderNumber: string): { branch: string; seq: number } | null {
  const m = orderNumber.match(/^OTS?-\d{4}-([A-Z]+?)(\d+)$/);
  if (!m) return null;
  const code = m[1];
  const branch = code.startsWith("SR") ? code.slice(2) : code;
  return { branch, seq: parseInt(m[2], 10) };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const branch = searchParams.get("branch") ?? "all";
  const type = searchParams.get("type") ?? "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any).from("work_orders")
    .select("order_number, status")
    .like("order_number", `%-${year}-%`)
    .order("order_number");

  if (branch !== "all") {
    const code = BRANCHES.find(b => b.id === branch)?.code ?? branch.toUpperCase();
    q = q.like("order_number", `%-${year}-${code}%`);
  }
  if (type !== "all") {
    q = q.like("order_number", `${type}-%`);
  }

  const { data } = await q;
  type Row = { order_number: string; status: string; branch: string; seq: number };
  const parsed: Row[] = (data ?? [])
    .map((r: { order_number: string; status: string }) => {
      const p = parseOrder(r.order_number);
      return p ? { order_number: r.order_number, status: r.status, branch: p.branch, seq: p.seq } : null;
    })
    .filter((r: Row | null): r is Row => r !== null);

  // Agrupar por sucursal y detectar huecos DENTRO de cada una
  const byBranch = new Map<string, Row[]>();
  for (const r of parsed) {
    const list = byBranch.get(r.branch) ?? [];
    list.push(r);
    byBranch.set(r.branch, list);
  }

  const gaps: { missing: number; around: string }[] = [];
  const rows: Row[] = [];
  for (const [br, list] of Array.from(byBranch.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    list.sort((a, b) => a.seq - b.seq);
    for (let i = 1; i < list.length; i++) {
      if (list[i].seq - list[i - 1].seq > 1) {
        for (let g = list[i - 1].seq + 1; g < list[i].seq; g++) {
          gaps.push({ missing: g, around: `${br}: entre ${list[i - 1].order_number} y ${list[i].order_number}` });
        }
      }
    }
    rows.push(...list);
  }

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(SecuenciaAuditoriaDocument, { data: { year, branch, type, rows, gaps } }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Auditoria_Secuencia_${year}.pdf"`,
    },
  });
}
