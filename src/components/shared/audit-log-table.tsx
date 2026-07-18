"use client";
// audit-log-table.tsx — src/components/shared/audit-log-table.tsx — 2026-05-19
// Tabla de auditoría con filtros, búsqueda y expansión de datos JSON

import { Fragment, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { AuditLog, AuditAction } from "@/lib/types/database";

const ACTION_COLORS: Record<AuditAction, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  status_change: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

const ENTITY_LABELS: Record<string, string> = {
  work_order: "Orden de Trabajo",
  client: "Cliente",
  product: "Producto",
  work_order_item: "Ítem",
};

interface AuditLogTableProps {
  logs: AuditLog[];
}

const ENTITY_ROUTES: Record<string, string | null> = {
  work_order: ROUTES.trace.ordenes,
  client: ROUTES.clientes,
  product: ROUTES.productos,
  work_order_item: null,
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (log.description ?? "").toLowerCase().includes(q) ||
          (log.user_name ?? "").toLowerCase().includes(q) ||
          log.entity_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, entityFilter, actionFilter]);

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="zaire-card">
      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-(--zaire-border) flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
          <Input placeholder="Buscar en historial..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-44"><SelectValue>{entityFilter === "all" ? "Todas las entidades" : ENTITY_LABELS[entityFilter] ?? entityFilter}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
          <SelectTrigger className="h-9 w-44"><SelectValue>{actionFilter === "all" ? "Todas las acciones" : AUDIT_ACTION_LABELS[actionFilter as AuditAction] ?? actionFilter}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {Object.entries(AUDIT_ACTION_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-(--zaire-text-muted)">{filtered.length} registros</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle border-b border-(--zaire-border)">
            <tr>
              {["Fecha y hora", "Usuario", "Acción", "Entidad", "Descripción", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-(--zaire-text-muted) uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--zaire-border)">
            {filtered.map((log) => {
              const hasData = log.old_data || log.new_data;
              const expanded = expandedRows.has(log.id);
              const navRoute = ENTITY_ROUTES[log.entity_type];
              const isNavigable = navRoute !== null && navRoute !== undefined && !!log.entity_id;
              return (
                <Fragment key={log.id}>
                  <tr
                    onClick={() => {
                      if (isNavigable) router.push(`${navRoute}/${log.entity_id}`);
                    }}
                    className={cn(
                      "hover:bg-subtle transition-colors",
                      isNavigable && "cursor-pointer"
                    )}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-(--zaire-text-muted) text-xs">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm">{log.user_name ?? "Sistema"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", ACTION_COLORS[log.action])}>
                        {AUDIT_ACTION_LABELS[log.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-(--zaire-text-muted)">
                      {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                    </td>
                    <td className="px-4 py-3 max-w-sm truncate">{log.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isNavigable && (
                          <ArrowRight className="w-3.5 h-3.5 text-(--zaire-text-muted)" />
                        )}
                        {hasData && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleRow(log.id); }}
                            className="text-(--zaire-text-muted) hover:text-(--zaire-text)"
                          >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-subtle">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                          {log.old_data && (
                            <div>
                              <p className="text-xs font-semibold text-(--zaire-text-muted) mb-1 uppercase">Datos anteriores</p>
                              <pre className="text-xs bg-red-50 dark:bg-red-500/15 border border-red-100 dark:border-red-500/25 rounded p-2 overflow-x-auto max-h-32">
                                {JSON.stringify(log.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_data && (
                            <div>
                              <p className="text-xs font-semibold text-(--zaire-text-muted) mb-1 uppercase">Datos nuevos</p>
                              <pre className="text-xs bg-green-50 dark:bg-green-500/15 border border-green-100 dark:border-green-500/25 rounded p-2 overflow-x-auto max-h-32">
                                {JSON.stringify(log.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-(--zaire-text-muted)">
                  Sin registros de auditoría
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
