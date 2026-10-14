// zhi.ts — src/lib/assets/zhi.ts — 2026-10-12
// Zaire Health Index: la salud del activo como aritmética explicable, no como modelo de IA.
//
// Implementa el §6 de .docs/assets-confiabilidad/assets-confiabilidad-salud-e-ia.md.
// PURO: no lee la base, no mira el reloj, no tiene estado. Mismos datos → mismo número.
// Todo lo que necesita entra como parámetro, igual que en `reliability.ts`.
//
// DECISIONES DE PRODUCTO QUE ESTE ARCHIVO RESPETA
//  · D5 — Los pesos, umbrales y topes son CONSTANTES EN CÓDIGO con número de versión
//    (`ZHI_VERSION`). No hay tabla de configuración: en una tabla el algoritmo viajaría en
//    cualquier export de la base del cliente, y una config por tenant son N configuraciones
//    divergiendo. El historial de git es la auditoría de los pesos.
//  · D6 — La UI NUNCA muestra el cálculo. Los `subIndices` que devuelve esta función existen
//    para los snapshots y el backtesting, NO para pintarlos en pantalla. Lo que se muestra es
//    número, banda, confianza y los 2 `motivos`, que ya vienen en lenguaje de planta.
//
// Los pesos y umbrales son INICIALES: se calibran con datos reales (§6.7). No son verdades de
// ingeniería y no hay que venderlos como tales.

import type { Confidence } from "@/lib/assets/reliability";

/**
 * Versión del algoritmo. **Subirla cada vez que cambie un peso, un umbral o una fórmula.**
 * Se guarda junto a cada resultado: sin esto, dos cálculos del mismo equipo en fechas distintas
 * dan números diferentes y nadie puede explicar por qué.
 */
export const ZHI_VERSION = "1.0.0";

/** Pesos de los 5 sub-índices (§6.2). Suman 1. */
export const ZHI_WEIGHTS = {
  confiabilidad: 0.30,
  cargaMantenimiento: 0.20,
  tendencia: 0.20,
  integridad: 0.20,
  costoVidaUtil: 0.10,
} as const;

/** Penalizaciones del sub-índice de Integridad (§6.2). */
const INTEGRIDAD_PENAL = {
  inspeccionVencida: 40,
  docCriticoVencido: 25,
  porVencer: 10,
  fichaIncompleta: 10,
} as const;

/** Topes duros (§6.4): le ganan al promedio ponderado, y solo pueden BAJAR el número. */
const TOPES = {
  /** Una falla reciente no puede figurar como "Sano". */
  fallaRecienteDias: 14,
  fallaRecienteMax: 79,
  /** Inspección vencida en equipo crítico: no puede figurar mejor que "En riesgo". */
  inspeccionVencidaMax: 59,
  /** Desde esta criticidad el equipo se considera crítico para los topes. */
  criticidadAlta: 4,
} as const;

/** Bandas (§6.5). */
const BANDAS = { sano: 80, atencion: 60, enRiesgo: 40 } as const;

/** Arranque en frío (§6.3): el equipo arranca como si tuviera k eventos "de referencia". */
const COLD_START_K = 2;

/** Umbral de costo: se compara el gasto de 12 m contra esta fracción del valor de reposición. */
const COSTO_UMBRAL_FRACCION = 0.5;

/** Penalización de costo por haber superado la vida útil esperada. */
const VIDA_UTIL_SUPERADA_PENAL = 15;

/**
 * Umbrales de las recomendaciones (§6.5). Como todo lo demás: constantes en código, versionadas.
 *
 * El ORDEN de `PRIORIDAD_RECOMENDACION` es una decisión de producto, no una casualidad:
 * se muestra UNA sola recomendación, y tiene que ser la que más cambia si se actúa.
 *  1. reemplazo — si hay que cambiar el equipo, optimizar su preventivo es trabajo al aire.
 *  2. causa_raiz — es la más concreta y accionable: un modo de falla puntual que se repite.
 *  3. plan_preventivo — mejora sistémica, no urgente.
 *  4. sobre_mantenimiento — ahorro, no riesgo. Lo último.
 */
