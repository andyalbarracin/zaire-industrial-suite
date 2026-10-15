"use client";
// fleet-health.tsx — src/components/assets/fleet-health.tsx — 2026-10-15
// Confiabilidad a nivel FLOTA: donut por banda de salud + las medianas de MTBF/MTTR/disponibilidad.
//
// Dos decisiones que vale aclarar:
//  1. **Donut y no barras**: son 4 o 5 categorías que suman el total de la flota. Ocupa la mitad
//     del alto de un gráfico de barras y la pregunta que responde ("¿cómo está repartida mi
//     planta?") es de proporción, que es justo lo que un donut muestra bien.
//  2. **El donut nunca va solo**: al lado va la leyenda con el número y el porcentaje de cada
//     banda, y en el centro el total. Si alguien no distingue los colores, el dato igual está.
//
// MEDIANA, no promedio: un equipo recién instalado que todavía no falló movería el promedio hasta
// decir que la planta está impecable. La mediana no se deja correr por un solo extremo.

import { ZHI_BAND_LABELS } from "@/lib/assets/constants";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { DonutWithLegend } from "@/components/assets/donut-legend";
import { ROUTES } from "@/lib/routes";
import type { BandSlice, FleetReliability } from "@/lib/assets/reports";

const BAND_COLOR: Record<BandSlice["band"], string> = {
  sano: "var(--success)",
  atencion: "var(--warning)",
  en_riesgo: "#EA7C1F",
  critico: "var(--danger)",
  fuera_de_servicio: "var(--skeleton)",
};

const BAND_LABEL = (b: BandSlice["band"]) =>
  b === "fuera_de_servicio" ? "Fuera de servicio" : ZHI_BAND_LABELS[b];

const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export function FleetHealth({ bands, reliability }: { bands: BandSlice[]; reliability: FleetReliability }) {
  const total = bands.reduce((s, b) => s + b.value, 0);

  // Cada banda lleva al listado ya filtrado: el donut deja de ser decoración y pasa a ser el
  // punto de entrada a "mostrame cuáles son esos cuatro equipos críticos".
  const items = bands.map((b) => ({
    key: b.band,
    label: BAND_LABEL(b.band),
    value: b.value,
    color: BAND_COLOR[b.band],
    href: b.band === "fuera_de_servicio"
      ? `${ROUTES.assets.equipos}?estado=en_reparacion`
      : `${ROUTES.assets.equipos}?banda=${b.band}`,
  }));

  // Las tres medianas, en lenguaje de taller y con la misma unidad (días) que la ficha.
  const medianas = [
    {
      label: "Falla cada",
      value: reliability.mtbfDays !== null ? `~${dias(reliability.mtbfDays)}` : "Sin datos",
      tip: "Mediana de MTBF de la flota: el equipo del medio falla cada tanto. La mitad falla más seguido; la otra mitad, menos.",
    },
    {
      label: "Vuelve a operar en",
      value: reliability.mttrDays !== null ? `~${dias(reliability.mttrDays)}` : "Sin datos",
      tip: "Mediana de MTTR de la flota: cuánto tarda el equipo del medio en volver a operar después de una falla.",
    },
    {
      label: "Operativo el",
      value: reliability.availability !== null ? `${Math.round(reliability.availability * 100)}% del tiempo` : "Sin datos",
      tip: "Mediana de disponibilidad de la flota: qué proporción del tiempo estuvo operativo el equipo del medio.",
    },
  ];

  return (
    <div className="zaire-card p-5 animate-fade-up-1">
      <div className="flex items-center gap-1.5 mb-4">
        <h3 className="text-sm font-semibold text-(--zaire-text)">Salud de la flota</h3>
        <InfoTooltip text="Se calcula con medianas, no con promedios: así un equipo atípico no distorsiona el panorama de la planta." />
      </div>

      <DonutWithLegend
        items={items}
        centerValue={total}
        centerLabel={total === 1 ? "equipo" : "equipos"}
        emptyText="Todavía no hay equipos cargados."
      />

      {/* Las medianas: lo que el integrante de SAS pedía ver claro, a nivel planta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-(--zaire-border)">
        {medianas.map((m) => (
          <div key={m.label}>
            <p className="text-[11px] text-(--zaire-text-muted) flex items-center gap-1">
              {m.label}
              <InfoTooltip text={m.tip} />
            </p>
            <p className="text-sm font-semibold text-(--zaire-text) mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>
      {reliability.conDato > 0 && (
        <p className="text-[10.5px] text-(--zaire-text-muted) mt-3">
          Medianas sobre {reliability.conDato} equipo{reliability.conDato === 1 ? "" : "s"} con historial suficiente.
        </p>
      )}
    </div>
  );
}
