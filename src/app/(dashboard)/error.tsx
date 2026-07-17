"use client";
// error.tsx — src/app/(dashboard)/error.tsx — 2026-07-17
// Error boundary del dashboard (fallback general de la suite).

import { ErrorView } from "@/components/shared/error-view";

export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView title="Algo salió mal" reset={props.reset} />;
}
