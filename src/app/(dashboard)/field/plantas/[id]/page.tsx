// page.tsx — src/app/(dashboard)/field/plantas/[id]/page.tsx — 2026-07-13
// Zaire Field — ficha de planta/sitio.

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSite } from "@/lib/field/queries";
import { SiteDetail } from "@/components/field/site-detail";
import type { Client } from "@/lib/field/types";

export const dynamic = "force-dynamic";

export default async function PlantaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) notFound();

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, business_name, tax_id, contact_name, email, phone, address, city, notes, is_active, client_code, created_at, updated_at")
    .eq("is_active", true)
    .order("business_name");

  return <SiteDetail site={site} clients={(clients ?? []) as Client[]} />;
}
