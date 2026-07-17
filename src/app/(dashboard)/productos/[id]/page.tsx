// page.tsx — src/app/(dashboard)/productos/[id]/page.tsx — 2026-05-19
// Detalle de producto (redirect a lista con filter por ahora, extendible)

import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default async function ProductoDetailPage() {
  redirect(ROUTES.productos);
}