const RECOMENDACION = {
  /** Índice reactivo por encima de esto: casi todo lo que se hace es apagar incendios. */
  reactivoAlto: 0.7,
  /** Índice reactivo por debajo de esto: casi nada es por falla. */
  reactivoBajo: 0.2,
  /** Tendencia por debajo de esto: los intervalos se están acortando de forma relevante. */
  tendenciaDegradando: 0.7,
  /** Veces que el mismo modo de falla tiene que repetirse para hablar de causa raíz. */
  modoFallaRepetido: 2,
  /** MTBR estimado / referencia por debajo de esto: se interviene mucho más de lo esperado. */
  mtbrSobreIntervencion: 0.5,
} as const;

const PRIORIDAD_RECOMENDACION = ["reemplazo", "causa_raiz", "plan_preventivo", "sobre_mantenimiento"] as const;

/** Factor de criticidad para la prioridad de atención (§6.6). */
function criticidadFactor(criticidad: number): number {
  if (criticidad >= 4) return 1.5;   // A
  if (criticidad === 3) return 1.0;  // B
  return 0.6;                        // C
}

// ----------------------------------------------------------------- contrato

export type ZhiBand = "sano" | "atencion" | "en_riesgo" | "critico";

export type ZhiSubIndexKey = keyof typeof ZHI_WEIGHTS;

export type ZhiReglaRecomendacion = (typeof PRIORIDAD_RECOMENDACION)[number];

export interface ZhiRecomendacion {
  regla: ZhiReglaRecomendacion;
  /** Qué hacer, en una frase de taller. Nunca la regla ni el umbral que la disparó (D6). */
  texto: string;
}

export interface ZhiInput {
  // --- Estado del equipo
  status: string;                        // operativo | en_reparacion | standby | baja
  criticidad: number;                    // 1..5

  // --- Confiabilidad: sale del motor de `reliability.ts`, del período
  operatingHours: number;                // U
  failures: number;                      // F
  interventions: number;                 // R
  reactiveIndex: number | null;          // F/R. null = no hubo intervenciones
  trend: number | null;                  // null = no hay suficientes intervalos
  confidence: Confidence;
  /** Días desde la última falla. null = no hay fallas registradas. Para el tope de 14 días. */
  daysSinceLastFailure: number | null;

  // --- Referencias (§6.3). null = no se pudo resolver → el sub-índice sale null, no 0.
  mtbfReferenceHours: number | null;
  mtbrReferenceHours: number | null;

  // --- Integridad (§5)
  expiredInspections: number;
  expiredCriticalDocs: number;           // certificado o garantía crítica vencida
  docsExpiringSoon: number;              // vence en < 30 días
  /** Campos de la ficha sin completar. La penalización es binaria; la lista es para el motivo. */
  camposFichaFaltantes: string[];

  // --- Costo y vida útil
  maintenanceCost12m: number | null;
  replacementValue: number | null;
  ageYears: number | null;
  expectedLifeYears: number | null;

  /**
   * Modos de falla de las fallas del período (`asset_events.modo_de_falla`), sin normalizar.
   * Alimenta la regla de causa raíz. Vacío o ausente = no hay dato de modo de falla.
   */
  failureModes?: readonly string[];
}

export interface ZhiMotivo {
  subIndice: ZhiSubIndexKey;
  /** peso × (100 − sub-índice). Es el orden en que se muestran, no se muestra el número. */
  puntosRestados: number;
  /** Frase en lenguaje de planta. Nunca la fórmula ni los pesos (D6). */
  texto: string;
}

export interface Zhi {
  version: string;
  /** Equipo en reparación o dado de baja: estado en lugar de número (§6.4). */
  outOfService: boolean;
  score: number | null;
  band: ZhiBand | null;
  confidence: Confidence;
  /** Para snapshots y backtesting. NO para la UI (D6). `null` = no se pudo calcular. */
  subIndices: Record<ZhiSubIndexKey, number | null>;
  /** Los 2 que más puntos restan, ya traducidos. */
  motivos: ZhiMotivo[];
  /** Qué tope se aplicó, si alguno. En lenguaje de planta. */
  capApplied: string | null;
  /** (100 − salud) × factor de criticidad. Para ordenar "¿qué atiendo primero?" (§6.6). */
  priority: number | null;
  /** Qué hacer: UNA sola, la de mayor prioridad entre las que aplican. `null` si no aplica ninguna. */
  recomendacion: ZhiRecomendacion | null;
}

// ---------------------------------------------------------------- utilidades

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

