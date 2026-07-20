// routes.ts — src/lib/routes.ts — 2026-07-16
// Rutas centralizadas de la suite Zaire. Único lugar donde viven los paths de la app.
// Cambiar el prefijo de un módulo acá se propaga a toda la navegación (sidebar, links, redirects).
// Nota: las rutas de /api/** NO viven acá (son endpoints, no navegación).

export const ROUTES = {
  home: "/",

  // Módulo Trace — trazabilidad de órdenes de trabajo (OT/OTS). Vive bajo /trace.
  trace: {
    dashboard: "/trace",
    ordenes: "/trace/ordenes",
    ordenNueva: "/trace/ordenes/nueva",
    orden: (id: string) => `/trace/ordenes/${id}`,
    ordenEditar: (id: string) => `/trace/ordenes/${id}/editar`,
    reportes: "/trace/reportes",
    // Detalle de una solicitud de OT que llegó desde Field (contextual: se entra desde bell/dashboard).
    solicitud: (id: string) => `/trace/solicitudes/${id}`,
  },

  // Módulo Field — gestión de servicio en campo
  field: {
    home: "/field",
    visitas: "/field/visitas",
    visitaNueva: "/field/visitas/nueva",
    visita: (id: string) => `/field/visitas/${id}`,
    visitaEditar: (id: string) => `/field/visitas/${id}/editar`,
    tecnicos: "/field/tecnicos",
    tecnicoNuevo: "/field/tecnicos/nuevo",
    tecnico: (id: string) => `/field/tecnicos/${id}`,
    tecnicoEditar: (id: string) => `/field/tecnicos/${id}/editar`,
    unidades: "/field/unidades",
    unidad: (id: string) => `/field/unidades/${id}`,
    plantas: "/field/plantas",
    planta: (id: string) => `/field/plantas/${id}`,
    gastos: "/field/gastos",
    gasto: (id: string) => `/field/gastos/${id}`,
    documentos: "/field/documentos",
    reportes: "/field/reportes",
  },

  // Módulo CRM — gestión comercial (leads, pipeline, contactos, actividades)
  crm: {
    dashboard: "/crm",
    leads: "/crm/leads",
    lead: (id: string) => `/crm/leads/${id}`,
    pipeline: "/crm/pipeline",
    oportunidad: (id: string) => `/crm/pipeline/${id}`,
    cotizaciones: "/crm/cotizaciones",
    cotizacionNueva: "/crm/cotizaciones/nueva",
    cotizacion: (id: string) => `/crm/cotizaciones/${id}`,
    cotizacionEditar: (id: string) => `/crm/cotizaciones/${id}/editar`,
    cuentas: "/crm/cuentas",
    cuenta: (id: string) => `/crm/cuentas/${id}`,
    contactos: "/crm/contactos",
    contacto: (id: string) => `/crm/contactos/${id}`,
    actividades: "/crm/actividades",
    reportes: "/crm/reportes",
  },

  // Módulo Stock — inventario/WMS (depósitos, existencias, movimientos, series, reservas)
  stock: {
    dashboard: "/stock",
    existencias: "/stock/existencias",
    producto: (id: string) => `/stock/existencias/${id}`,   // kardex del producto
    movimientos: "/stock/movimientos",
    movimientoNuevo: "/stock/movimientos/nuevo",
    depositos: "/stock/depositos",
    deposito: (id: string) => `/stock/depositos/${id}`,
    series: "/stock/series",
    reservas: "/stock/reservas",
    reportes: "/stock/reportes",
  },

  // Master data compartida — vive en la raíz de la suite (no dentro de un módulo)
  clientes: "/clientes",
  cliente: (id: string) => `/clientes/${id}`,
  productos: "/productos",
  historial: "/historial",
  configuracion: "/configuracion",
  preferencias: "/preferencias",
  ayuda: "/ayuda",
  buscar: "/buscar",

  // Páginas públicas (auth)
  login: "/login",
  terminos: "/terminos",
};

// Etiquetas de breadcrumbs por segmento de ruta (segmento → label legible).
// Los segmentos sin entrada usan el segmento crudo; los UUID se muestran como "Detalle".
export const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  trace: "Zaire Trace",
  ordenes: "Órdenes de Trabajo",
  nueva: "Nueva Orden",
  reportes: "Reportes",
  clientes: "Clientes",
  productos: "Productos",
  historial: "Historial",
  configuracion: "Gestión",
  preferencias: "Preferencias",
  // Field (los segmentos sin acento salen bien por el fallback que capitaliza)
  field: "Zaire Field",
  tecnicos: "Técnicos",
  // CRM
  crm: "Zaire CRM",
  leads: "Leads",
  pipeline: "Pipeline",
  cotizaciones: "Cotizaciones",
  cuentas: "Cuentas",
  contactos: "Contactos",
  actividades: "Actividades",
  // Stock
  stock: "Zaire Stock",
  existencias: "Existencias",
  movimientos: "Movimientos",
  depositos: "Depósitos",
  series: "Series",
  reservas: "Reservas",
};
