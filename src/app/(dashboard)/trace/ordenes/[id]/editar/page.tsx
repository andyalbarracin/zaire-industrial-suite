// page.tsx — src/app/(dashboard)/trace/ordenes/[id]/editar/page.tsx — 2026-05-19
// Página de edición de una orden de trabajo existente

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/trace/order-form";

export default async function EditarOrdenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [{ data: orderRaw }, { data: itemsRaw }, { data: clients }, { data: products }] = await Promise.all([
    sb.from("work_orders").select("id, order_number, order_type, branch_id, client_id, date_in, date_due, currency, requiere_compra, orden_compra, remito_salida, general_notes").eq("id", id).is("deleted_at", null).single(),
    sb.from("work_order_items").select("item_number, product_id, custom_description, quantity, serial_number, equipment_number, additional_observation, unit_price, unit_price_ars, repair_required, notes, modelo, medida, unidad_medida, marca, materiales_caras, materiales_orings, origen_abastecimiento, orden_compra_item, is_quoted, is_remitted, qty_remitted, is_delivered, qty_delivered, is_invoiced, qty_invoiced").eq("work_order_id", id).order("item_number"),
    sb.from("clients").select("id, business_name, tax_id").eq("is_active", true).order("business_name"),
    sb.from("products").select("id, code, name, brand, model, category, unit, default_currency, default_unit_price").eq("is_active", true).order("name"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = orderRaw as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = itemsRaw as any[];

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">
          Editar Orden — <span className="font-mono">{order.order_number}</span>
        </h1>
      </div>
      <OrderForm
        clients={clients ?? []}
        products={products ?? []}
        order={order as never}
        orderItems={items ?? []}
      />
    </div>
  );
}
