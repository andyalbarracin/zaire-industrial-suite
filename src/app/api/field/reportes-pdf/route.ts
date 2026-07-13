// route.ts — src/app/api/field/reportes-pdf/route.ts — 2026-07-13
// Genera el PDF de reportes de Zaire Field (operativos + financieros).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportsPdfDocument } from "@/lib/pdf/reports-pdf-template";
import { computeFieldReports } from "@/lib/field/reports";
import { getVisits, getExpenses } from "@/lib/field/queries";
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

  const [visits, expenses] = await Promise.all([getVisits(), getExpenses()]);
  const rep = computeFieldReports(visits, expenses);

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(ReportsPdfDocument, { rep }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Zaire_Field_Reportes.pdf"`,
    },
  });
}
