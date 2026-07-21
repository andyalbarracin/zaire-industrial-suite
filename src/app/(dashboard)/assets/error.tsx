"use client";
// error.tsx — src/app/(dashboard)/assets/error.tsx — 2026-07-20
// Error boundary del módulo Zaire Assets (aísla fallos del resto de la suite).

import { ErrorView } from "@/components/shared/error-view";

export default function AssetsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView title="Error en Zaire Assets" reset={props.reset} />;
}
