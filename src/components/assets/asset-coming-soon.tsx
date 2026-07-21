// asset-coming-soon.tsx — src/components/assets/asset-coming-soon.tsx — 2026-07-20
// Placeholder de pantallas de Activos aún no construidas (se reemplaza en su fase).

import { Construction } from "lucide-react";

export function AssetComingSoon({ title, desc, phase }: { title: string; desc: string; phase: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">{title}</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">{desc}</p>
      </div>
      <div className="zaire-card p-10 flex flex-col items-center justify-center text-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-brand-soft grid place-items-center">
          <Construction className="w-6 h-6 text-brand-strong" />
        </span>
        <p className="text-sm font-medium text-(--zaire-text)">Pantalla en construcción</p>
        <p className="text-xs text-(--zaire-text-muted) max-w-sm">{phase}</p>
      </div>
    </div>
  );
}
