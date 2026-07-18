"use client";
// page.tsx — src/app/(dashboard)/ayuda/page.tsx
// Centro de Ayuda — manual de usuario integrado con búsqueda y accordion

import { useState, useMemo } from "react";
import {
  Rocket, ClipboardList, Users, Package, Search,
  BarChart3, Shield, Printer, Lock, ChevronDown,
  AlertTriangle, Info, CheckCircle2,
  MapPin, HardHat, Satellite, Receipt, GitBranchPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Step = {
  title: string;
  body: string;
  alert?: { type: "warning" | "info" | "success"; text: string };
};

type Section = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  steps: Step[];
  keywords: string; // extra text for search
};

// ─── Badge inline ─────────────────────────────────────────────────────────────
function OTBadge() {
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 mx-0.5">OT</span>;
}
function OTSBadge() {
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300 mx-0.5">OTS</span>;
}
function Code({ children }: { children: string }) {
  return <code className="px-1.5 py-0.5 rounded bg-subtle-2 text-slate-700 dark:text-slate-200 text-[11px] font-mono mx-0.5">{children}</code>;
}

// ─── Alert box ────────────────────────────────────────────────────────────────
function AlertBox({ type, text }: { type: "warning" | "info" | "success"; text: string }) {
  const styles = {
    warning: { bg: "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200", icon: AlertTriangle, iconColor: "text-amber-500" },
    info:    { bg: "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200",    icon: Info,          iconColor: "text-blue-500" },
    success: { bg: "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-200", icon: CheckCircle2,  iconColor: "text-green-500" },
  }[type];
  const Icon = styles.icon;
  return (
    <div className={cn("flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs mt-2", styles.bg)}>
      <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", styles.iconColor)} />
      <span>{text}</span>
    </div>
  );
}

