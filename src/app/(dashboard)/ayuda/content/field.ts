// field.ts — src/app/(dashboard)/ayuda/content/field.ts — 2026-08-03
// Contenido de Ayuda del módulo Zaire Field. Se muestra solo si field está activo (enabled_modules).
import { MapPin, HardHat, Satellite, Receipt, GitBranchPlus } from "lucide-react";
import type { Section } from "./types";

export const fieldSections: Section[] = [

  {
    id: "field-visitas",
    icon: MapPin,
    title: "Zaire Field — Visitas",
    color: "text-violet-600 dark:text-violet-300",
    keywords: "field campo visita agendar planificada en curso en sitio finalizada cancelada técnico unidad cliente sitio planta propósito relevamiento reparación entrega número correlativo estado facturable cobranza detalle",
    steps: [
      {
        title: "Qué es Zaire Field",
        body: "Zaire Field es el módulo de gestión de trabajo en campo: agenda de visitas técnicas a plantas/sitios, tracking GPS con geocercas, reporte de visita, viáticos/gastos y documentos. Se accede desde la sección 'Zaire Field' de la sidebar.",
      },
      {
        title: "Crear una visita",
        body: "Ir a Zaire Field → Visitas → 'Nueva Visita'. Elegí sucursal (no se cambia después), técnico, unidad, cliente, sitio, propósito y fecha agendada. Al guardar, la visita recibe un número correlativo por sucursal (ej: VIS-2026-NQN0001) y queda en estado 'Planificada'.",
        alert: { type: "info", text: "Podés vincular la visita a una OT existente de Zaire Trace desde el propio formulario." },
      },
      {
        title: "Estados de la visita",
        body: "Planificada → En Curso → En Sitio → Finalizada (o Cancelada). Al pasar a 'En Sitio' se registra el arribo; al 'Finalizar' se registra el fin. El cambio se hace desde el detalle de la visita, con notas opcionales.",
      },
      {
        title: "Detalle de la visita",
        body: "Muestra datos generales, fechas, mapa con el recorrido y la geocerca, timeline de eventos, reporte técnico, fotos y gastos. Es la pantalla central de la operación de campo.",
      },
      {
        title: "Facturable y cobranza",
        body: "Cada visita puede marcarse como facturable y tener un estado de cobranza (No facturable, Pendiente, Facturado, Cobrado), editable desde el detalle. Estos campos alimentan los reportes financieros.",
      },
    ],
  },

  {
    id: "field-recursos",
    icon: HardHat,
    title: "Zaire Field — Técnicos, Unidades y Plantas",
    color: "text-blue-600 dark:text-blue-300",
    keywords: "field técnico operador vehículo unidad camioneta patente planta sitio geocerca radio mapa coordenadas latitud longitud ABM alta baja",
    steps: [
      {
        title: "Técnicos",
        body: "Zaire Field → Técnicos. Alta/edición de los técnicos de campo con DNI, sucursal base, licencia y contacto. Un técnico puede quedar preparado para el futuro login desde la app móvil.",
      },
      {
        title: "Unidades (vehículos)",
        body: "Zaire Field → Unidades. Registrá los vehículos con patente, marca, modelo, tipo, sucursal y técnico asignado.",
      },
      {
        title: "Plantas / Sitios con geocerca",
        body: "Zaire Field → Plantas. Cada sitio tiene ubicación (lat/lng) y un radio de geocerca. Podés fijar la ubicación haciendo clic en el mapa y ajustar el radio con el slider; el círculo de geocerca se dibuja en vivo.",
        alert: { type: "info", text: "La geocerca es lo que permite detectar automáticamente el arribo del técnico al sitio." },
      },
    ],
  },

  {
    id: "field-tracking",
    icon: Satellite,
    title: "Zaire Field — Tracking y geocercas",
    color: "text-cyan-600 dark:text-cyan-300",
    keywords: "field gps tracking ping ubicación geocerca arribo salida automático simulador recorrido demo tiempo real realtime mapa live",
    steps: [
      {
        title: "Tracking y detección de arribo",
        body: "A medida que llegan posiciones GPS del técnico, el sistema calcula la distancia al sitio. Cuando entra dentro de la geocerca, marca el arribo automáticamente, pasa la visita a 'En Sitio' y registra el evento; al salir, registra la salida.",
      },
      {
        title: "Simular recorrido (demo)",
        body: "En el detalle de una visita con sitio, el botón 'Simular recorrido' genera una traza de prueba que se acerca al sitio y entra a la geocerca, disparando el arribo. Sirve para demostrar el flujo sin la app móvil.",
        alert: { type: "warning", text: "El simulador es solo para demostración; en producción los pings los envía la app móvil del técnico." },
      },
      {
        title: "Mapa en vivo",
        body: "El mapa del detalle muestra el sitio, su geocerca, la traza recorrida y la última posición del técnico, y se actualiza en tiempo real cuando llegan posiciones nuevas.",
      },
    ],
  },

  {
    id: "field-gastos-docs",
    icon: Receipt,
    title: "Zaire Field — Gastos, Documentos y Reportes",
    color: "text-green-600 dark:text-green-300",
    keywords: "field gasto viático combustible peaje comida hotel aprobar rechazar reintegrado facturable total documento licencia VTV seguro vencimiento semáforo alerta reporte operativo financiero recharts excel",
    steps: [
      {
        title: "Gastos / viáticos",
        body: "Se cargan desde el detalle de la visita o desde Zaire Field → Gastos (vista global). Cada gasto tiene categoría, monto, moneda y puede marcarse como facturable. Desde la vista global se aprueban o rechazan y se ven totales por categoría.",
      },
      {
        title: "Documentos con vencimiento",
        body: "Zaire Field → Documentos. Licencias, VTV, seguros, etc. de técnicos y vehículos, con semáforo por días a vencer (rojo vencido/≤7 días, ámbar ≤30, verde OK). Se puede adjuntar el archivo del documento.",
        alert: { type: "warning", text: "Los documentos por vencer también aparecen en la campana de notificaciones del header." },
      },
      {
        title: "Reportes Field",
        body: "Zaire Field → Reportes Field. Pestaña Operativos (visitas por estado, técnico, cliente, sucursal; tiempo promedio en sitio) y Financieros (gastos por categoría/técnico, control de cobranza). Exportables a XLS.",
      },
    ],
  },

  {
    id: "field-reporte",
    icon: GitBranchPlus,
    title: "Zaire Field — Reporte de visita y solicitud de OT/OTS",
    color: "text-indigo-600 dark:text-indigo-300",
    keywords: "field reporte de visita hallazgos medida marca materiales diagnóstico requiere reparación solicitar OT OTS orden de trabajo admin vincular integración zaire trace",
    steps: [
      {
        title: "Cargar el reporte de la visita",
        body: "En el detalle de la visita, sección 'Reporte de visita', se cargan los datos técnicos del relevamiento: equipo/TAG, número de serie, medida y unidad, marca, modelo, materiales de caras y o'rings, hallazgos, recomendaciones y si requiere reparación. Se guarda con el botón 'Guardar reporte'. También se pueden subir fotos.",
      },
      {
        title: "Solicitar una OT/OTS (no la crea el técnico)",
        body: "Desde el reporte, el botón 'Solicitar OT/OTS' deja una solicitud para el administrador con los datos ya cargados. IMPORTANTE: esto NO crea la orden. Las OT/OTS tienen número correlativo e irrepetible y las crea el administrador en Zaire Trace, de forma controlada.",
        alert: { type: "warning", text: "El usuario de Field solicita; el número de OT/OTS lo genera siempre el administrador en Zaire Trace." },
      },
      {
        title: "El administrador crea y vincula",
        body: "El estado de la solicitud pasa por: No solicitada → Solicitada → Vinculada (o Rechazada). El admin crea la OT/OTS en Zaire Trace y luego, desde el reporte, la vincula a la visita con 'Vincular OT'. Así el trabajo de campo queda conectado con la administración sin recargar datos.",
        alert: { type: "success", text: "Diferencial de Zaire Field: del campo a la administración con trazabilidad, respetando la numeración de órdenes." },
      },
    ],
  },
];
