"use client";
// error.tsx — src/app/(dashboard)/trace/error.tsx — 2026-07-17
// Error boundary del módulo Zaire Trace (aísla fallos del resto de la suite).

import { ErrorView } from "@/components/shared/error-view";

export default function TraceError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView title="Error en Zaire Trace" reset={props.reset} />;
}
