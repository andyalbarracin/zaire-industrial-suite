// loading.tsx — src/app/(dashboard)/assets/loading.tsx — 2026-07-20
// Skeleton de carga del módulo Zaire Assets.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-skeleton rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-skeleton rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 bg-skeleton rounded-xl" />
        <div className="h-72 bg-skeleton rounded-xl" />
      </div>
    </div>
  );
}
