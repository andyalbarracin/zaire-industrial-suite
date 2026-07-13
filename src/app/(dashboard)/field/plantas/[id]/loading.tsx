// loading.tsx — src/app/(dashboard)/field/plantas/[id]/loading.tsx — 2026-07-13
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="h-72 bg-slate-200 rounded-xl" />
        <div className="lg:col-span-2 h-96 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}
