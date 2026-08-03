// trace.ts — src/app/(dashboard)/ayuda/content/trace.ts — 2026-08-03
// Contenido de Ayuda del módulo Zaire Trace (núcleo + master data). Se muestra si trace está activo.
import { Rocket, ClipboardList, Users, Package, Search, BarChart3, Shield, Printer, Lock } from "lucide-react";
import type { Section } from "./types";

export const traceSections: Section[] = [

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