/** Estimador con prior (§6.3): arranca en la referencia y la suelta a medida que llegan eventos. */
function coldStart(referenceHours: number, operatingHours: number, events: number): number {
  return (COLD_START_K * referenceHours + operatingHours) / (COLD_START_K + events);
}

// ------------------------------------------------------------- sub-índices

/** §6.2 — Confiabilidad: ¿falla tanto como se espera que falle? */
function subConfiabilidad(p: ZhiInput): number | null {
  if (p.mtbfReferenceHours === null || p.mtbfReferenceHours <= 0) return null;
  const mtbfEst = coldStart(p.mtbfReferenceHours, p.operatingHours, p.failures);
  return clamp100(100 * Math.min(1, mtbfEst / p.mtbfReferenceHours));
}

/** §6.2 — Carga de mantenimiento: ¿cuánto lo intervenimos, y cuánto de eso fue apagar incendios? */
function mtbrEstimado(p: ZhiInput): number | null {
  if (p.mtbrReferenceHours === null || p.mtbrReferenceHours <= 0) return null;
  return coldStart(p.mtbrReferenceHours, p.operatingHours, p.interventions);
}

function subCargaMantenimiento(p: ZhiInput): number | null {
  const mtbrEst = mtbrEstimado(p);
  if (mtbrEst === null || p.mtbrReferenceHours === null) return null;
  const ratio = Math.min(1, mtbrEst / p.mtbrReferenceHours);
  // Sin intervenciones no hubo nada reactivo: el término reactivo vale lo máximo.
  const reactivo = p.reactiveIndex ?? 0;
  return clamp100(100 * (0.6 * ratio + 0.4 * (1 - reactivo)));
}

/** §6.2 — Tendencia: ≥1 → 100 · ≤0,5 → 0 · lineal en el medio. */
function subTendencia(p: ZhiInput): number | null {
  if (p.trend === null) return null;
  if (p.trend >= 1) return 100;
  if (p.trend <= 0.5) return 0;
  return clamp100(100 * ((p.trend - 0.5) / 0.5));
}

/**
 * §6.2 — Integridad: ¿está en regla y en condición segura?
 * Nunca es null: sin datos simplemente no hay penalizaciones. Es el único sub-índice que
 * siempre se puede calcular, así que siempre hay un score.
 */
function subIntegridad(p: ZhiInput): number {
  let v = 100;
  v -= p.expiredInspections > 0 ? INTEGRIDAD_PENAL.inspeccionVencida : 0;
  v -= p.expiredCriticalDocs > 0 ? INTEGRIDAD_PENAL.docCriticoVencido : 0;
  v -= p.docsExpiringSoon > 0 ? INTEGRIDAD_PENAL.porVencer : 0;
  v -= p.camposFichaFaltantes.length > 0 ? INTEGRIDAD_PENAL.fichaIncompleta : 0;
  return clamp100(v);
}

/** §6.2 — Costo y vida útil: ¿sigue conviniendo repararlo? */
function subCostoVidaUtil(p: ZhiInput): number | null {
  if (p.replacementValue === null || p.replacementValue <= 0) return null;
  const umbral = p.replacementValue * COSTO_UMBRAL_FRACCION;
  let v = 100 * (1 - (p.maintenanceCost12m ?? 0) / umbral);
  v = clamp100(v);
  const superoVidaUtil =
    p.ageYears !== null && p.expectedLifeYears !== null && p.expectedLifeYears > 0 &&
    p.ageYears > p.expectedLifeYears;
  if (superoVidaUtil) v -= VIDA_UTIL_SUPERADA_PENAL;
  return clamp100(v);
}

// ----------------------------------------------------------------- motivos

