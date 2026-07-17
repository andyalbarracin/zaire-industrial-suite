"use client";
// header.tsx — src/components/layout/header.tsx
// Header superior con breadcrumb, search funcional y bell de notificaciones

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, Search, Bell, AlertCircle, Clock, FileCheck, GitBranchPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES, ROUTE_LABELS } from "@/lib/routes";
import type { Notification } from "@/app/(dashboard)/layout";

// Hint de atajo (⌘K vs Ctrl K) según el SO. Se resuelve en el cliente sin setState-en-effect:
// useSyncExternalStore es SSR-safe (null en server, valor real en cliente, sin mismatch de hidratación).
const subscribeShortcut = () => () => {};
const getShortcutHint = (): string | null => (/Mac|iPhone|iPod|iPad/i.test(navigator.userAgent) ? "⌘K" : "Ctrl K");
const getServerShortcutHint = (): string | null => null;
function useShortcutHint() {
  return useSyncExternalStore(subscribeShortcut, getShortcutHint, getServerShortcutHint);
}

function getDaysUntilDue(dateStr: string): number {
  // Parseo a medianoche LOCAL para evitar el corrimiento de un día por timezone (UTC).
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const due = y && m && d ? new Date(y, m - 1, d) : new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dueLabelShort(days: number): string {
  if (days < 0) return `Vencida hace ${Math.abs(days)}d`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days}d`;
}

interface HeaderProps {
  notifications: Notification[];
}

export function Header({ notifications }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const shortcutHint = useShortcutHint();
  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const isUUID = /^[0-9a-f-]{36}$/i.test(seg);
    // Segmento sin label explícito → capitalizamos la primera letra (cubre módulos futuros).
    const fallback = seg.charAt(0).toUpperCase() + seg.slice(1);
    const label = isUUID ? "Detalle" : (ROUTE_LABELS[seg] ?? fallback);
    return { href, label, isLast: i === segments.length - 1 };
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      router.push(`${ROUTES.buscar}?q=${encodeURIComponent(q)}`);
      setSearch("");
    }
  }

  const overdueCount = notifications.filter(n => n.kind !== "field_ot_request" && getDaysUntilDue(n.date_due) < 0).length;
  const hasNotifications = notifications.length > 0;

  return (
    <header className="h-15 shrink-0 sticky top-0 z-20 bg-white/90 backdrop-blur-sm backdrop-saturate-150 border-b border-(--zaire-border) px-6 flex items-center gap-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        <Link href={ROUTES.trace.dashboard} className="text-(--zaire-text-muted) hover:text-zaire-navy transition-colors">
          Inicio
        </Link>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-(--zaire-text-muted)" />
            {crumb.isLast ? (
              <span className="font-medium text-(--zaire-text)">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-(--zaire-text-muted) hover:text-zaire-navy transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 w-72 max-w-[34vw] bg-zaire-bg border border-(--zaire-border) rounded-[9px] px-3 py-2 text-(--zaire-text-muted) text-sm transition-colors duration-150 focus-within:border-[#6E82CC] focus-within:shadow-[0_0_0_3px_rgba(87,108,188,0.12)] hover:border-slate-300"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar órdenes, clientes..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-(--zaire-text) placeholder:text-(--zaire-text-muted) min-w-0"
        />
        {shortcutHint && (
          <button
            type="submit"
            className="text-[10px] bg-white border border-(--zaire-border) rounded px-1.5 py-0.5 text-(--zaire-text-muted) font-sans shrink-0 hover:bg-slate-100 hover:text-(--zaire-text) transition-colors cursor-pointer"
            title="Buscar"
          >
            {shortcutHint}
          </button>
        )}
      </form>

      {/* Bell */}
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setIsNotifOpen((o) => !o)}
          className={cn(
            "relative w-9 h-9 rounded-[9px] border grid place-items-center transition-colors duration-140",
            isNotifOpen
              ? "bg-slate-100 border-(--zaire-border) text-(--zaire-text)"
              : "border-transparent hover:bg-slate-100 hover:border-(--zaire-border) text-(--zaire-text-muted) hover:text-(--zaire-text)"
          )}
          title="Notificaciones"
        >
          <Bell className="w-4.5 h-4.5" />
          {hasNotifications && (
            <span className={cn(
              "absolute top-1.5 right-1.5 min-w-1.75 h-1.75 rounded-full border border-white",
              overdueCount > 0 ? "bg-red-500" : "bg-amber-400"
            )} />
          )}
        </button>

        {isNotifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-(--zaire-border) rounded-[14px] shadow-[0_12px_32px_-8px_rgba(15,23,42,0.22),0_2px_8px_rgba(15,23,42,0.08)] z-50 overflow-hidden animate-z-pop">
            {/* Header dropdown */}
            <div className="px-4 py-3 border-b border-(--zaire-border) flex items-center justify-between">
              <span className="text-sm font-semibold text-(--zaire-text)">Notificaciones</span>
              {hasNotifications && (
                <span className="text-xs bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-full border border-red-100">
                  {notifications.length} pendiente{notifications.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-(--zaire-text-muted) text-sm">
                  Sin notificaciones pendientes
                </div>
              ) : (
                notifications.map((n) => {
                  const isRequest = n.kind === "field_ot_request";
                  const days = getDaysUntilDue(n.date_due);
                  const isOverdue = !isRequest && days < 0;
                  const isUrgent = !isRequest && days >= 0 && days <= 2;
                  const isField = n.kind === "field_doc";
                  const isCrm = n.kind === "crm_task" || n.kind === "crm_close";
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => setIsNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 border-b border-(--zaire-border) last:border-0 hover:bg-slate-50 transition-colors duration-100"
                    >
                      <div className={cn(
                        "mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                        isRequest ? "bg-violet-50" : isOverdue ? "bg-red-50" : isUrgent ? "bg-amber-50" : "bg-slate-50"
                      )}>
                        {isRequest
                          ? <GitBranchPlus className="w-3.5 h-3.5 text-violet-600" />
                          : isField
                            ? <FileCheck className={cn("w-3.5 h-3.5", isOverdue ? "text-red-500" : "text-amber-500")} />
                            : isOverdue
                              ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              : <Clock className="w-3.5 h-3.5 text-amber-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium text-(--zaire-text)", !isField && !isRequest && !isCrm && "font-mono")}>
                          {n.title}
                          {(isField || isRequest) && <span className="ml-1.5 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded px-1 py-0.5">FIELD</span>}
                          {isCrm && <span className="ml-1.5 text-[10px] font-semibold text-zaire-blue bg-blue-50 border border-blue-100 rounded px-1 py-0.5">CRM</span>}
                        </p>
                        <p className="text-xs text-(--zaire-text-muted) truncate">{n.subtitle}</p>
                      </div>
                      <span className={cn(
                        "text-xs font-semibold shrink-0 mt-0.5",
                        isRequest ? "text-violet-600" : isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-slate-500"
                      )}>
                        {isRequest ? "Solicitud" : dueLabelShort(days)}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {hasNotifications && (
              <div className="px-4 py-2.5 border-t border-(--zaire-border)">
                <Link
                  href={ROUTES.trace.ordenes}
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs text-zaire-blue font-medium hover:underline"
                >
                  Ver todas las órdenes →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
