// route.ts — src/app/api/stock/reportes-pdf/route.ts — 2026-07-18
// Genera el PDF de reportes de Zaire Stock (valuación + bajo mínimo + consumo).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { StockReportDocument } from "@/lib/pdf/stock-report-template";
import { computeStockReports } from "@/lib/stock/reports";
import { getStockLevels, getStockMovements } from "@/lib/stock/queries";
import { isModuleEnabled } from "@/lib/modules";
import React from "react";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs }); return true; }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) return new NextResponse("Demasiadas solicitudes", { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isModuleEnabled("stock")) return NextResponse.json({ error: "Módulo no habilitado" }, { status: 404 });

  const [levels, movements] = await Promise.all([getStockLevels(), getStockMovements(1000)]);
  const rep = computeStockReports(levels, movements);

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(StockReportDocument, { rep }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Zaire_Stock_Reportes.pdf"`,
    },
  });
}
