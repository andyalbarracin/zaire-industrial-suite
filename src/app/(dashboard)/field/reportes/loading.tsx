// loading.tsx — src/app/(dashboard)/field/reportes/loading.tsx — 2026-07-13
// Skeleton de carga de reportes.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-44 bg-slate-200 rounded" />
      <div className="h-10 w-64 bg-slate-200 rounded" />
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 w-full bg-slate-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
