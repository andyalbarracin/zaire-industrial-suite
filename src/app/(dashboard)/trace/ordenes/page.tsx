// page.tsx — src/app/(dashboard)/trace/ordenes/page.tsx — 2026-05-27
// Lista principal de órdenes de trabajo con TanStack Table y filtros

import { createClient } from "@/lib/supabase/server";
import { OrdersTable } from "@/components/trace/orders-table";
import { LimitNotice } from "@/components/shared/limit-notice";
import { ORDERS_LIMIT } from "@/lib/trace/constants";

export const dynamic = "force-dynamic";

export default async function OrdenesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [{ data: orders }, { data: clients }, { data: profile }] = await Promise.all([
    supabase
      .from("work_orders")
      .select(`
        id, order_number, order_type, status, date_in, date_due,
        currency, subtotal, total, branch_id, general_notes, remito_salida, orden_compra, created_at,
        clients(id, business_name, client_code),
        work_order_items(is_quoted, is_remitted, is_delivered, is_invoiced, status, serial_number, equipment_number, custom_description, modelo, orden_compra_item, origen_abastecimiento, total_price_ars, marca, materiales_caras, materiales_orings, additional_observation, products(name))
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(ORDERS_LIMIT),
    supabase
      .from("clients")
      .select("id, business_name")
      .eq("is_active", true)
      .order("business_name"),
    sb
      .from("profiles")
      .select("id, full_name")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
  ]);

  const currentProfile = profile
    ? { id: profile.id as string, full_name: (profile.full_name as string) ?? "" }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Órdenes de Trabajo</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {orders?.length ?? 0} órdenes registradas
        </p>
      </div>
      <LimitNotice count={orders?.length ?? 0} limit={ORDERS_LIMIT} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OrdersTable initialOrders={(orders ?? []) as any} clients={clients ?? []} initialSearch={q ?? ""} currentProfile={currentProfile} />
    </div>
  );
}
