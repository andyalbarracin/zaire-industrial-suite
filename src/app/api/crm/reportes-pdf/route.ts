// route.ts — src/app/api/crm/reportes-pdf/route.ts — 2026-09-27
// Genera el PDF de reportes de Zaire CRM (conversión, pipeline, ganado por mes, rendimiento).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCompanyInfo } from "@/lib/company";
import { renderToBuffer } from "@react-pdf/renderer";
import { CrmReportDocument } from "@/lib/pdf/crm-report-template";
import { computeCrmReports } from "@/lib/crm/reports";
import { getOpportunities, getLeads, getPipelineStages } from "@/lib/crm/queries";
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
  if (!isModuleEnabled("crm")) return NextResponse.json({ error: "Módulo no habilitado" }, { status: 404 });

  // Mismas fuentes que la pantalla de reportes del CRM, para que el PDF informe exactamente lo
  // mismo que se ve en pantalla (ver app/(dashboard)/crm/reportes/page.tsx).
  const [opportunities, leads, stages, { data: profiles }, companyInfo] = await Promise.all([
    getOpportunities(),
    getLeads(),
    getPipelineStages(),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    getCompanyInfo(),
  ]);

  const rep = computeCrmReports(
    opportunities, leads, stages,
    (profiles ?? []) as { id: string; full_name: string }[],
  );

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(CrmReportDocument, { rep, companyInfo }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Zaire_CRM_Reportes.pdf"`,
    },
  });
}
