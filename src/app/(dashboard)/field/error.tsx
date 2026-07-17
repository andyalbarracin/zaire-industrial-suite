"use client";
// error.tsx — src/app/(dashboard)/field/error.tsx — 2026-07-17
// Error boundary del módulo Zaire Field (aísla fallos del resto de la suite).

import { ErrorView } from "@/components/shared/error-view";

export default function FieldError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView title="Error en Zaire Field" reset={props.reset} />;
}
