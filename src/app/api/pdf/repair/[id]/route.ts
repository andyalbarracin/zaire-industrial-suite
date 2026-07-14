// route.ts — src/app/api/pdf/repair/[id]/route.ts
// Genera PDF RC 010-00 — Planilla de Reparación para órdenes OTS

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { RepairPdfDocument } from "@/lib/pdf/repair-pdf-template";
import React from "react";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return new NextResponse("Demasiadas solicitudes", { status: 429 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: orderRaw }, { data: itemsRaw }, { data: settingsRaw }] = await Promise.all([
    sb.from("work_orders").select(`
      id, order_number, order_type, date_in, currency, remito_salida,
      clients(business_name, client_code)
    `).eq("id", id).single(),
    sb.from("work_order_items").select(`
      item_number, quantity, custom_description, serial_number,
      marca, materiales_caras, materiales_orings, repair_required, modelo,
      medida, unidad_medida,
      products(code, name, brand, model)
    `).eq("work_order_id", id).eq("repair_required", true).order("item_number"),
    sb.from("company_settings").select("id, nombre, cuit, direccion, ciudad, telefono, email, web, logo_url, logo_use_in_pdfs, updated_at").eq("id", 1).single(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = orderRaw as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (itemsRaw ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyInfo = (settingsRaw ?? null) as any;

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.order_type !== "OTS") return NextResponse.json({ error: "Solo disponible para órdenes OTS" }, { status: 400 });
  if (!items.length) return NextResponse.json({ error: "No hay ítems con reparación requerida" }, { status: 400 });

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(RepairPdfDocument, { order, items, companyInfo }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Reparacion_${order.order_number}.pdf"`,
    },
  });
}
