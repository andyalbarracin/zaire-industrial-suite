// page.tsx — src/app/(dashboard)/crm/contactos/page.tsx — 2026-07-16
// Zaire CRM — Contactos comerciales (personas dentro de un cliente/lead).

import { getContacts, getCrmClients } from "@/lib/crm/queries";
import { ContactsTable } from "@/components/crm/contacts-table";

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const [contacts, clients] = await Promise.all([getContacts(), getCrmClients()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Contactos</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">
          {contacts.length} contactos comerciales
        </p>
      </div>
      <ContactsTable initialContacts={contacts} clients={clients} />
    </div>
  );
}
