// loading.tsx — src/app/(dashboard)/field/gastos/[id]/loading.tsx — 2026-07-13
// Skeleton del detalle de gasto.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-skeleton rounded" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="h-52 w-full bg-skeleton rounded-xl" />
          <div className="h-40 w-full bg-skeleton rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="h-40 w-full bg-skeleton rounded-xl" />
          <div className="h-56 w-full bg-skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}
