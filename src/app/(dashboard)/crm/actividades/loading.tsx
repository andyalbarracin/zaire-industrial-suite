// loading.tsx — src/app/(dashboard)/crm/actividades/loading.tsx — 2026-07-16
// Skeleton de carga del timeline de actividades.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-slate-200 rounded" />
        <div className="h-10 w-40 bg-slate-200 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 w-full bg-slate-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
