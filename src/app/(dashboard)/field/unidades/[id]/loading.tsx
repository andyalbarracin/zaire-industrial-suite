// loading.tsx — src/app/(dashboard)/field/unidades/[id]/loading.tsx — 2026-07-13
// Skeleton de la ficha de unidad.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-skeleton rounded" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="h-80 bg-skeleton rounded-xl" />
        <div className="lg:col-span-2 space-y-4">
          <div className="h-10 w-64 bg-skeleton rounded" />
          <div className="h-64 bg-skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}
