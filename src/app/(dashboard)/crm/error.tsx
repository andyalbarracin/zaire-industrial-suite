"use client";
// error.tsx — src/app/(dashboard)/crm/error.tsx — 2026-07-17
// Error boundary del módulo Zaire CRM (aísla fallos del resto de la suite).

import { ErrorView } from "@/components/shared/error-view";

export default function CrmError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView title="Error en Zaire CRM" reset={props.reset} />;
}
