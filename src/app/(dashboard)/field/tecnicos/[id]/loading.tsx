// loading.tsx — src/app/(dashboard)/field/tecnicos/[id]/loading.tsx — 2026-07-13
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-skeleton rounded" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="h-80 bg-skeleton rounded-xl" />
        <div className="lg:col-span-2 h-80 bg-skeleton rounded-xl" />
      </div>
    </div>
  );
}
