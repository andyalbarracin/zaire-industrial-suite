// route.ts — /api/reportes/trazabilidad/[id] — PDF de trazabilidad completa de una orden

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { TrazabilidadDocument } from "@/lib/pdf/report-trazabilidad-template";
import { BRANCHES } from "@/lib/constants";
import React from "react";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: ord }, { data: itms }, { data: hist }, { data: aud }] = await Promise.all([
    // Importes en sus DOS monedas (columnas USD + _ars); el template elige cuál mostrar
    // con resolveAmount(). Ver src/lib/trace/amounts.ts.
    sb.from("work_orders").select(`
      id, order_number, order_type, status, date_in, date_due, currency, total, total_ars, branch_id, general_notes,
      clients(business_name, tax_id, contact_name, client_code)
    `).eq("id", id).single(),
    sb.from("work_order_items").select(`
      item_number, quantity, custom_description, serial_number, equipment_number,
      marca, medida, unit_price, total_price, unit_price_ars, total_price_ars,
      is_quoted, is_remitted, is_delivered, is_invoiced,
      products(name, code)
    `).eq("work_order_id", id).order("item_number"),
    sb.from("work_order_status_history").select(`
      old_status, new_status, notes, created_at, profiles(full_name)
    `).eq("work_order_id", id).order("created_at"),
    sb.from("audit_logs").select("action, description, user_name, created_at")
      .eq("entity_id", id).order("created_at"),
  ]);

  if (!ord) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const branch = BRANCHES.find(b => b.id === ord.branch_id);

  const data = {
    order: {
      order_number: ord.order_number,
      order_type: ord.order_type,
      status: ord.status,
      date_in: ord.date_in,
      date_due: ord.date_due,
      currency: ord.currency,
      total: ord.total,
      total_ars: ord.total_ars,
      branch_code: branch?.code ?? ord.branch_id ?? "—",
      general_notes: ord.general_notes,
      client_name: ord.clients?.business_name ?? "—",
      client_tax_id: ord.clients?.tax_id ?? null,
      client_code: ord.clients?.client_code ?? null,
      client_contact: ord.clients?.contact_name ?? null,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (itms ?? []).map((it: any) => ({
      item_number: it.item_number,
      quantity: it.quantity,
      description: it.products?.name ?? it.custom_description ?? "—",
      serial_number: it.serial_number,
      equipment_number: it.equipment_number,
      marca: it.marca,
      medida: it.medida,
      unit_price: it.unit_price,
      total_price: it.total_price,
      unit_price_ars: it.unit_price_ars,
      total_price_ars: it.total_price_ars,
      is_quoted: it.is_quoted,
      is_remitted: it.is_remitted,
      is_delivered: it.is_delivered,
      is_invoiced: it.is_invoiced,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    history: (hist ?? []).map((h: any) => ({
      old_status: h.old_status,
      new_status: h.new_status,
      notes: h.notes,
      created_at: h.created_at,
      user_name: h.profiles?.full_name ?? "Sistema",
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audit: (aud ?? []).map((a: any) => ({
      action: a.action,
      description: a.description,
      user_name: a.user_name,
      created_at: a.created_at,
    })),
  };

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(TrazabilidadDocument, { data }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Trazabilidad_${ord.order_number}.pdf"`,
    },
  });
}
