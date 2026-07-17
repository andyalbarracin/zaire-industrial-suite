"use client";
// tab-operativos.tsx — Reportes operativos: período, por cliente, proyección, pendientes facturación

import { useState } from "react";
import { CalendarDays, Users, TrendingUp, AlertCircle, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";
import { ORDER_STATUS_LABELS } from "@/lib/trace/constants";
import type { OrderStatus } from "@/lib/types/database";

function ReportCard({ icon: Icon, title, description, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; description: string; children: React.ReactNode;
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

function today() { return new Date().toISOString().split("T")[0]; }
function firstOfYear() { return `${new Date().getFullYear()}-01-01`; }

// ═══════════════════════════════════════════════════════════════════════════════
// 2.1 — Órdenes por Período
// ═══════════════════════════════════════════════════════════════════════════════

type PeriodRow = { status: string; order_type: string; count: number };

function OrdenesPeriodoCard() {
  const [dateFrom, setDateFrom] = useState(firstOfYear());
  const [dateTo, setDateTo] = useState(today());
  const [branch, setBranch] = useState("all");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PeriodRow[] | null>(null);

  async function generate() {
    setLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (sb as any).from("work_orders")
      .select("status, order_type")
      .gte("date_in", dateFrom)
      .lte("date_in", dateTo)
      .is("deleted_at", null);
    if (branch !== "all") q = q.eq("branch_id", branch);
    if (type !== "all") q = q.eq("order_type", type);
    const { data } = await q;

    const grouped: Record<string, PeriodRow> = {};
    for (const r of (data ?? [])) {
      const k = `${r.status}|${r.order_type}`;
      if (!grouped[k]) grouped[k] = { status: r.status, order_type: r.order_type, count: 0 };
      grouped[k].count++;
    }
    setRows(Object.values(grouped).sort((a, b) => b.count - a.count));
    setLoading(false);
  }

  function exportExcel() {
    if (!rows) return;
    const data = [
      ["Reporte: Órdenes por Período"],
      [`Período: ${dateFrom} a ${dateTo}`],
      [],
      ["Estado", "Tipo", "Cantidad"],
      ...rows.map(r => [ORDER_STATUS_LABELS[r.status as OrderStatus] ?? r.status, r.order_type, r.count]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Órdenes por Período");
    XLSX.writeFile(wb, `Reporte_OrdenesPeriodo_${dateFrom}_${dateTo}.xlsx`);
  }

  const total = rows?.reduce((s, r) => s + r.count, 0) ?? 0;
  const otCount = rows?.filter(r => r.order_type === "OT").reduce((s, r) => s + r.count, 0) ?? 0;
  const otsCount = rows?.filter(r => r.order_type === "OTS").reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <ReportCard icon={CalendarDays} title="Órdenes por Período"
      description="Resumen de órdenes en un rango de fechas, con desglose por estado y tipo.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
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
      </div>
      <Button onClick={generate} disabled={loading} className="h-9 bg-zaire-navy-mid hover:bg-zaire-navy text-white">
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Generando...</> : "Generar"}
      </Button>

      {rows && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[["Total", total, "slate"], ["OTs", otCount, "blue"], ["OTSs", otsCount, "orange"]].map(([l, v, c]) => (
              <div key={String(l)} className={cn("rounded-lg p-3 border text-center", `bg-${c}-50 border-${c}-200`)}>
                <p className={cn("text-2xl font-bold", `text-${c}-700`)}>{String(v)}</p>
                <p className="text-xs text-(--zaire-text-muted)">{String(l)}</p>
              </div>
            ))}
          </div>
          <div className="border border-(--zaire-border) rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-(--zaire-border)">
                <tr>
                  {["Estado", "Tipo", "Cantidad"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-(--zaire-text-muted) uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--zaire-border)">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{ORDER_STATUS_LABELS[r.status as OrderStatus] ?? r.status}</td>
                    <td className="px-3 py-2"><span className={cn("text-xs font-semibold", r.order_type === "OT" ? "text-blue-700" : "text-orange-700")}>{r.order_type}</span></td>
                    <td className="px-3 py-2 font-bold">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Exportar XLS
            </Button>
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2.2 — Órdenes por Cliente
// ═══════════════════════════════════════════════════════════════════════════════

type ClienteRow = { client_name: string; count: number; total_usd: number; total_ars: number };

function OrdenesPorClienteCard() {
  const [dateFrom, setDateFrom] = useState(firstOfYear());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ClienteRow[] | null>(null);

  async function generate() {
    setLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from("work_orders")
      .select("total, clients(business_name), work_order_items(total_price_ars)")
      .gte("date_in", dateFrom)
      .lte("date_in", dateTo)
      .is("deleted_at", null)
      .neq("status", "cancelada");

    const grouped: Record<string, ClienteRow> = {};
    for (const r of (data ?? [])) {
      const name = r.clients?.business_name ?? "Sin cliente";
      if (!grouped[name]) grouped[name] = { client_name: name, count: 0, total_usd: 0, total_ars: 0 };
      grouped[name].count++;
      grouped[name].total_usd += r.total ?? 0;
      grouped[name].total_ars += (r.work_order_items ?? []).reduce((s: number, i: { total_price_ars: number }) => s + (i.total_price_ars ?? 0), 0);
    }
    setRows(Object.values(grouped).sort((a, b) => b.count - a.count));
    setLoading(false);
  }

  function exportExcel() {
    if (!rows) return;
    const data = [
      ["Reporte: Órdenes por Cliente"],
      [`Período: ${dateFrom} a ${dateTo}`],
      [],
      ["Cliente", "Cant. OTs", "Total USD", "Total ARS"],
      ...rows.map(r => [r.client_name, r.count, r.total_usd, r.total_ars]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Órdenes por Cliente");
    XLSX.writeFile(wb, `Reporte_OrdenesCliente_${dateFrom}_${dateTo}.xlsx`);
  }

  return (
    <ReportCard icon={Users} title="Órdenes por Cliente"
      description="Ranking de clientes por volumen de órdenes en el período.">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
        </div>
        <div className="flex items-end">
          <Button onClick={generate} disabled={loading} className="h-9 w-full bg-zaire-navy-mid hover:bg-zaire-navy text-white">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Generar"}
          </Button>
        </div>
      </div>

      {rows && (
        <div className="space-y-3">
          <div className="border border-(--zaire-border) rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-(--zaire-border) sticky top-0">
                <tr>
                  {["#", "Cliente", "Cant.", "Total USD", "Total ARS"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-(--zaire-text-muted) uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--zaire-border)">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs text-(--zaire-text-muted)">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.client_name}</td>
                    <td className="px-3 py-2 font-bold">{r.count}</td>
                    <td className="px-3 py-2 text-blue-700">{formatCurrency(r.total_usd, "USD")}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatCurrency(r.total_ars, "ARS")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Exportar XLS
            </Button>
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2.3 — Proyección Financiera
// ═══════════════════════════════════════════════════════════════════════════════

type ProyeccionRow = { status: string; count: number; total_usd: number; total_ars: number };
type ProyeccionCliente = { name: string; total_usd: number; total_ars: number };

function ProyeccionCard() {
  const [loading, setLoading] = useState(false);
  const [byStatus, setByStatus] = useState<ProyeccionRow[] | null>(null);
  const [byClient, setByClient] = useState<ProyeccionCliente[] | null>(null);
  const [totals, setTotals] = useState<{ usd: number; ars: number } | null>(null);

  async function generate() {
    setLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from("work_orders")
      .select("status, total, clients(business_name), work_order_items(total_price_ars)")
      .is("deleted_at", null)
      .not("status", "in", '("cancelada","facturada")');

    const statusMap: Record<string, ProyeccionRow> = {};
    const clientMap: Record<string, ProyeccionCliente> = {};
    let totalUsd = 0, totalArs = 0;

    for (const r of (data ?? [])) {
      const ars = (r.work_order_items ?? []).reduce((s: number, i: { total_price_ars: number }) => s + (i.total_price_ars ?? 0), 0);
      totalUsd += r.total ?? 0;
      totalArs += ars;

      if (!statusMap[r.status]) statusMap[r.status] = { status: r.status, count: 0, total_usd: 0, total_ars: 0 };
      statusMap[r.status].count++;
      statusMap[r.status].total_usd += r.total ?? 0;
      statusMap[r.status].total_ars += ars;

      const cn = r.clients?.business_name ?? "Sin cliente";
      if (!clientMap[cn]) clientMap[cn] = { name: cn, total_usd: 0, total_ars: 0 };
      clientMap[cn].total_usd += r.total ?? 0;
      clientMap[cn].total_ars += ars;
    }

    setTotals({ usd: totalUsd, ars: totalArs });
    setByStatus(Object.values(statusMap).sort((a, b) => b.total_usd - a.total_usd));
    setByClient(Object.values(clientMap).sort((a, b) => b.total_usd - a.total_usd).slice(0, 10));
    setLoading(false);
  }

  function exportExcel() {
    if (!byStatus || !byClient || !totals) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Proyección Financiera — Órdenes activas"],
      [],
      ["Total proyectado USD", totals.usd],
      ["Total proyectado ARS", totals.ars],
      [],
      ["Por Estado", "", ""],
      ["Estado", "Cantidad", "Total USD", "Total ARS"],
      ...byStatus.map(r => [ORDER_STATUS_LABELS[r.status as OrderStatus] ?? r.status, r.count, r.total_usd, r.total_ars]),
      [],
      ["Por Cliente (Top 10)"],
      ["Cliente", "Total USD", "Total ARS"],
      ...byClient.map(r => [r.name, r.total_usd, r.total_ars]),
    ]), "Proyección");
    XLSX.writeFile(wb, `Reporte_ProyeccionFinanciera_${today()}.xlsx`);
  }

  return (
    <ReportCard icon={TrendingUp} title="Proyección Financiera"
      description="Monto total proyectado si se completan todas las órdenes activas.">
      <Button onClick={generate} disabled={loading} className="h-9 bg-zaire-navy-mid hover:bg-zaire-navy text-white">
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Calculando...</> : "Calcular proyección"}
      </Button>

      {totals && byStatus && byClient && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Total proyectado USD</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(totals.usd, "USD")}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs text-emerald-600 uppercase font-semibold mb-1">Total proyectado ARS</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totals.ars, "ARS")}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-2">Por estado</p>
              <div className="space-y-1.5">
                {byStatus.map(r => (
                  <div key={r.status} className="flex items-center justify-between text-sm">
                    <span className="text-(--zaire-text-muted)">{ORDER_STATUS_LABELS[r.status as OrderStatus] ?? r.status} ({r.count})</span>
                    <span className="font-medium text-blue-700">{formatCurrency(r.total_usd, "USD")}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-2">Por cliente (top 10)</p>
              <div className="space-y-1.5">
                {byClient.map(r => (
                  <div key={r.name} className="flex items-center justify-between text-sm">
                    <span className="text-(--zaire-text-muted) truncate max-w-32">{r.name}</span>
                    <span className="font-medium text-blue-700">{formatCurrency(r.total_usd, "USD")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Exportar XLS
            </Button>
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2.4 — Pendientes de Facturación
// ═══════════════════════════════════════════════════════════════════════════════

type PendRow = {
  order_number: string; client_name: string; branch: string;
  total_usd: number; total_ars: number; delivered: number; invoiced: number; total_items: number;
};

function PendientesFacturacionCard() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PendRow[] | null>(null);

  async function generate() {
    setLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from("work_orders")
      .select("order_number, total, branch_id, clients(business_name), work_order_items(is_delivered, is_invoiced, total_price_ars)")
      .is("deleted_at", null)
      .not("status", "in", '("cancelada","facturada")');

    const result: PendRow[] = [];
    for (const r of (data ?? [])) {
      const items = r.work_order_items ?? [];
      const delivered = items.filter((i: { is_delivered: boolean }) => i.is_delivered).length;
      const invoiced = items.filter((i: { is_invoiced: boolean }) => i.is_invoiced).length;
      if (delivered > invoiced) {
        result.push({
          order_number: r.order_number,
          client_name: r.clients?.business_name ?? "—",
          branch: BRANCHES.find(b => b.id === r.branch_id)?.code ?? r.branch_id ?? "—",
          total_usd: r.total ?? 0,
          total_ars: items.reduce((s: number, i: { total_price_ars: number }) => s + (i.total_price_ars ?? 0), 0),
          delivered, invoiced, total_items: items.length,
        });
      }
    }
    setRows(result.sort((a, b) => b.total_usd - a.total_usd));
    setLoading(false);
  }

  function exportExcel() {
    if (!rows) return;
    const data = [
      ["Reporte: Pendientes de Facturación"],
      [`Generado: ${today()}`],
      [],
      ["Nro. Orden", "Cliente", "Sucursal", "Total USD", "Total ARS", "Ítems entregados", "Ítems facturados"],
      ...rows.map(r => [r.order_number, r.client_name, r.branch, r.total_usd, r.total_ars, r.delivered, r.invoiced]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pendientes Facturación");
    XLSX.writeFile(wb, `Reporte_PendientesFacturacion_${today()}.xlsx`);
  }

  return (
    <ReportCard icon={AlertCircle} title="Pendientes de Facturación"
      description="Órdenes con ítems entregados pero aún sin facturar.">
      <Button onClick={generate} disabled={loading} className="h-9 bg-zaire-navy-mid hover:bg-zaire-navy text-white">
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Buscando...</> : "Buscar pendientes"}
      </Button>

      {rows && (
        <div className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              ✅ No hay órdenes con ítems pendientes de facturación.
            </p>
          ) : (
            <>
              <p className="text-sm text-amber-700">{rows.length} orden{rows.length !== 1 ? "es" : ""} con pendientes de facturación</p>
              <div className="border border-(--zaire-border) rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-(--zaire-border) sticky top-0">
                    <tr>
                      {["Nro. Orden", "Cliente", "Suc.", "Total USD", "Total ARS", "Entregados", "Facturados"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-(--zaire-text-muted) uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--zaire-border)">
                    {rows.map(r => (
                      <tr key={r.order_number} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-semibold">{r.order_number}</td>
                        <td className="px-3 py-2">{r.client_name}</td>
                        <td className="px-3 py-2 text-xs">{r.branch}</td>
                        <td className="px-3 py-2 text-blue-700">{formatCurrency(r.total_usd, "USD")}</td>
                        <td className="px-3 py-2 text-emerald-700">{formatCurrency(r.total_ars, "ARS")}</td>
                        <td className="px-3 py-2 font-medium text-green-700">{r.delivered}</td>
                        <td className="px-3 py-2 font-medium text-amber-600">{r.invoiced}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5" disabled={!rows?.length}>
              <Download className="w-3.5 h-3.5" /> Exportar XLS
            </Button>
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

export function TabOperativos() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <OrdenesPeriodoCard />
      <OrdenesPorClienteCard />
      <ProyeccionCard />
      <PendientesFacturacionCard />
    </div>
  );
}