/** Traduce un sub-índice bajo a una frase de taller. Sin fórmulas, sin pesos (D6). */
function motivoTexto(key: ZhiSubIndexKey, p: ZhiInput): string {
  switch (key) {
    case "confiabilidad":
      return p.failures > 0
        ? `Registra ${p.failures} ${p.failures === 1 ? "falla" : "fallas"} en el período: falla más seguido de lo esperado.`
        : "Falla más seguido de lo esperado para este tipo de equipo.";
    case "cargaMantenimiento": {
      const ir = p.reactiveIndex;
      if (ir !== null && ir >= 0.7) {
        return `Se interviene seguido y casi siempre por falla: ${Math.round(ir * 10)} de cada 10 intervenciones.`;
      }
      return `Se intervino ${p.interventions} ${p.interventions === 1 ? "vez" : "veces"} en el período: más de lo esperado.`;
    }
    case "tendencia":
      return "Los intervalos entre intervenciones se están acortando.";
    case "integridad": {
      const partes: string[] = [];
      if (p.expiredInspections > 0) partes.push(`${p.expiredInspections === 1 ? "una inspección vencida" : `${p.expiredInspections} inspecciones vencidas`}`);
      if (p.expiredCriticalDocs > 0) partes.push("documentación vencida");
      if (p.docsExpiringSoon > 0) partes.push("documentación por vencer");
      if (p.camposFichaFaltantes.length > 0) partes.push(`faltan datos en la ficha (${p.camposFichaFaltantes.join(", ")})`);
      return partes.length ? `Tiene ${partes.join(" y ")}.` : "Tiene pendientes de documentación.";
    }
    case "costoVidaUtil":
      return p.ageYears !== null && p.expectedLifeYears !== null && p.ageYears > p.expectedLifeYears
        ? "Ya superó su vida útil esperada y lo gastado en mantenimiento es alto frente a lo que costaría reemplazarlo."
        : "Lo gastado en mantenimiento es alto frente a lo que costaría reemplazarlo.";
  }
}

// ----------------------------------------------------------- recomendación

