"use client";
// sidebar.tsx — src/components/layout/sidebar.tsx — 2026-05-19
// Sidebar de navegación colapsable con branding de la suite Zaire (módulos Trace/Field)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  History,
  BarChart3,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LifeBuoy,
  MapPin,
  HardHat,
  Truck,
  Factory,
  Receipt,
  FileCheck,
  LayoutGrid,
  Database,
  Map as MapIcon,
  ChevronDown,
  Briefcase,
  UserPlus,
  Target,
  Contact,
  CalendarClock,
  Building2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { isModuleEnabled, type ModuleId } from "@/lib/modules";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

// Módulo Trace
const NAV_TRACE: NavItem[] = [
  { href: ROUTES.trace.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.trace.ordenes, label: "Órdenes de Trabajo", icon: ClipboardList },
  { href: ROUTES.productos, label: "Productos", icon: Package },
  { href: ROUTES.trace.reportes, label: "Reportes", icon: BarChart3 },
];

// Master data compartida de la suite (no pertenece a un módulo)
const NAV_GENERAL: NavItem[] = [
  { href: ROUTES.clientes, label: "Clientes", icon: Users },
  { href: ROUTES.historial, label: "Historial", icon: History },
  { href: ROUTES.configuracion, label: "Gestión", icon: Settings, adminOnly: true },
];

const NAV_CRM: NavItem[] = [
  { href: ROUTES.crm.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: ROUTES.crm.leads, label: "Leads", icon: UserPlus },
  { href: ROUTES.crm.pipeline, label: "Pipeline", icon: Target },
  { href: ROUTES.crm.cotizaciones, label: "Cotizaciones", icon: FileText },
  { href: ROUTES.crm.cuentas, label: "Cuentas", icon: Building2 },
  { href: ROUTES.crm.contactos, label: "Contactos", icon: Contact },
  { href: ROUTES.crm.actividades, label: "Actividades", icon: CalendarClock },
  { href: ROUTES.crm.reportes, label: "Reportes", icon: BarChart3 },
];

const NAV_FIELD: NavItem[] = [
  { href: ROUTES.field.home, label: "Panel Field", icon: LayoutDashboard },
  { href: ROUTES.field.visitas, label: "Visitas", icon: MapPin },
  { href: ROUTES.field.tecnicos, label: "Técnicos", icon: HardHat },
  { href: ROUTES.field.unidades, label: "Unidades", icon: Truck },
  { href: ROUTES.field.plantas, label: "Plantas", icon: Factory },
  { href: ROUTES.field.gastos, label: "Gastos", icon: Receipt },
  { href: ROUTES.field.documentos, label: "Documentos", icon: FileCheck },
  { href: ROUTES.field.reportes, label: "Reportes Field", icon: BarChart3 },
];

