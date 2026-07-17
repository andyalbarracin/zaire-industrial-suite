// page.tsx — src/app/(dashboard)/clientes/page.tsx — 2026-05-27
// Lista de clientes con búsqueda y acciones CRUD

import { createClient } from "@/lib/supabase/server";
import { ClientsTable } from "@/components/clients/clients-table";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, business_name, client_code, tax_id, contact_name, email, phone, city, is_active, created_at, updated_at, address, notes")
    .order("business_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Clientes</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {clients?.length ?? 0} clientes registrados
        </p>
      </div>
      <ClientsTable initialClients={(clients ?? []) as never} />
    </div>
  );
}
