// route.ts — src/app/api/crm/quote-pdf/[id]/route.ts — 2026-07-17
// Genera el PDF (cara al cliente) de una cotización del CRM. Rate-limited + autenticado.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePdfDocument } from "@/lib/pdf/quote-pdf-template";
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) return new NextResponse("Demasiadas solicitudes", { status: 429 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: quoteRaw }, { data: settingsRaw }, { data: attsRaw }] = await Promise.all([
    sb.from("crm_quotes")
      .select(`
        id, quote_number, title, status, currency, valid_until, terms, notes,
        subtotal, tax_pct, tax_amount, total, created_at,
        client:clients(business_name, tax_id),
        items:crm_quote_items(item_number, description, specs, quantity, unit_price, line_total)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    sb.from("company_settings").select("id, nombre, cuit, direccion, ciudad, telefono, email, web").eq("id", 1).maybeSingle(),
    sb.from("crm_attachments").select("storage_path, file_name, file_type, category").eq("entity_type", "quote").eq("entity_id", id).is("deleted_at", null).order("created_at"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quote = quoteRaw as any;
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = ((quote.items ?? []) as any[]).sort((a, b) => a.item_number - b.item_number);
  const companyInfo = settingsRaw ?? null;

  // Fotos adjuntas (solo imágenes) → signed URLs para el anexo del PDF.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageAtts = ((attsRaw ?? []) as any[]).filter((a) => a.category === "foto" || (a.file_type ?? "").startsWith("image"));
  let photos: { url: string; caption: string }[] = [];
  if (imageAtts.length > 0) {
    const { data: signed } = await supabase.storage.from("crm-adjuntos").createSignedUrls(imageAtts.map((a) => a.storage_path), 300);
    photos = (signed ?? [])
      .map((s, i) => (s.signedUrl ? { url: s.signedUrl, caption: imageAtts[i].file_name as string } : null))
      .filter((x): x is { url: string; caption: string } => x !== null);
  }

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(QuotePdfDocument, { quote, items, companyInfo, photos }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quote_number ?? "cotizacion"}.pdf"`,
    },
  });
}
