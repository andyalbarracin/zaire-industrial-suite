// page.tsx — src/app/(dashboard)/field/documentos/page.tsx — 2026-07-13
// Zaire Field — documentos con vencimiento (técnicos y vehículos).

import { getFieldDocuments, getTechnicians, getVehicles } from "@/lib/field/queries";
import { DocumentsTable } from "@/components/field/documents-table";

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
        <h1 className="text-2xl font-bold text-(--sas-text)">Documentos</h1>
        <p className="text-sm text-(--sas-text-muted) mt-0.5">{documents.length} documentos registrados</p>
        <p className="text-xs text-(--sas-text-muted) mt-1">
          Podés cargar <strong>múltiples documentos</strong> por técnico o unidad: licencia, VTV, RTO, seguro,
          cédula, título, ADR/SENASA, ART, apto médico, certificados de seguridad, trabajo en altura, cursos y más.
        </p>
      </div>
      <DocumentsTable initialDocuments={documents} technicians={technicians} vehicles={vehicles} />
    </div>
  );
}
