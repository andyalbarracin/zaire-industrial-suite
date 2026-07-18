// loading.tsx — src/app/(dashboard)/field/unidades/loading.tsx — 2026-07-13
// Skeleton de carga del ABM de unidades.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-skeleton rounded" />
        <div className="h-10 w-36 bg-skeleton rounded" />
      </div>
      <div className="h-12 w-full bg-skeleton rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-skeleton rounded" />
        ))}
      </div>
    </div>
  );
}
