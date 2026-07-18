// loading.tsx — src/app/(dashboard)/crm/cuentas/loading.tsx — 2026-07-17
// Skeleton de carga de cuentas.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-skeleton rounded" />
      <div className="h-12 w-full bg-skeleton rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-skeleton rounded" />
        ))}
      </div>
    </div>
  );
}