// ─── Definición de contenido ─────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "primeros-pasos",
    icon: Rocket,
    title: "Primeros pasos",
    color: "text-violet-600 dark:text-violet-300",
    keywords: "inicio sesión login dashboard stats vencimientos actividad navegación",
    steps: [
      {
        title: "Iniciar sesión",
        body: "Ingresá con tu email y contraseña en la pantalla de login. Si no tenés cuenta, usá el botón 'Registrarse' (requiere aprobación del administrador).",
      },
      {
        title: "El dashboard",
        body: "Al ingresar vas a ver 4 cards de resumen: órdenes activas, pendientes de entrega, pendientes de facturación e ingresadas hoy. Más abajo: tabla de órdenes recientes, distribución por estado, próximos vencimientos y actividad reciente.",
      },
      {
        title: "Navegación",
        body: "La sidebar izquierda tiene acceso a todos los módulos: Dashboard, Órdenes de Trabajo, Clientes, Productos, Historial, Reportes y Configuración. Más abajo, la sección 'Zaire Field' agrupa la operación de campo: Panel Field, Visitas, Técnicos, Unidades, Plantas, Gastos, Documentos y Reportes Field. Se puede colapsar con el botón circular a la derecha.",
      },
    ],
  },
  {
    id: "ordenes",
    icon: ClipboardList,
    title: "Órdenes de Trabajo",
    color: "text-blue-600 dark:text-blue-300",
    keywords: "nueva orden OT OTS crear editar ítem duplicar PDF planilla reparación estado cambiar exportar XLS CSV serie TAG marca medida materiales precio ARS USD facturada cancelada checklist semáforo",
    steps: [
      {
        title: "Tipos de orden",
        body: "Existen dos tipos: OT (Orden de Trabajo) para venta de productos nuevos, y OTS (Orden de Trabajo de Servicio) para reparaciones y reacondicionamientos. El tipo se elige al crear la orden y no se puede cambiar después.",
        alert: { type: "warning", text: "El tipo (OT/OTS) y la sucursal no pueden modificarse una vez creada la orden." },
      },
      {
        title: "Crear una nueva orden",
        body: "Ir a Órdenes de Trabajo → botón '+ Nueva Orden'. Primero elegir sucursal (BB, NQN, NOA o BUE), luego el tipo. Completar cliente, fechas, moneda y agregar al menos un ítem.",
      },
      {
        title: "Agregar ítems",
        body: "Cada ítem puede tener: producto del catálogo (con precio base autocompletado) o descripción libre, cantidad, número de serie, número de equipo/TAG, marca, medida (en MM o PULG), materiales de caras y o'rings, origen de abastecimiento (PO/NP/STOCK), precios en USD y ARS, y observaciones.",
      },
      {
        title: "Duplicar un ítem",
        body: "El ícono de duplicar (junto al de eliminar, arriba de cada ítem) copia todos los datos del ítem, dejando el número de serie y el TAG en blanco para que los completes con los valores del nuevo ítem.",
      },
      {
        title: "Precios duales USD / ARS",
        body: "Cada ítem tiene precio unitario en USD y en ARS. Los totales se calculan automáticamente. Al pie del formulario se muestra el total en ambas monedas.",
      },
      {
        title: "Workflow de estados",
        body: "Ingresada → En Revisión → Cotizada → Aprobada → En Reparación → Lista para Entregar → Remitido → Facturada. También existe el estado Cancelada. Para cambiar el estado, ir al detalle de la orden → pestaña 'Cambiar Estado'.",
      },
      {
        title: "Estado de trabajo del ítem",
        body: "Dentro del detalle de cada ítem (expandir con ▼), hay pills para cambiar el estado de trabajo: Pendiente, En Proceso, Completado, Entregado. El ítem activo queda resaltado en azul.",
      },
      {
        title: "Checklist del ítem (Cotizado / Remitido / Entregado / Facturado)",
        body: "Cada ítem tiene un checklist con 4 estados comerciales. Se puede marcar/desmarcar tanto en la vista de Detalle como en la de Edición. Al marcar, se guarda inmediatamente en la base de datos.",
      },
      {
        title: "Semáforo de estado en la tabla",
        body: "Las columnas Remitido, Entregado y Facturado en la tabla muestran un punto de color: verde = todos los ítems marcados, amarillo = algunos, rojo = ninguno. El semáforo 'Procesado' en el detalle indica avance de trabajo.",
      },
      {
        title: "Generar PDF de la orden",
        body: "En el detalle de una orden, botón 'PDF' arriba a la derecha. Genera el formulario RC 009-00 con datos de empresa, cliente, ítems, precios y espacio para firma.",
      },
      {
        title: "Planilla de Reparación (solo OTS)",
        body: "En el detalle de una OTS con ítems que requieren reparación, aparece el botón 'Planilla Reparación'. Genera el documento RC 010-00 con datos técnicos del sello y tabla de componentes.",
      },
      {
        title: "Exportar la tabla a XLS o CSV",
        body: "Botones 'XLS' y 'CSV' arriba de la tabla de órdenes. La exportación respeta todos los filtros activos. El CSV usa separador punto y coma (;), estándar Argentina.",
      },
    ],
  },
  {
    id: "clientes",
    icon: Users,
    title: "Clientes",
    color: "text-green-600 dark:text-green-300",
    keywords: "nuevo cliente razón social CUIT contacto email teléfono dirección código buscar",
    steps: [
      {
        title: "Crear un cliente nuevo",
        body: "Ir a Clientes → botón 'Nuevo Cliente'. La Razón Social es el único campo obligatorio. Se pueden agregar: CUIT, nombre de contacto, email, teléfono, dirección, ciudad y un código interno propio.",
      },
      {
        title: "Código de cliente",
        body: "Campo opcional para asignar un identificador propio (ej: C-0001, TEC-001). Aparece en los PDFs de órdenes como 'Código Cliente' para facilitar la referencia cruzada con el sistema del cliente.",
      },
      {
        title: "Buscar y ver historial",
        body: "Usar la barra de búsqueda en la tabla de clientes para filtrar por nombre, CUIT o contacto. Al hacer clic en un cliente se accede a su página de detalle con todas sus órdenes asociadas.",
      },
    ],
  },
  {
    id: "productos",
    icon: Package,
    title: "Productos",
    color: "text-orange-600 dark:text-orange-300",
    keywords: "nuevo producto categoría sello mecánico bomba empaquetadura spare part precio base catálogo",
    steps: [
      {
        title: "Agregar un producto al catálogo",
        body: "Ir a Productos → botón 'Nuevo Producto'. Completar nombre, código, categoría (sello mecánico, bomba, empaquetadura, spare part u otro), marca, modelo, precio base y moneda por defecto.",
      },
      {
        title: "Precio base en órdenes",
        body: "Al seleccionar un producto en una orden, el precio unitario se autocompleta con el precio base del catálogo. Es modificable por ítem sin afectar el precio base del catálogo.",
      },
      {
        title: "Productos vs. descripción libre",
        body: "Si un ítem no está en el catálogo, se puede ingresar como descripción libre directamente en el formulario del ítem. Esto es útil para servicios o piezas únicas que no justifican estar en el catálogo.",
      },
    ],
  },
  {
    id: "filtros",
    icon: Search,
    title: "Filtros y búsqueda",
    color: "text-cyan-600 dark:text-cyan-300",
    keywords: "buscar filtrar búsqueda global número serie estado sucursal cliente fechas combinar tabla header barra observaciones generales adicionales marca materiales caras orings código cliente",
    steps: [
      {
        title: "Barra de búsqueda global (header)",
        body: "La barra de búsqueda en la parte superior de la pantalla (⌘K) busca en toda la base de órdenes y redirige automáticamente a la tabla de Órdenes con el filtro aplicado. Podés escribir cualquier término y encontrar órdenes por múltiples criterios a la vez.",
        alert: { type: "info", text: "Presioná Enter o hacé clic en el ícono de lupa para ejecutar la búsqueda desde el header." },
      },
      {
        title: "Campos incluidos en la búsqueda",
        body: "La búsqueda global cubre todos estos campos simultáneamente: número de orden, observaciones generales de la orden, razón social del cliente, código de cliente, estado de la orden, y por cada ítem: número de serie, descripción, marca, materiales de caras, materiales de o'rings, observaciones adicionales del ítem y origen de abastecimiento.",
      },
      {
        title: "Ejemplos de búsqueda útiles",
        body: "Podés buscar: 'SKF' para encontrar todas las órdenes con ítems de esa marca; 'carburo' para encontrar ítems con ese material; 'C-0012' para encontrar órdenes del cliente con ese código; o cualquier texto que hayas escrito en observaciones generales o de ítem.",
      },
      {
        title: "Filtros adicionales en la tabla",
        body: "Además de la búsqueda de texto, la tabla tiene filtros independientes: Tipo (OT/OTS), Estado (selección múltiple), Sucursal (BB, NQN, NOA, BUE), Cliente (selector) y rango de fechas de ingreso (Desde/Hasta).",
      },
      {
        title: "Filtros combinados",
        body: "Todos los filtros se aplican simultáneamente sobre el texto buscado. Por ejemplo: buscar 'viton' + filtrar por sucursal NQN + estado 'En Reparación' mostrará solo las OTS de esa sucursal en reparación que tengan 'viton' en materiales.",
      },
      {
        title: "Navegar al detalle",
        body: "Hacer clic en cualquier fila de la tabla de órdenes navega directamente al detalle de esa orden. No hace falta usar el ícono de ojo.",
        alert: { type: "info", text: "El número de orden también es un link clickeable que lleva al detalle." },
      },
    ],
  },
  {
    id: "reportes",
    icon: BarChart3,
    title: "Reportes",
    color: "text-indigo-600 dark:text-indigo-300",
    keywords: "reporte operativo financiero auditoría período cliente facturación proyección pendiente XLS PDF secuencia integridad trazabilidad",
    steps: [
      {
        title: "Tab Operativos",
        body: "Cuatro reportes: Órdenes por Período (con filtro de fecha, sucursal y tipo), Órdenes por Cliente (ranking por volumen), Proyección Financiera (total proyectado de órdenes activas) y Pendientes de Facturación (ítems entregados sin facturar).",
      },
      {
        title: "Tab Financieros",
        body: "Dos reportes: Facturación por Período (total facturado con detalle por orden) e Ingresos por Cliente (ranking de clientes por monto facturado). Exportables a XLS.",
      },
      {
        title: "Tab Auditoría — Verificación de Secuencia",
        body: "Verifica que la numeración de órdenes sea continua sin huecos. Permite filtrar por año, sucursal y tipo. Genera un PDF formal para presentar en auditorías.",
      },
      {
        title: "Tab Auditoría — Trazabilidad por Orden",
        body: "Buscar una orden por número. Genera un informe completo con: datos generales, datos del cliente, tabla de ítems con estados, timeline completo de cambios de estado y log de todas las modificaciones.",
      },
      {
        title: "Tab Auditoría — Informe de Integridad",
        body: "Resumen ejecutivo del sistema para un período y sucursal. Incluye: totales por tipo y estado, montos facturados y pendientes, y verificación de consistencia (sin duplicados, sin registros sin número, soft-delete verificado).",
        alert: { type: "info", text: "Los reportes de auditoría usan números de orden como identificadores, nunca IDs técnicos internos." },
      },
    ],
  },
  {
    id: "trazabilidad",
    icon: Shield,
    title: "Trazabilidad y auditoría",
    color: "text-emerald-600 dark:text-emerald-300",
    keywords: "historial auditoría log registro cambio estado automático correlativo número cancelada huecos borrar eliminar",
    steps: [
      {
        title: "Registro automático",
        body: "El sistema registra automáticamente cada acción: creación de órdenes, modificaciones, cambios de estado. Cada registro incluye fecha y hora exacta, usuario que realizó la acción y descripción del cambio.",
      },
      {
        title: "Historial clickeable",
        body: "En la página de Historial, cada registro es clickeable: las órdenes llevan al detalle de la orden, los clientes al detalle del cliente, los productos al catálogo. Hay un ícono de flecha que indica los registros navegables.",
      },
      {
        title: "Numeración correlativa automática",
        body: "Cada orden recibe un número automático e irrepetible (ej: OT-2026-BB0001). El formato es: tipo + año + código de sucursal + secuencia numérica. Este número no se puede editar ni reutilizar.",
      },
      {
        title: "Las órdenes no se borran",
        body: "Ninguna orden se elimina físicamente del sistema. Solo pueden ser canceladas, y el registro permanece con su historial completo intacto.",
        alert: { type: "success", text: "Esto garantiza la integridad del registro para auditorías ISO 9001:2015." },
      },
      {
        title: "Huecos en la numeración",
        body: "Si el reporte de secuencia detecta un número faltante, significa que esa orden fue cancelada. Las órdenes canceladas mantienen su número pero cambian su estado a 'Cancelada'.",
        alert: { type: "warning", text: "Un hueco real (número que nunca existió) debería ser reportado al administrador del sistema." },
      },
    ],
  },
  {
    id: "impresion",
    icon: Printer,
    title: "Impresión y documentos",
    color: "text-slate-600 dark:text-slate-300",
    keywords: "PDF imprimir planilla reparación formulario RC009 RC010 XLS CSV exportar firma",
    steps: [
      {
        title: "PDF de Orden de Trabajo (RC 009-00)",
        body: "Disponible en el detalle de cualquier orden. Genera el formulario RC 009-00 con: datos de empresa, datos del cliente, tabla de ítems con códigos, precios, y columnas de estado (R/F). Orientación horizontal.",
      },
      {
        title: "Planilla de Reparación (RC 010-00)",
        body: "Solo disponible en órdenes OTS que tienen ítems con 'Requiere reparación' activado. Genera una planilla por cada ítem, con datos técnicos del sello, tabla de componentes fija y campos para pruebas neumática e hidráulica.",
      },
      {
        title: "Exportar a XLS (.xlsx)",
        body: "Botón 'XLS' sobre la tabla de órdenes. El archivo incluye el encabezado y todos los registros con los filtros aplicados. Columnas: Nro. Orden, Sucursal, Tipo, Cliente, Estado, Fechas, Moneda, Total USD, Total ARS.",
      },
      {
        title: "Exportar a CSV",
        body: "Mismo contenido que el XLS pero en formato CSV con separador punto y coma (;). Compatible con planillas de cálculo (LibreOffice, etc.) y herramientas como LibreOffice Calc. La codificación es UTF-8 con BOM para caracteres especiales.",
      },
    ],
  },
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
  {
    id: "roles",
    icon: Lock,
    title: "Roles y permisos",
    color: "text-red-600 dark:text-red-300",
    keywords: "rol administrador operador visor auditor permisos acceso configuración usuarios",
    steps: [
      {
        title: "Administrador",
        body: "Acceso total al sistema. Puede gestionar usuarios, acceder a Configuración y modificar cualquier registro. Es el único rol que ve el ítem 'Configuración' en la sidebar.",
      },
      {
        title: "Operador",
        body: "Puede crear, editar y gestionar órdenes, clientes y productos. No tiene acceso a la sección de Configuración ni a la gestión de usuarios.",
      },
      {
        title: "Visor / Auditor",
        body: "Solo lectura. Puede consultar toda la información del sistema, generar reportes y exportar datos, pero no puede crear ni modificar registros.",
        alert: { type: "info", text: "Para cambiar el rol de un usuario, contactar al administrador del sistema." },
      },
    ],
  },
];

