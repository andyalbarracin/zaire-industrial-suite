// page.tsx — src/app/(dashboard)/field/documentos/page.tsx — 2026-07-13
// Zaire Field — documentos con vencimiento (técnicos y vehículos).

import { getFieldDocuments, getTechnicians, getVehicles, DOCS_LIMIT } from "@/lib/field/queries";
import { DocumentsTable } from "@/components/field/documents-table";
import { LimitNotice } from "@/components/shared/limit-notice";

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const [documents, technicians, vehicles] = await Promise.all([
    getFieldDocuments(),
    getTechnicians(true),
    getVehicles(true),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Documentos</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">{documents.length} documentos registrados</p>
        <p className="text-xs text-(--zaire-text-muted) mt-1">
          Podés cargar <strong>múltiples documentos</strong> por técnico o unidad: licencia, VTV, RTO, seguro,
          cédula, título, ADR/SENASA, ART, apto médico, certificados de seguridad, trabajo en altura, cursos y más.
        </p>
      </div>
      <LimitNotice count={documents.length} limit={DOCS_LIMIT} />
      <DocumentsTable initialDocuments={documents} technicians={technicians} vehicles={vehicles} />
    </div>
  );
}
