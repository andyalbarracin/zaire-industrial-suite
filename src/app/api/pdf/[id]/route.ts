// route.ts — src/app/api/pdf/[id]/route.ts
// Genera PDF RC 009-00 de una orden de trabajo

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { OrderPdfDocument } from "@/lib/pdf/order-pdf-template";
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
    // Los importes viajan en sus DOS monedas (columnas USD + columnas _ars); el template
    // elige cuál mostrar con resolveAmount(). Ver src/lib/trace/amounts.ts.
    sb.from("work_orders").select(`
      id, order_number, order_type, status, date_in, date_due,
      currency, subtotal, total, subtotal_ars, total_ars, general_notes, orden_compra, remito_salida, created_at,
      clients(business_name, tax_id, contact_name, email, phone, address, city, client_code)
    `).eq("id", id).single(),
    sb.from("work_order_items").select(`
      item_number, quantity, custom_description, serial_number,
      equipment_number, additional_observation, unit_price, total_price,
      unit_price_ars, total_price_ars,
      is_remitted, is_invoiced, origen_abastecimiento,
      modelo, marca, medida, unidad_medida,
      products(code, name, brand)
    `).eq("work_order_id", id).order("item_number"),
    sb.from("company_settings").select("id, nombre, cuit, direccion, ciudad, telefono, email, web, logo_url, logo_use_in_pdfs, updated_at").eq("id", 1).single(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = orderRaw as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (itemsRaw ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyInfo = (settingsRaw ?? null) as any;

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(OrderPdfDocument, { order, items, companyInfo }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.order_number}.pdf"`,
    },
  });
}
