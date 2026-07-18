"use client";
// contacts-table.tsx — src/components/crm/contacts-table.tsx — 2026-07-16
// Tabla de contactos comerciales: búsqueda, paginación, export XLS y alta/edición.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Download, Star } from "lucide-react";
import * as XLSX from "xlsx";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LimitNotice } from "@/components/shared/limit-notice";
import { ContactForm } from "./contact-form";
import { CONTACTS_LIMIT } from "@/lib/crm/constants";
import type { CrmContact, Client } from "@/lib/crm/types";

const PAGE_SIZES = [10, 20, 50, 100];

interface ContactsTableProps {
  initialContacts: CrmContact[];
  clients: Client[];
}

export function ContactsTable({ initialContacts, clients }: ContactsTableProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<CrmContact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrmContact | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return contacts.filter((c) => {
      if (!s) return true;
      const parent = c.client?.business_name ?? c.lead?.company_name ?? c.lead?.contact_name ?? "";
      const hay = `${c.full_name} ${c.role_title ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${parent}`.toLowerCase();
      return hay.includes(s);
    });
  }, [contacts, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function handleSaved(c: CrmContact) {
    setContacts((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...c }; return next; }
      return [c, ...prev];
    });
  }

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(c: CrmContact) { setEditing(c); setFormOpen(true); }

  function parentName(c: CrmContact) {
    return c.client?.business_name ?? c.lead?.company_name ?? c.lead?.contact_name ?? "—";
  }

  function exportExcel() {
    const rows = filtered.map((c) => ({
      Nombre: c.full_name, Cargo: c.role_title ?? "", Cliente: parentName(c),
      Email: c.email ?? "", Teléfono: c.phone ?? "", Principal: c.is_primary ? "Sí" : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contactos");
    XLSX.writeFile(wb, `Zaire_CRM_Contactos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <LimitNotice count={contacts.length} limit={CONTACTS_LIMIT} />

      <div className="zaire-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--zaire-border)">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
            <Input placeholder="Buscar contactos..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportExcel} className="h-9"><Download className="w-4 h-4 mr-1.5" /> XLS</Button>
            <Button onClick={openNew} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-9"><Plus className="w-4 h-4 mr-1.5" /> Nuevo Contacto</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Cargo</th>
                <th className="text-left px-4 py-3">Cliente / Lead</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {pageRows.map((c) => (
                <tr key={c.id} onClick={() => router.push(ROUTES.crm.contacto(c.id))} className="hover:bg-subtle/80 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-(--zaire-text)">
                    <span className="inline-flex items-center gap-1.5">
                      {c.is_primary && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                      {c.full_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-(--zaire-text-muted)">{c.role_title ?? "—"}</td>
                  <td className="px-4 py-3">{parentName(c)}</td>
                  <td className="px-4 py-3 text-(--zaire-text-muted)">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-(--zaire-text-muted)">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-(--zaire-text-muted)">No se encontraron contactos</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-(--zaire-border) text-sm text-(--zaire-text-muted)">
          <div className="flex items-center gap-2">
            <span>{filtered.length} registros</span>
            <span className="text-(--zaire-border)">·</span>
            <label className="flex items-center gap-1.5">Mostrar
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="h-8 rounded-lg border border-(--zaire-border) bg-panel px-2 text-sm text-(--zaire-text)">
                {PAGE_SIZES.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>Anterior</Button>
            <span className="text-xs">Página {safePage + 1} de {pageCount}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}>Siguiente</Button>
          </div>
        </div>
      </div>

      <ContactForm open={formOpen} onOpenChange={setFormOpen} contact={editing} clients={clients} onSaved={handleSaved} />
    </div>
  );
}
