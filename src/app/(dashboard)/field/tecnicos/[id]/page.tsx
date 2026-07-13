// page.tsx — src/app/(dashboard)/field/tecnicos/[id]/page.tsx — 2026-07-13
// Zaire Field — ficha de técnico.

import { notFound } from "next/navigation";
import {
  getTechnician, getTechnicianContacts, getTechnicianFiles, getTechnicianDocuments,
  getTechnicianLog, getCurrentUserProfile,
} from "@/lib/field/queries";
import { TechnicianDetail } from "@/components/field/technician-detail";

export const dynamic = "force-dynamic";

export default async function TecnicoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const technician = await getTechnician(id);
  if (!technician) notFound();

  const [contacts, files, documents, log, currentUser] = await Promise.all([
    getTechnicianContacts(id),
    getTechnicianFiles(id),
    getTechnicianDocuments(id),
    getTechnicianLog(id),
    getCurrentUserProfile(),
  ]);

  return (
    <TechnicianDetail
      technician={technician}
      contacts={contacts}
      files={files}
      documents={documents}
      log={log}
      currentUser={currentUser}
    />
  );
}
