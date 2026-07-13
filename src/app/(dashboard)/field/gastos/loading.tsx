// loading.tsx — src/app/(dashboard)/field/gastos/loading.tsx — 2026-07-13
// Skeleton de carga de gastos.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-slate-200 rounded" />
      <div className="h-12 w-full bg-slate-200 rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-slate-200 rounded" />
        ))}
      </div>
    </div>
  );
}
