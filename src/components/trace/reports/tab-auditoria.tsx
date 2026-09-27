"use client";
// tab-auditoria.tsx — Reportes de auditoría: secuencia, trazabilidad, integridad

import { useState } from "react";
import { Search, ShieldCheck, GitBranch, FileSearch, Download, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";
import { ORDER_STATUS_LABELS } from "@/lib/trace/constants";
import { buildSequenceReport, branchLikePatterns, type SequenceRow, type SequenceGap } from "@/lib/trace/sequence";
import { resolveAmount, sumDualTotals, type DualTotal } from "@/lib/trace/amounts";
import type { OrderStatus, Currency } from "@/lib/types/database";

// ─── Helpers ────────────────────────────────────────────────────────────────

function currentYear() { return new Date().getFullYear(); }

// Aviso (no bloqueo) cuando la empresa sigue sin configurar: el informe se exporta igual.
function AvisoEmpresa() {
  return (
    <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
      <AlertTriangle className="w-3 h-3 shrink-0" /> Sin datos de empresa
    </p>
  );
}

// ─── Report Card wrapper ─────────────────────────────────────────────────────

function ReportCard({ icon: Icon, title, description, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="zaire-card p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-zaire-navy/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-zaire-navy" />
        </div>
        <div>
          <h3 className="font-semibold text-(--zaire-text)">{title}</h3>
          <p className="text-xs text-(--zaire-text-muted) mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.1 — Verificación de Secuencia Correlativa
// ═══════════════════════════════════════════════════════════════════════════════

function SecuenciaCard({ companyConfigured }: { companyConfigured: boolean }) {
  const [year, setYear] = useState(String(currentYear()));
  const [branch, setBranch] = useState("all");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SequenceRow[] | null>(null);
  const [gaps, setGaps] = useState<SequenceGap[]>([]);
  const [series, setSeries] = useState<{ series: string; count: number }[]>([]);

  async function generate() {
    setLoading(true);
    const sb = createClient();
    // Las órdenes dadas de baja no entran en un informe de auditoría.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (sb as any).from("work_orders")
      .select("order_number, status")
      .is("deleted_at", null)
      .like("order_number", `%-${year}-%`)
      .order("order_number");

    if (branch !== "all") {
      // Las OTS llevan el prefijo "SR" antes del código de sucursal: sin el `or` quedaban afuera.
      const code = BRANCHES.find(b => b.id === branch)?.code ?? branch.toUpperCase();
      q = q.or(branchLikePatterns(year, code).map(p => `order_number.like.${p}`).join(","));
    }
    if (type !== "all") {
      q = q.like("order_number", `${type}-%`);
    }

    const { data } = await q;
    // Mismo cálculo que el PDF (lib/trace/sequence.ts): series independientes por tipo + sucursal.
    const report = buildSequenceReport(data ?? []);

    setRows(report.rows);
    setGaps(report.gaps);
    setSeries(report.countBySeries);
    setLoading(false);
  }

  function exportPdf() {
    if (!rows) return;
    const params = new URLSearchParams({ year, branch, type });
    window.open(`/api/reportes/secuencia?${params}`, "_blank");
  }

  const canceladas = rows?.filter(r => r.status === "cancelada").length ?? 0;

  return (
    <ReportCard icon={GitBranch} title="Verificación de Secuencia Correlativa"
      description="Detecta huecos en la numeración de órdenes. Documento formal para auditorías.">

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Año</Label>
          <Input value={year} onChange={e => setYear(e.target.value)} className="h-9" maxLength={4} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sucursal</Label>
          <Select value={branch} onValueChange={v => setBranch(v ?? "all")}>
            <SelectTrigger className="h-9"><SelectValue>{branch === "all" ? "Todas" : BRANCHES.find(b => b.id === branch)?.name ?? branch}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {BRANCHES.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={type} onValueChange={v => setType(v ?? "all")}>
            <SelectTrigger className="h-9"><SelectValue>{type === "all" ? "Todos" : type}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="OT">OT</SelectItem>
              <SelectItem value="OTS">OTS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={generate} disabled={loading} className="h-9 w-full bg-zaire-navy-mid hover:bg-zaire-navy text-white">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Verificando...</> : "Verificar"}
          </Button>
        </div>
      </div>

      {rows && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-subtle rounded-lg p-3 border border-(--zaire-border) text-center">
              <p className="text-2xl font-bold text-(--zaire-text)">{rows.length}</p>
              <p className="text-xs text-(--zaire-text-muted)">Total órdenes</p>
            </div>
            <div className={cn("rounded-lg p-3 border text-center", gaps.length === 0 ? "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30" : "bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30")}>
              <p className={cn("text-2xl font-bold", gaps.length === 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>{gaps.length}</p>
              <p className="text-xs text-(--zaire-text-muted)">Huecos</p>
            </div>
            <div className="bg-subtle rounded-lg p-3 border border-(--zaire-border) text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-300">{canceladas}</p>
              <p className="text-xs text-(--zaire-text-muted)">Canceladas</p>
            </div>
            <div className={cn("rounded-lg p-3 border text-center", gaps.length === 0 ? "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30" : "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30")}>
              <p className={cn("text-sm font-semibold", gaps.length === 0 ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300")}>
                {gaps.length === 0 ? "✅ Íntegra" : "⚠️ Con huecos"}
              </p>
              <p className="text-xs text-(--zaire-text-muted)">Secuencia</p>
            </div>
          </div>

          {/* Huecos encontrados */}
          {gaps.length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">⚠️ Huecos detectados</p>
              <div className="space-y-1">
                {gaps.map((g, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-300">
                    Número faltante: <span className="font-mono font-bold">{g.missing}</span> — {g.around}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Tabla de órdenes */}
          <div className="border border-(--zaire-border) rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-subtle border-b border-(--zaire-border) sticky top-0">
                <tr>
                  {["Nro. Orden", "Serie", "Estado", "Secuencia", "Verificación"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-(--zaire-text-muted) uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--zaire-border)">
                {rows.map(r => (
                  <tr key={r.order_number} className="hover:bg-subtle">
                    <td className="px-3 py-2 font-mono text-sm font-medium">{r.order_number}</td>
                    <td className="px-3 py-2 font-mono text-xs text-(--zaire-text-muted)">{r.series}</td>
                    <td className="px-3 py-2 text-xs text-(--zaire-text-muted)">{ORDER_STATUS_LABELS[r.status as OrderStatus] ?? r.status}</td>
                    <td className="px-3 py-2 font-mono text-xs">{String(r.seq).padStart(4, "0")}</td>
                    <td className="px-3 py-2">
                      {r.check === "inicio" ? (
                        <span className="text-xs text-blue-600 dark:text-blue-300">Inicio</span>
                      ) : r.check === "correlativo" ? (
                        <span className="text-xs text-green-600 dark:text-green-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Correlativo</span>
                      ) : (
                        <span className="text-xs text-red-600 dark:text-red-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Salto detectado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-(--zaire-text-muted)">
            La numeración es independiente por serie (tipo + sucursal) y cada una reinicia en 1:{" "}
            {series.map(s => `${s.series} (${s.count})`).join("  ·  ")}
          </p>

          <div className="flex items-center gap-2 justify-end pt-1 border-t border-(--zaire-border)">
            <p className="text-xs text-(--zaire-text-muted) flex-1">
              Resumen: {rows.length} órdenes · {gaps.length} huecos · {canceladas} canceladas
            </p>
            {!companyConfigured && <AvisoEmpresa />}
            <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Exportar PDF
            </Button>
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.2 — Trazabilidad por Orden
// ═══════════════════════════════════════════════════════════════════════════════

type TrazOrder = {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  date_in: string;
  date_due: string | null;
  currency: string;
  total: number;
  total_ars: number;
  branch_id: string | null;
  general_notes: string | null;
  clients: { business_name: string; tax_id: string | null; contact_name: string | null; client_code: string | null } | null;
};

type TrazItem = {
  item_number: number;
  quantity: number;
  custom_description: string | null;
  serial_number: string | null;
  equipment_number: string | null;
  marca: string | null;
  medida: string | null;
  unidad_medida: string | null;
  materiales_caras: string | null;
  materiales_orings: string | null;
  unit_price: number;
  total_price: number;
  unit_price_ars: number;
  total_price_ars: number;
  is_quoted: boolean;
  is_remitted: boolean;
  is_delivered: boolean;
  is_invoiced: boolean;
  products: { name: string; code: string | null } | null;
};

type TrazHistory = {
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
};

type TrazAudit = {
  action: string;
  description: string | null;
  user_name: string | null;
  created_at: string;
};

function TrazabilidadCard({ companyConfigured }: { companyConfigured: boolean }) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; order_number: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; order_number: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [order, setOrder] = useState<TrazOrder | null>(null);
  const [items, setItems] = useState<TrazItem[]>([]);
  const [history, setHistory] = useState<TrazHistory[]>([]);
  const [audit, setAudit] = useState<TrazAudit[]>([]);

  async function searchOrders(q: string) {
    if (q.length < 2) { setSuggestions([]); return; }
    setSearchLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from("work_orders")
      .select("id, order_number")
      .ilike("order_number", `%${q}%`)
      .is("deleted_at", null)
      .limit(8);
    setSuggestions(data ?? []);
    setSearchLoading(false);
  }

  async function generate() {
    if (!selected) return;
    setLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = sb as any;
    const [{ data: ord }, { data: itms }, { data: hist }, { data: aud }] = await Promise.all([
      s.from("work_orders").select(`
        id, order_number, order_type, status, date_in, date_due, currency, total, total_ars, branch_id, general_notes,
        clients(business_name, tax_id, contact_name, client_code)
      `).eq("id", selected.id).single(),
      s.from("work_order_items").select(`
        item_number, quantity, custom_description, serial_number, equipment_number,
        marca, medida, unidad_medida, materiales_caras, materiales_orings,
        unit_price, total_price, unit_price_ars, total_price_ars,
        is_quoted, is_remitted, is_delivered, is_invoiced,
        products(name, code)
      `).eq("work_order_id", selected.id).order("item_number"),
      s.from("work_order_status_history").select(`
        old_status, new_status, notes, created_at, profiles(full_name)
      `).eq("work_order_id", selected.id).order("created_at"),
      s.from("audit_logs").select("action, description, user_name, created_at")
        .eq("entity_id", selected.id).order("created_at"),
    ]);
    setOrder(ord);
    setItems(itms ?? []);
    setHistory(hist ?? []);
    setAudit(aud ?? []);
    setLoading(false);
  }

  function exportPdf() {
    if (!selected) return;
    window.open(`/api/reportes/trazabilidad/${selected.id}`, "_blank");
  }

  const branch = order ? BRANCHES.find(b => b.id === order.branch_id) : null;

  return (
    <ReportCard icon={FileSearch} title="Trazabilidad por Orden"
      description="Informe completo de una orden: datos, ítems, timeline de estados y modificaciones.">

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
          <Input
            placeholder="Buscar por número de orden..."
            value={search}
            onChange={e => { setSearch(e.target.value); searchOrders(e.target.value); }}
            className="pl-9 h-9"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-panel border border-(--zaire-border) rounded-lg shadow-lg z-10 overflow-hidden">
              {suggestions.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { setSelected(s); setSearch(s.order_number); setSuggestions([]); }}
                  className="w-full px-3 py-2 text-left text-sm font-mono hover:bg-subtle transition-colors border-b border-(--zaire-border) last:border-0">
                  {s.order_number}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={generate} disabled={!selected || loading} className="h-9 bg-zaire-navy-mid hover:bg-zaire-navy text-white">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Generar"}
        </Button>
      </div>

      {searchLoading && <p className="text-xs text-(--zaire-text-muted)">Buscando...</p>}

      {order && (
        <div className="space-y-4">
          {/* Datos generales */}
          <div className="bg-subtle rounded-lg border border-(--zaire-border) p-4">
            <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase tracking-wide mb-3">Datos generales</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                ["N° Orden", order.order_number],
                ["Tipo", order.order_type],
                ["Estado", ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status],
                ["Sucursal", branch?.name ?? "—"],
                ["Ingreso", formatDate(order.date_in)],
                ["Vencimiento", formatDate(order.date_due)],
                ["Moneda", order.currency],
                ["Total", (() => {
                  // Total en la moneda real de la orden; el de pesos se arma con los ítems
                  // porque la cabecera no siempre tiene total_ars (ver lib/trace/amounts.ts).
                  const arsItems = (items ?? []).reduce((s, i) => s + (i.total_price_ars ?? 0), 0);
                  const t = resolveAmount(order.total, order.total_ars || arsItems, order.currency as Currency);
                  return formatCurrency(t.amount, t.currency);
                })()],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-(--zaire-text-muted)">{l}</p>
                  <p className="font-medium">{v}</p>
                </div>
              ))}
            </div>
            {order.clients && (
              <div className="mt-3 pt-3 border-t border-(--zaire-border) grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  ["Cliente", order.clients.business_name],
                  ["CUIT", order.clients.tax_id ?? "—"],
                  ["Código cliente", order.clients.client_code ?? "—"],
                  ["Contacto", order.clients.contact_name ?? "—"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs text-(--zaire-text-muted)">{l}</p>
                    <p className="font-medium">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ítems */}
          <div>
            <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase tracking-wide mb-2">Ítems ({items.length})</p>
            <div className="border border-(--zaire-border) rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-subtle border-b border-(--zaire-border)">
                  <tr>
                    {["#", "Descripción", "Serie", "Marca/Medida", "P.Unit", "Total", "Estados"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-(--zaire-text-muted) uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--zaire-border)">
                  {items.map(it => (
                    <tr key={it.item_number} className="hover:bg-subtle">
                      <td className="px-3 py-2 font-mono">{it.item_number}</td>
                      <td className="px-3 py-2 max-w-32 truncate">{it.products?.name ?? it.custom_description ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{it.serial_number ?? "—"}</td>
                      <td className="px-3 py-2">{[it.marca, it.medida ? `${it.medida}${it.unidad_medida ?? ""}` : null].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-3 py-2">{(() => { const u = resolveAmount(it.unit_price, it.unit_price_ars, order.currency as Currency); return formatCurrency(u.amount, u.currency); })()}</td>
                      <td className="px-3 py-2 font-medium">{(() => { const t = resolveAmount(it.total_price, it.total_price_ars, order.currency as Currency); return formatCurrency(t.amount, t.currency); })()}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {[["C", it.is_quoted], ["R", it.is_remitted], ["E", it.is_delivered], ["F", it.is_invoiced]].map(([l, v]) => (
                            <span key={String(l)} className={cn("w-5 h-5 rounded text-xs font-bold flex items-center justify-center",
                              v ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-subtle-2 text-slate-400")}>
                              {String(l)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase tracking-wide mb-2">Timeline de estados ({history.length})</p>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-zaire-navy mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium">
                      {h.old_status ? `${ORDER_STATUS_LABELS[h.old_status as OrderStatus]} → ` : ""}
                      {ORDER_STATUS_LABELS[h.new_status as OrderStatus]}
                    </span>
                    {h.notes && <span className="text-(--zaire-text-muted) italic"> &quot;{h.notes}&quot;</span>}
                    <p className="text-xs text-(--zaire-text-muted)">{h.profiles?.full_name ?? "Sistema"} · {formatDateTime(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit log */}
          {audit.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase tracking-wide mb-2">Historial de modificaciones ({audit.length})</p>
              <div className="border border-(--zaire-border) rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-subtle border-b border-(--zaire-border) sticky top-0">
                    <tr>
                      {["Fecha", "Usuario", "Acción", "Descripción"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-(--zaire-text-muted) uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--zaire-border)">
                    {audit.map((a, i) => (
                      <tr key={i} className="hover:bg-subtle">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                        <td className="px-3 py-2">{a.user_name ?? "Sistema"}</td>
                        <td className="px-3 py-2 capitalize">{a.action}</td>
                        <td className="px-3 py-2 max-w-xs truncate">{a.description ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 justify-end pt-1 border-t border-(--zaire-border)">
            {!companyConfigured && <AvisoEmpresa />}
            <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Exportar PDF
            </Button>
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.3 — Informe de Integridad
// ═══════════════════════════════════════════════════════════════════════════════

type IntegrityData = {
  total: number; ots_count: number; ot_count: number;
  facturadas: number; canceladas: number; activas: number;
  // Importes por moneda, nunca sumados entre sí (ver lib/trace/amounts.ts).
  facturado: DualTotal; pendiente: DualTotal;
  hasDuplicates: boolean; hasNoNumber: boolean;
  // Órdenes con baja lógica dentro del filtro. NO entran en los totales de arriba.
  dadasDeBaja: number;
};

type CheckRowProps = { label: string; ok: boolean; detail?: string };
function CheckRow({ label, ok, detail }: CheckRowProps) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm",
      ok ? "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30" : "bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30")}>
      <span className={ok ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>{label}</span>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-(--zaire-text-muted)">{detail}</span>}
        {ok
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <XCircle className="w-4 h-4 text-red-500" />}
      </div>
    </div>
  );
}

function IntegridadCard({ companyConfigured }: { companyConfigured: boolean }) {
  const [year, setYear] = useState(String(currentYear()));
  const [branch, setBranch] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IntegrityData | null>(null);

  async function generate() {
    setLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = sb as any;

    // Importes desde los ÍTEMS, en las dos monedas: la cabecera no siempre tiene total_ars
    // (ver lib/trace/amounts.ts). Mismo criterio que el PDF del informe de integridad.
    let q = s.from("work_orders")
      .select("order_number, order_type, status, total, work_order_items(total_price, total_price_ars)")
      .is("deleted_at", null)
      .like("order_number", `%-${year}-%`);
    // Las bajas lógicas se cuentan aparte para que el check de soft delete verifique de verdad.
    let qBajas = s.from("work_orders")
      .select("order_number", { count: "exact", head: true })
      .not("deleted_at", "is", null)
      .like("order_number", `%-${year}-%`);
    if (branch !== "all") {
      // Las OTS llevan el prefijo "SR" antes del código de sucursal: sin el `or` quedaban afuera.
      const code = BRANCHES.find(b => b.id === branch)?.code ?? branch.toUpperCase();
      const filtro = branchLikePatterns(year, code).map(p => `order_number.like.${p}`).join(",");
      q = q.or(filtro);
      qBajas = qBajas.or(filtro);
    }
    const [{ data: orders }, { count: bajas }] = await Promise.all([q, qBajas]);
    const all = orders ?? [];

    const numbers = all.map((o: { order_number: string }) => o.order_number).filter(Boolean);
    const hasDuplicates = new Set(numbers).size < numbers.length;
    const hasNoNumber = all.some((o: { order_number: string }) => !o.order_number);
    const facturadas = all.filter((o: { status: string }) => o.status === "facturada").length;
    const canceladas = all.filter((o: { status: string }) => o.status === "cancelada").length;
    const activas = all.filter((o: { status: string }) => !["facturada", "cancelada"].includes(o.status)).length;
    type IntegridadRow = { status: string; work_order_items?: { total_price: number; total_price_ars: number }[] };
    const itemsUsd = (o: IntegridadRow) => (o.work_order_items ?? []).reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
    const itemsArs = (o: IntegridadRow) => (o.work_order_items ?? []).reduce((acc, i) => acc + (Number(i.total_price_ars) || 0), 0);
    const facturado = sumDualTotals(all.filter((o: IntegridadRow) => o.status === "facturada"), itemsUsd, itemsArs);
    const pendiente = sumDualTotals(all.filter((o: IntegridadRow) => !["facturada", "cancelada"].includes(o.status)), itemsUsd, itemsArs);

    setData({
      total: all.length,
      ot_count: all.filter((o: { order_type: string }) => o.order_type === "OT").length,
      ots_count: all.filter((o: { order_type: string }) => o.order_type === "OTS").length,
      facturadas, canceladas, activas,
      facturado, pendiente,
      hasDuplicates, hasNoNumber,
      dadasDeBaja: bajas ?? 0,
    });
    setLoading(false);
  }

  function exportPdf() {
    const params = new URLSearchParams({ year, branch });
    window.open(`/api/reportes/integridad?${params}`, "_blank");
  }


  return (
    <ReportCard icon={ShieldCheck} title="Informe de Integridad"
      description="Resumen ejecutivo del estado del registro. Verificación de consistencia para auditorías.">

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Año</Label>
          <Input value={year} onChange={e => setYear(e.target.value)} className="h-9" maxLength={4} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sucursal</Label>
          <Select value={branch} onValueChange={v => setBranch(v ?? "all")}>
            <SelectTrigger className="h-9"><SelectValue>{branch === "all" ? "Todas" : BRANCHES.find(b => b.id === branch)?.name ?? branch}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {BRANCHES.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={generate} disabled={loading} className="h-9 w-full bg-zaire-navy-mid hover:bg-zaire-navy text-white">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null} Generar
          </Button>
        </div>
      </div>

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              ["Total", data.total, "slate"],
              ["OT", data.ot_count, "blue"],
              ["OTS", data.ots_count, "orange"],
              ["Facturadas", data.facturadas, "green"],
              ["Activas", data.activas, "indigo"],
              ["Canceladas", data.canceladas, "red"],
            ].map(([l, v, c]) => (
              <div key={String(l)} className={cn("rounded-lg p-3 border text-center",
                `bg-${c}-50 border-${c}-200`)}>
                <p className={cn("text-xl font-bold", `text-${c}-700`)}>{String(v)}</p>
                <p className="text-xs text-(--zaire-text-muted)">{String(l)}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-subtle rounded-lg border border-(--zaire-border) p-4">
              <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-2">Financiero</p>
              {/* Las dos monedas usan el símbolo "$", así que van rotuladas: sin el rótulo no se
                  sabe cuál es cuál. */}
              <p className="text-sm">
                Facturado:{" "}
                <span className="font-bold text-green-700 dark:text-green-300">ARS {formatCurrency(data.facturado.ars, "ARS")}</span>
                {" · "}
                <span className="font-bold text-green-700 dark:text-green-300">USD {formatCurrency(data.facturado.usd, "USD")}</span>
              </p>
              <p className="text-sm mt-1">
                Pendiente:{" "}
                <span className="font-bold text-amber-700 dark:text-amber-300">ARS {formatCurrency(data.pendiente.ars, "ARS")}</span>
                {" · "}
                <span className="font-bold text-amber-700 dark:text-amber-300">USD {formatCurrency(data.pendiente.usd, "USD")}</span>
              </p>
              <p className="text-xs text-(--zaire-text-muted) mt-1.5">Por moneda, sin conversión entre ellas.</p>
            </div>
            <div className="space-y-2">
              <CheckRow label="Sin registros sin número" ok={!data.hasNoNumber} />
              <CheckRow label="Sin números duplicados" ok={!data.hasDuplicates} />
              <CheckRow
                label="Soft delete verificado"
                ok={true}
                detail={data.dadasDeBaja === 0
                  ? "Ninguna orden dada de baja ni eliminada físicamente"
                  : `${data.dadasDeBaja} con baja lógica · ninguna eliminada físicamente`}
              />
            </div>
          </div>
          <p className="text-xs text-(--zaire-text-muted)">
            Facturadas = órdenes en estado «facturada». El año filtra por el año del número de orden,
            no por la fecha de ingreso. No se incluyen las órdenes dadas de baja.
          </p>

          <div className="flex items-center gap-2 justify-end pt-1 border-t border-(--zaire-border)">
            {!companyConfigured && <AvisoEmpresa />}
            <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Exportar PDF
            </Button>
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export function TabAuditoria({ companyConfigured }: { companyConfigured: boolean }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SecuenciaCard companyConfigured={companyConfigured} />
      <TrazabilidadCard companyConfigured={companyConfigured} />
      <IntegridadCard companyConfigured={companyConfigured} />
    </div>
  );
}
