// page.tsx — src/app/(dashboard)/productos/page.tsx — 2026-05-19
// Lista de productos con filtros y acciones CRUD

import { createClient } from "@/lib/supabase/server";
import { ProductsTable } from "@/components/products/products-table";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, code, name, description, category, brand, model, unit, default_currency, default_unit_price, is_active, notes, created_at, updated_at")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Productos</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {products?.length ?? 0} productos en catálogo
        </p>
      </div>
      <ProductsTable initialProducts={products ?? []} />
    </div>
  );
}
