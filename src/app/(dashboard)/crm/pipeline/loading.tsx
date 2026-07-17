// loading.tsx — src/app/(dashboard)/crm/pipeline/loading.tsx — 2026-07-16
// Skeleton de carga del pipeline.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-slate-200 rounded" />
        <div className="h-10 w-44 bg-slate-200 rounded" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-64 shrink-0 h-96 bg-slate-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