/** Modo de falla que más se repite, normalizado. `null` si ninguno llega al mínimo. */
function modoFallaRepetido(modos: readonly string[] | undefined): { modo: string; veces: number } | null {
  if (!modos?.length) return null;
  const cuenta = new Map<string, number>();
  for (const m of modos) {
    const k = m.trim().toLowerCase();
    if (!k) continue;
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  let top: { modo: string; veces: number } | null = null;
  for (const [modo, veces] of cuenta) {
    if (veces >= RECOMENDACION.modoFallaRepetido && (top === null || veces > top.veces)) top = { modo, veces };
  }
  return top;
}

/**
 * Qué hacer con el equipo. Las 4 reglas del §6.5, deterministas — **no hay modelo acá**.
 * Devuelve UNA sola: la primera que aplique según `PRIORIDAD_RECOMENDACION`.
 *
 * `null` cuando no aplica ninguna, que es el caso de un equipo sano: no hay nada que hacer y
 * llenar ese lugar con una frase genérica sería ruido.
 */
function recomendar(p: ZhiInput, mtbrEst: number | null): ZhiRecomendacion | null {
  const candidatas = new Map<ZhiReglaRecomendacion, string>();

  // 1. Reemplazo — gastó MÁS de la mitad de lo que cuesta reemplazarlo.
  if (p.replacementValue !== null && p.replacementValue > 0 && p.maintenanceCost12m !== null) {
    const umbral = p.replacementValue * COSTO_UMBRAL_FRACCION;
    if (p.maintenanceCost12m > umbral) {
      candidatas.set("reemplazo",
        "Ya se gastó en mantenimiento más de la mitad de lo que costaría reemplazarlo. Conviene evaluar el reemplazo.");
    }
  }

  // 2. Causa raíz — se está degradando Y repite el mismo modo de falla.
  if (p.trend !== null && p.trend < RECOMENDACION.tendenciaDegradando) {
    const top = modoFallaRepetido(p.failureModes);
    if (top) {
      candidatas.set("causa_raiz",
        `Repite la misma falla: ${top.veces} veces por ${top.modo} en el período, y los intervalos se acortan. Conviene buscar la causa raíz.`);
    }
  }

  // 3. Plan preventivo — casi todo lo que se hace es apagar incendios.
  if (p.reactiveIndex !== null && p.reactiveIndex > RECOMENDACION.reactivoAlto) {
    candidatas.set("plan_preventivo",
      "Casi todo lo que se le hace es por falla, no planificado. Conviene armarle un plan preventivo.");
  }

  // 4. Sobre-mantenimiento — se interviene mucho más seguido de lo esperado, y casi nunca por falla.
  // Requiere `reactiveIndex !== null`: con cero intervenciones no se interviene "de más",
  // simplemente no hay dato.
  if (
    p.reactiveIndex !== null &&
    p.reactiveIndex < RECOMENDACION.reactivoBajo &&
    mtbrEst !== null && p.mtbrReferenceHours !== null && p.mtbrReferenceHours > 0 &&
    mtbrEst / p.mtbrReferenceHours < RECOMENDACION.mtbrSobreIntervencion
  ) {
    candidatas.set("sobre_mantenimiento",
      "Se interviene mucho más seguido de lo esperado y casi nunca por falla. Conviene revisar la frecuencia del preventivo.");
  }

  for (const regla of PRIORIDAD_RECOMENDACION) {
    const texto = candidatas.get(regla);
    if (texto) return { regla, texto };
  }
  return null;
}

// -------------------------------------------------------------------- motor

export function computeZhi(p: ZhiInput): Zhi {
  const subIndices: Record<ZhiSubIndexKey, number | null> = {
    confiabilidad: subConfiabilidad(p),
    cargaMantenimiento: subCargaMantenimiento(p),
    tendencia: subTendencia(p),
    integridad: subIntegridad(p),
    costoVidaUtil: subCostoVidaUtil(p),
  };

  // §6.4 — Un equipo en reparación o dado de baja no tiene "salud": tiene un estado.
  // Mostrar un número ahí sería contestar una pregunta que nadie hizo.
  if (p.status === "en_reparacion" || p.status === "baja") {
    return {
      version: ZHI_VERSION,
      outOfService: true,
      score: null,
      band: null,
      confidence: p.confidence,
      subIndices,
      motivos: [],
      capApplied: p.status === "baja" ? "El equipo está dado de baja." : "El equipo está en reparación.",
      priority: null,
      // Un equipo fuera de servicio ya está siendo atendido: recomendarle algo es ruido.
      recomendacion: null,
    };
  }

  // Promedio ponderado SOLO sobre los sub-índices calculables, renormalizando los pesos.
  // Si un sub-índice null contara como 0, un equipo sin valor de reposición cargado se vería
  // enfermo por un dato que falta, no por su estado.
  const calculables = (Object.keys(ZHI_WEIGHTS) as ZhiSubIndexKey[])
    .filter((k) => subIndices[k] !== null);
  const pesoTotal = calculables.reduce((a, k) => a + ZHI_WEIGHTS[k], 0);
  const bruto = pesoTotal > 0
    ? calculables.reduce((a, k) => a + ZHI_WEIGHTS[k] * (subIndices[k] as number), 0) / pesoTotal
    : null;

  let score = bruto === null ? null : Math.round(clamp100(bruto));

  // §6.4 — Topes. Solo bajan: se aplican con min() para no subir una salud ya peor.
  let capApplied: string | null = null;
  if (score !== null) {
    if (p.expiredInspections > 0 && p.criticidad >= TOPES.criticidadAlta && score > TOPES.inspeccionVencidaMax) {
      score = TOPES.inspeccionVencidaMax;
      capApplied = "Tiene una inspección vencida en un equipo crítico.";
    }
    if (
      p.daysSinceLastFailure !== null &&
      p.daysSinceLastFailure <= TOPES.fallaRecienteDias &&
      score > TOPES.fallaRecienteMax
    ) {
      score = TOPES.fallaRecienteMax;
      capApplied = `Falló en los últimos ${TOPES.fallaRecienteDias} días.`;
    }
  }

  const band: ZhiBand | null =
    score === null ? null
      : score >= BANDAS.sano ? "sano"
      : score >= BANDAS.atencion ? "atencion"
      : score >= BANDAS.enRiesgo ? "en_riesgo"
      : "critico";

  // §6.5 — Los 2 sub-índices que más puntos restan, traducidos.
  const motivos: ZhiMotivo[] = calculables
    .map((k) => ({
      subIndice: k,
      puntosRestados: Math.round(ZHI_WEIGHTS[k] * (100 - (subIndices[k] as number)) * 100) / 100,
      texto: motivoTexto(k, p),
    }))
    .filter((m) => m.puntosRestados > 0)
    .sort((a, b) => b.puntosRestados - a.puntosRestados)
    .slice(0, 2);

  // §6.6 — Salud ≠ riesgo. La prioridad combina el déficit de salud con la criticidad.
  const priority = score === null ? null
    : Math.round((100 - score) * criticidadFactor(p.criticidad) * 100) / 100;

  return {
    version: ZHI_VERSION, outOfService: false, score, band, confidence: p.confidence,
    subIndices, motivos, capApplied, priority,
    recomendacion: recomendar(p, mtbrEstimado(p)),
  };
}
