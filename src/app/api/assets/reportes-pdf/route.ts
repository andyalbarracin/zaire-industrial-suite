// route.ts — src/app/api/assets/reportes-pdf/route.ts — 2026-07-20
// Genera el PDF de reportes de Zaire Assets (flota + costo/TCO + confiabilidad + riesgo).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { AssetReportDocument } from "@/lib/pdf/asset-report-template";
import { computeAssetReports } from "@/lib/assets/reports";
import { getAssets, getAllAssetEvents } from "@/lib/assets/queries";
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
  if (!isModuleEnabled("assets")) return NextResponse.json({ error: "Módulo no habilitado" }, { status: 404 });

  const [assets, events] = await Promise.all([getAssets(), getAllAssetEvents()]);
  const rep = computeAssetReports(assets, events);

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(AssetReportDocument, { rep }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Zaire_Assets_Reportes.pdf"`,
    },
  });
}
