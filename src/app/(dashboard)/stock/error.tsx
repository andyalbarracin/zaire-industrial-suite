"use client";
// error.tsx — src/app/(dashboard)/stock/error.tsx — 2026-07-18
// Error boundary del módulo Zaire Stock (aísla fallos del resto de la suite).

import { ErrorView } from "@/components/shared/error-view";

export default function StockError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView title="Error en Zaire Stock" reset={props.reset} />;
}
