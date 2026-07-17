// page.tsx — src/app/(dashboard)/buscar/page.tsx — 2026-07-18
// Búsqueda universal de la suite (cross-módulo, gateada). Resultados agrupados por tipo.

import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { searchSuite } from "@/lib/search";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function BuscarPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const groups = term.length >= 2 ? await searchSuite(term) : [];
  const total = groups.reduce((s, g) => s + g.hits.length, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Búsqueda</h1>
        {term && <p className="text-sm text-(--zaire-text-muted) mt-0.5">{total} resultado{total === 1 ? "" : "s"} para «{term}»</p>}
      </div>

      <form action={ROUTES.buscar} method="get" className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
        <input
          name="q"
          defaultValue={term}
          autoFocus
          placeholder="Buscar en toda la suite (clientes, órdenes, leads, oportunidades, cotizaciones, visitas...)"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-(--zaire-border) bg-white text-sm text-(--zaire-text) focus:outline-none focus:ring-2 focus:ring-zaire-blue/40"
        />
      </form>

      {groups.length === 0 ? (
        <div className="zaire-card p-10 text-center">
          <p className="text-sm text-(--zaire-text-muted)">
            {term.length >= 2 ? "Sin resultados. Probá con otro término." : "Escribí al menos 2 caracteres para buscar en toda la suite."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key} className="zaire-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-(--zaire-border) bg-slate-50">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-(--zaire-text-muted)">{g.label} ({g.hits.length})</h2>
              </div>
              <ul className="divide-y divide-(--zaire-border)">
                {g.hits.map((h, i) => (
                  <li key={i}>
                    <Link href={h.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-(--zaire-text) truncate">{h.title}</p>
                        {h.subtitle && <p className="text-xs text-(--zaire-text-muted) truncate">{h.subtitle}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