// ─── Accordion ────────────────────────────────────────────────────────────────

function AccordionSection({ section, defaultOpen = false }: { section: Section; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = section.icon;

  return (
    <div className="zaire-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-subtle transition-colors"
      >
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", "bg-subtle-2")}>
          <Icon className={cn("w-5 h-5", section.color)} />
        </div>
        <span className="flex-1 font-semibold text-(--zaire-text) text-[15px]">{section.title}</span>
        <ChevronDown className={cn("w-4 h-4 text-(--zaire-text-muted) transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-(--zaire-border) px-6 pb-6 pt-4 space-y-5">
          {section.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-zaire-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-(--zaire-text) text-sm mb-1">{step.title}</p>
                <p className="text-sm text-(--zaire-text-muted) leading-relaxed">{step.body}</p>
                {step.alert && <AlertBox type={step.alert.type} text={step.alert.text} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AyudaPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.filter((s) => {
      const searchable = `${s.title} ${s.keywords} ${s.steps.map(st => `${st.title} ${st.body} ${st.alert?.text ?? ""}`).join(" ")}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Centro de Ayuda</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Guía de uso del sistema</p>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
        <Input
          placeholder="Buscar en la ayuda... (ej: PDF, semáforo, duplicar)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-10 bg-panel"
        />
      </div>

      {/* Tip rápido */}
      {!query && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          <span>
            Hacé clic en cualquier sección para expandirla. Usá la búsqueda para encontrar un tema específico.
            Términos útiles: <OTBadge /> <OTSBadge /> o palabras como «PDF», «semáforo», «estado», «exportar».
          </span>
        </div>
      )}

      {/* Secciones */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((section, i) => (
            <AccordionSection
              key={section.id}
              section={section}
              defaultOpen={!!query || i === 0}
            />
          ))
        ) : (
          <div className="zaire-card px-6 py-12 text-center">
            <Search className="w-8 h-8 text-(--zaire-text-muted) mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-(--zaire-text-muted)">
              No se encontraron resultados para &quot;{query}&quot;
            </p>
            <p className="text-xs text-(--zaire-text-muted) mt-1">
              Intentá con otras palabras clave
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
