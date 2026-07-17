// page.tsx — src/app/(dashboard)/crm/cuentas/page.tsx — 2026-07-17
// Zaire CRM — Cuentas clave B2B (clientes + rollups comerciales).

import { getAccounts } from "@/lib/crm/queries";
import { AccountsTable } from "@/components/crm/accounts-table";

export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const accounts = await getAccounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Cuentas</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {accounts.length} cuentas con seguimiento comercial
        </p>
      </div>
      <AccountsTable initialAccounts={accounts} />
    </div>
  );
}
