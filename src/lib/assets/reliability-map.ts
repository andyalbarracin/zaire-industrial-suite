// reliability-map.ts — src/lib/assets/reliability-map.ts — 2026-10-22
// El Mapa de confiabilidad (§7.4): ubicar cada equipo en uno de cuatro cuadrantes. PURO.
//
// La pregunta que responde el mapa no es "¿cuál está peor?" sino **"¿qué clase de problema
// tengo?"**. Dos equipos con la misma salud pueden necesitar cosas opuestas: a uno le falta plan
// de mantenimiento, al otro le sobra. En una tabla eso no se ve; en el mapa, el cuadrante lo dice.
//
// EJE X — frecuencia de falla, **relativa a su referencia**, no el MTBF crudo.
//   40 días entre fallas es excelente para una bomba exigida y pésimo para un motor nuevo.
//   Comparar MTBF crudos entre equipos distintos es comparar peras con manzanas.
//
// EJE Y — índice reactivo: qué proporción del trabajo fue apagar un incendio en vez de planificar.
//
// TAMAÑO — criticidad: un punto grande en el cuadrante feo es lo primero que tiene que saltar.

export type QuadrantId = "bajo_control" | "plan_insuficiente" | "sin_plan" | "apagando_incendios";

/** El corte del eje X: cumple su referencia o no. */
const RATIO_CORTE = 1;
/** Techo del ratio, para que un equipo excepcional no aplaste la escala del resto. */
const RATIO_MAX = 3;
/**
 * El corte del eje Y: más de la mitad del trabajo fue por falla.
 * Es el punto medio y se explica solo; los umbrales de 0,7 / 0,2 del ZHI son para otra cosa
 * (disparar recomendaciones), y usarlos acá dejaría una franja sin cuadrante.
 */
const REACTIVO_CORTE = 0.5;

export const QUADRANTS: Record<QuadrantId, { label: string; hint: string }> = {
  bajo_control: {
    label: "Bajo control",
    hint: "Se rompen poco y el trabajo es planificado. No hay nada que corregir acá.",
  },
  plan_insuficiente: {
    label: "El plan no alcanza",
    hint: "Se les hace el preventivo y aun así se rompen seguido. Hay que revisar qué incluye el plan, no cuántas veces se hace.",
  },
  sin_plan: {
    label: "Estable, sin plan",
    hint: "Hoy aguantan, pero solo se los toca cuando ya fallaron. Están zafando, no controlados.",
  },
  apagando_incendios: {
    label: "Apagando incendios",
    hint: "Se rompen seguido y siempre se llega tarde. Acá va causa raíz o reemplazo.",
  },
};

/** Por qué un equipo no se puede ubicar en el mapa. */
export type ExclusionReason = "fuera_de_servicio" | "sin_fallas" | "sin_referencia" | "sin_intervenciones";

const EXCLUSION_TEXT: Record<ExclusionReason, string> = {
  fuera_de_servicio: "está fuera de servicio",
  sin_fallas: "todavía no falló en el período",
  sin_referencia: "no tiene con qué compararse todavía",
  sin_intervenciones: "no tuvo intervenciones en el período",
};

export interface MapSubject {
  id: string;
  name: string;
  tag: string | null;
  criticidad: number;
  mtbfHours: number | null;
  /** La referencia resuelta del equipo (propia, de la flota o por defecto). */
  referenceHours: number | null;
  reactiveIndex: number | null;
  outOfService: boolean;
}

export interface MapPoint {
  id: string;
  label: string;
  /** MTBF / referencia, topeado. 1 = cumple exactamente su referencia. */
  x: number;
  /** Índice reactivo, 0 a 1. */
  y: number;
  size: number;
  criticidad: number;
  quadrant: QuadrantId;
}

export interface ReliabilityMap {
  points: MapPoint[];
  /** Los que no se pudieron ubicar, con el motivo en palabras. Nunca se esconden. */
  excluded: { id: string; label: string; reason: ExclusionReason; text: string }[];
  ratioCorte: number;
  reactivoCorte: number;
  ratioMax: number;
}

function quadrantOf(ratio: number, reactivo: number): QuadrantId {
  const fallaPoco = ratio >= RATIO_CORTE;
  const planificado = reactivo < REACTIVO_CORTE;
  if (fallaPoco) return planificado ? "bajo_control" : "sin_plan";
  return planificado ? "plan_insuficiente" : "apagando_incendios";
}

/**
 * Arma el mapa.
 *
 * Un equipo que no se puede ubicar **no desaparece**: va a `excluded` con el motivo escrito. Al
 * principio van a ser mayoría, y un mapa con tres puntos y sin explicación parece un mapa roto.
 */
export function buildReliabilityMap(subjects: readonly MapSubject[]): ReliabilityMap {
  const points: MapPoint[] = [];
  const excluded: ReliabilityMap["excluded"] = [];

  for (const s of subjects) {
    const label = s.tag ? `${s.tag} · ${s.name}` : s.name;

    const reason: ExclusionReason | null =
      s.outOfService ? "fuera_de_servicio"
      : s.reactiveIndex === null ? "sin_intervenciones"
      : s.mtbfHours === null ? "sin_fallas"
      : s.referenceHours === null || s.referenceHours <= 0 ? "sin_referencia"
      : null;

    if (reason) {
      excluded.push({ id: s.id, label, reason, text: `${label} ${EXCLUSION_TEXT[reason]}` });
      continue;
    }

    const ratio = Math.min(s.mtbfHours! / s.referenceHours!, RATIO_MAX);
    points.push({
      id: s.id, label,
      x: ratio,
      y: s.reactiveIndex!,
      // El área crece con la criticidad; el salto entre 1 y 5 tiene que notarse sin tapar vecinos.
      size: 60 + s.criticidad * 50,
      criticidad: s.criticidad,
      quadrant: quadrantOf(ratio, s.reactiveIndex!),
    });
  }

  return { points, excluded, ratioCorte: RATIO_CORTE, reactivoCorte: REACTIVO_CORTE, ratioMax: RATIO_MAX };
}
