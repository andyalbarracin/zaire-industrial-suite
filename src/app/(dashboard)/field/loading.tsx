// loading.tsx — src/app/(dashboard)/field/loading.tsx — 2026-07-13
// Skeleton de carga del Panel Field.

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-slate-200 rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 w-full bg-slate-200 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-slate-200 rounded-xl" />
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
      <div className="h-56 w-full bg-slate-200 rounded-xl" />
    </div>
  );
}
