// loading.tsx — src/app/(dashboard)/field/tecnicos/loading.tsx — 2026-07-13
// Skeleton de carga del ABM de técnicos.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-slate-200 rounded" />
        <div className="h-10 w-36 bg-slate-200 rounded" />
      </div>
      <div className="h-12 w-full bg-slate-200 rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-slate-200 rounded" />
        ))}
      </div>
    </div>
  );
}
