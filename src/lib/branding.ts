// branding.ts — src/lib/branding.ts — 2026-05-27
// Configuración centralizada de branding / identidad visual de la suite Zaire

export const BRANDING = {
  companyName: "Empresa Demo S.A.",

  // Suite y sus módulos
  suiteName: "Zaire",
  suiteSubtitle: "Suite Industrial",
  modules: {
    trace: "Zaire Trace",
    field: "Zaire Field",
    crm: "Zaire CRM",
  },

  // Alias de compatibilidad: los templates de PDF usan systemName en el pie
  // de los documentos de Trace (OT/OTS, reparación, reportes). Mantener "Zaire Trace".
  systemName: "Zaire Trace",
  subtitle: "Sistema de Trazabilidad",

  logo: "/branding/logo.png",
  logoWhite: "/branding/logo-white.png",
  logoIcon: "/branding/logo-icon.png",
  loginBackground: "/branding/login-background.png",
  favicon: "/branding/favicon.ico",
} as const;
