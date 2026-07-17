// page.tsx — src/app/(dashboard)/trace/ordenes/nueva/page.tsx — 2026-05-19
// Página de creación de nueva orden de trabajo

import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/trace/order-form";

export default async function NuevaOrdenPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: products }] = await Promise.all([
    supabase.from("clients").select("id, business_name, tax_id").eq("is_active", true).order("business_name"),
    supabase.from("products").select("id, code, name, brand, model, category, unit, default_currency, default_unit_price").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Nueva Orden de Trabajo</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          Completá los datos para registrar la orden
        </p>
      </div>
      <OrderForm
        clients={clients ?? []}
        products={products ?? []}
        defaultClientId={clientId}
      />
    </div>
  );
}
