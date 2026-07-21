// page.tsx — src/app/(dashboard)/assets/documentos/page.tsx — 2026-07-20
// Documentos/garantías de todos los equipos, ordenados por vencimiento (semáforo). La descarga vive en la ficha.

import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { getAssetDocuments } from "@/lib/assets/queries";
import { StatusDot } from "@/components/shared/status-dot";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AssetDocumentosPage() {
  const docs = await getAssetDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Documentos / Garantías</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">{docs.length} documento(s) · ordenados por vencimiento</p>
      </div>

      <div className="zaire-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle border-b border-(--zaire-border) text-xs text-(--zaire-text-muted) uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Documento</th>
                <th className="text-left px-5 py-3">Equipo</th>
                <th className="text-left px-5 py-3">Tipo</th>
                <th className="text-right px-5 py-3">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--zaire-border)">
              {docs.map((d) => {
                const days = d.expires_at ? Math.round((new Date(d.expires_at).getTime() - Date.now()) / 86_400_000) : null;
                const light = days == null ? null : days < 0 ? "red" : days <= 30 ? "yellow" : "green";
                return (
                  <tr key={d.id} className="hover:bg-subtle/80 transition-colors">
                    <td className="px-5 py-2.5 text-(--zaire-text)">{d.name ?? d.doc_type ?? "Documento"}</td>
                    <td className="px-5 py-2.5">
                      {d.asset ? <Link href={ROUTES.assets.equipo(d.asset.id)} className="text-zaire-blue hover:underline">{d.asset.name}</Link> : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-(--zaire-text-muted)">{d.doc_type ?? "—"}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      {d.expires_at ? (
                        <span className="inline-flex items-center gap-1.5 justify-end">
                          {light && <StatusDot status={light} size="sm" pulse={light === "red"} />}
                          <span className={light === "red" ? "text-red-600 dark:text-red-300" : "text-(--zaire-text-muted)"}>{formatDate(d.expires_at)}</span>
                        </span>
                      ) : <span className="text-(--zaire-text-muted)">Sin vencimiento</span>}
                    </td>
                  </tr>
                );
              })}
              {docs.length === 0 && (<tr><td colSpan={4} className="px-5 py-12 text-center text-(--zaire-text-muted)">Sin documentos. Subilos desde la ficha de cada equipo.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