// Módulos "padre" colapsables. Sumar acá cuando haya nuevos módulos (ej. futuros).
interface NavModule {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}
const MODULES: NavModule[] = [
  { key: "trace", label: "Zaire Trace", icon: LayoutGrid, items: NAV_TRACE },
  { key: "field", label: "Zaire Field", icon: MapIcon, items: NAV_FIELD },
  { key: "crm", label: "Zaire CRM", icon: Briefcase, items: NAV_CRM },
  { key: "general", label: "Ajustes", icon: Database, items: NAV_GENERAL },
];

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  // Solo el módulo de la ruta actual arranca abierto (evita el scroll largo).
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const onField = pathname.startsWith(ROUTES.field.home);
    const onCrm = pathname.startsWith(ROUTES.crm.dashboard);
    const onGeneral = [ROUTES.clientes, ROUTES.historial, ROUTES.configuracion].some((r) => pathname.startsWith(r));
    return { trace: !onField && !onCrm && !onGeneral, field: onField, crm: onCrm, general: onGeneral };
  });

  // Grupos visibles según módulos habilitados (Administración/general siempre visible).
  const modules = MODULES.filter((m) => m.key === "general" || isModuleEnabled(m.key as ModuleId));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(ROUTES.login);
    router.refresh();
  }

  const isActive = (href: string) => {
    // Rutas "índice" con match exacto para no activarse en sus subrutas
    if (href === ROUTES.trace.dashboard || href === ROUTES.field.home || href === ROUTES.crm.dashboard) return pathname === href;
    return pathname.startsWith(href);
  };

  const renderItem = (item: NavItem) => (
    <li key={item.href}>
      <Link
        href={item.href}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[13.5px] font-medium transition-colors duration-140",
          isActive(item.href)
            ? "bg-linear-to-r from-zaire-blue/30 to-zaire-blue/15 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r-[3px] before:bg-zaire-light"
            : "text-[#B7C5E0] hover:text-white hover:bg-white/6",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="w-4.5 h-4.5 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-zaire-navy text-white transition-all duration-300 shrink-0 relative",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zaire-navy-mid">
        <Activity className="w-7 h-7 text-zaire-light shrink-0" />
        {!collapsed && (
          <div>
            <span className="font-bold text-lg tracking-tight">Zaire</span>
            <p className="text-[10px] text-zaire-light opacity-70 leading-tight">
              Suite Industrial
            </p>
          </div>
        )}
      </div>

      {/* Toggle collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-2.75 top-17.5 w-5.5 h-5.5 bg-white border border-(--zaire-border) rounded-[7px] flex items-center justify-center text-(--zaire-text-muted) hover:text-zaire-blue shadow-sm transition-colors duration-150 z-10"
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-none">
        {collapsed ? (
          // Colapsado: todos los ítems como iconos (sin agrupar)
          <ul className="space-y-0.5 px-3.5">
            {modules.flatMap((m) => m.items)
              .filter((item) => !item.adminOnly || profile?.role === "admin")
              .map((item) => renderItem(item))}
          </ul>
        ) : (
          modules.map((mod, i) => {
            const items = mod.items.filter((item) => !item.adminOnly || profile?.role === "admin");
            const open = expanded[mod.key];
            const moduleActive = items.some((it) => isActive(it.href));
            return (
              <div key={mod.key}>
                {i > 0 && <div className="h-px bg-white/[0.07] mx-3 my-2" />}
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [mod.key]: !e[mod.key] }))}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-4 py-2 text-[11px] font-semibold tracking-widest uppercase transition-colors",
                    moduleActive ? "text-zaire-light" : "text-[#5C719B] hover:text-[#8ea3cf]"
                  )}
                >
                  <mod.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{mod.label}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", open && "rotate-180")} />
                </button>
                {open && <ul className="space-y-0.5 px-3.5 pb-1">{items.map((item) => renderItem(item))}</ul>}
              </div>
            );
          })
        )}
      </nav>

      {/* Soporte (Ayuda) */}
      <div className="px-3.5 border-t border-white/[0.07] pt-2 pb-1">
        {!collapsed && (
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#5C719B] px-3 pt-1 pb-1.5">Soporte</div>
        )}
        <Link
          href={ROUTES.ayuda}
          className={cn(
            "relative flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[13.5px] font-medium transition-colors duration-140",
            isActive(ROUTES.ayuda)
              ? "bg-linear-to-r from-zaire-blue/30 to-zaire-blue/15 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r-[3px] before:bg-zaire-light"
              : "text-[#B7C5E0] hover:text-white hover:bg-white/6",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Ayuda" : undefined}
        >
          <LifeBuoy className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span className="truncate">Ayuda</span>}
        </Link>
      </div>

      {/* User footer */}
      <div className="border-t border-white/[0.07] p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zaire-blue flex items-center justify-center text-xs font-bold shrink-0">
              {profile?.full_name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? "Usuario"}</p>
              <p className="text-[11px] text-white/50 capitalize">{profile?.role ?? ""}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/50 hover:text-white transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center text-white/50 hover:text-white transition-colors py-1"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
