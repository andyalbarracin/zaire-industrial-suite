"use client";
// sidebar.tsx — src/components/layout/sidebar.tsx — 2026-05-19
// Sidebar de navegación colapsable con branding Zaire Trace

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
  Map as MapIcon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ordenes", label: "Órdenes de Trabajo", icon: ClipboardList },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/productos", label: "Productos", icon: Package },
];

const NAV_GESTION: NavItem[] = [
  { href: "/historial", label: "Historial", icon: History },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
];

const NAV_FIELD: NavItem[] = [
  { href: "/field", label: "Panel Field", icon: LayoutDashboard },
  { href: "/field/visitas", label: "Visitas", icon: MapPin },
  { href: "/field/tecnicos", label: "Técnicos", icon: HardHat },
  { href: "/field/unidades", label: "Unidades", icon: Truck },
  { href: "/field/plantas", label: "Plantas", icon: Factory },
  { href: "/field/gastos", label: "Gastos", icon: Receipt },
  { href: "/field/documentos", label: "Documentos", icon: FileCheck },
  { href: "/field/reportes", label: "Reportes Field", icon: BarChart3 },
];

// Módulos "padre" colapsables. Sumar acá cuando haya nuevos módulos (ej. futuros).
interface NavModule {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}
const MODULES: NavModule[] = [
  { key: "tracking", label: "Zaire Tracking", icon: LayoutGrid, items: [...NAV_MAIN, ...NAV_GESTION] },
  { key: "field", label: "Zaire Field", icon: MapIcon, items: NAV_FIELD },
];

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  // Solo el módulo de la ruta actual arranca abierto (evita el scroll largo).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    tracking: !pathname.startsWith("/field"),
    field: pathname.startsWith("/field"),
  });

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => {
    // Rutas "índice" con match exacto para no activarse en sus subrutas
    if (href === "/" || href === "/field") return pathname === href;
    return pathname.startsWith(href);
  };

  const renderItem = (item: NavItem) => (
    <li key={item.href}>
      <Link
        href={item.href}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[13.5px] font-medium transition-colors duration-140",
          isActive(item.href)
            ? "bg-linear-to-r from-sas-blue/30 to-sas-blue/15 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r-[3px] before:bg-sas-light"
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
        "flex flex-col h-screen bg-sas-navy text-white transition-all duration-300 shrink-0 relative",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sas-navy-mid">
        <Activity className="w-7 h-7 text-sas-light shrink-0" />
        {!collapsed && (
          <div>
            <span className="font-bold text-lg tracking-tight">Zaire Trace</span>
            <p className="text-[10px] text-sas-light opacity-70 leading-tight">
              Sistema de Trazabilidad
            </p>
          </div>
        )}
      </div>

      {/* Toggle collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-2.75 top-17.5 w-5.5 h-5.5 bg-white border border-(--sas-border) rounded-[7px] flex items-center justify-center text-(--sas-text-muted) hover:text-sas-blue shadow-sm transition-colors duration-150 z-10"
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
            {MODULES.flatMap((m) => m.items)
              .filter((item) => !item.adminOnly || profile?.role === "admin")
              .map((item) => renderItem(item))}
          </ul>
        ) : (
          MODULES.map((mod, i) => {
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
                    moduleActive ? "text-sas-light" : "text-[#5C719B] hover:text-[#8ea3cf]"
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
          href="/ayuda"
          className={cn(
            "relative flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[13.5px] font-medium transition-colors duration-140",
            isActive("/ayuda")
              ? "bg-linear-to-r from-sas-blue/30 to-sas-blue/15 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-r-[3px] before:bg-sas-light"
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
            <div className="w-8 h-8 rounded-full bg-sas-blue flex items-center justify-center text-xs font-bold shrink-0">
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
