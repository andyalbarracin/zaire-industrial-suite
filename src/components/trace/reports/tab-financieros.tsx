"use client";
// tab-financieros.tsx — Reportes financieros: facturación por período, ingresos por cliente

import { useState } from "react";
import { Receipt, Users, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCurrency } from "@/lib/utils";
import { BRANCHES } from "@/lib/constants";

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
// 3.1 — Facturación por Período
// ═══════════════════════════════════════════════════════════════════════════════

type FactRow = {
  order_number: string; client_name: string; date_in: string;
  total_usd: number; total_ars: number;
};

function FacturacionPeriodoCard() {
  const [dateFrom, setDateFrom] = useState(firstOfYear());
  const [dateTo, setDateTo] = useState(today());
  const [branch, setBranch] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FactRow[] | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);

  async function loadClients() {
    if (clients.length > 0) return;
    setLoadingClients(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from("clients").select("id, business_name").eq("is_active", true).order("business_name");
    setClients(data ?? []);
    setLoadingClients(false);
  }

  async function generate() {
    setLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (sb as any).from("work_orders")
      .select("order_number, date_in, total, client_id, clients(business_name), work_order_items(total_price_ars, is_invoiced)")
      .eq("status", "facturada")
      .gte("date_in", dateFrom)
      .lte("date_in", dateTo)
      .is("deleted_at", null);
    if (branch !== "all") q = q.eq("branch_id", branch);
    if (clientFilter !== "all") q = q.eq("client_id", clientFilter);
    const { data } = await q;

    const result: FactRow[] = (data ?? []).map((r: {
      order_number: string; date_in: string; total: number;
      clients: { business_name: string } | null;
      work_order_items: { total_price_ars: number }[];
    }) => ({
      order_number: r.order_number,
      client_name: r.clients?.business_name ?? "—",
      date_in: r.date_in,
      total_usd: r.total ?? 0,
      total_ars: (r.work_order_items ?? []).reduce((s: number, i: { total_price_ars: number }) => s + (i.total_price_ars ?? 0), 0),
    }));
    setRows(result);
    setLoading(false);
  }

  const totalUsd = rows?.reduce((s, r) => s + r.total_usd, 0) ?? 0;
  const totalArs = rows?.reduce((s, r) => s + r.total_ars, 0) ?? 0;

  function exportExcel() {
    if (!rows) return;
    const data = [
      ["Reporte: Facturación por Período"],
      [`Período: ${dateFrom} a ${dateTo}`],
      [],
      ["Total USD facturado", totalUsd],
      ["Total ARS facturado", totalArs],
      [],
      ["Nro. Orden", "Cliente", "Fecha", "Total USD", "Total ARS"],
      ...rows.map(r => [r.order_number, r.client_name, formatDate(r.date_in), r.total_usd, r.total_ars]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturación por Período");
    XLSX.writeFile(wb, `Reporte_Facturacion_${dateFrom}_${dateTo}.xlsx`);
  }

  return (
    <ReportCard icon={Receipt} title="Facturación por Período"
      description="Total facturado en el período, detalle por orden y cliente.">
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
          <Label className="text-xs">Cliente</Label>
          <Select value={clientFilter} onValueChange={v => setClientFilter(v ?? "all")}
            onOpenChange={open => { if (open) loadClients(); }}>
            <SelectTrigger className="h-9">
              <SelectValue>
                {loadingClients ? "Cargando..." : clientFilter === "all" ? "Todos los clientes" : clients.find(c => c.id === clientFilter)?.business_name ?? clientFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.business_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={generate} disabled={loading} className="h-9 bg-zaire-navy-mid hover:bg-zaire-navy text-white">
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Generando...</> : "Generar"}
      </Button>

      {rows && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
              <p className="text-xs text-blue-600 dark:text-blue-300 uppercase font-semibold mb-1">Total facturado USD</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalUsd, "USD")}</p>
              <p className="text-xs text-blue-500 mt-1">{rows.length} orden{rows.length !== 1 ? "es" : ""}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-4">
              <p className="text-xs text-emerald-600 dark:text-emerald-300 uppercase font-semibold mb-1">Total facturado ARS</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalArs, "ARS")}</p>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="border border-(--zaire-border) rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle border-b border-(--zaire-border) sticky top-0">
                  <tr>
                    {["Nro. Orden", "Cliente", "Fecha", "Total USD", "Total ARS"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-(--zaire-text-muted) uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--zaire-border)">
                  {rows.map(r => (
                    <tr key={r.order_number} className="hover:bg-subtle">
                      <td className="px-3 py-2 font-mono font-semibold">{r.order_number}</td>
                      <td className="px-3 py-2">{r.client_name}</td>
                      <td className="px-3 py-2 text-xs text-(--zaire-text-muted)">{formatDate(r.date_in)}</td>
                      <td className="px-3 py-2 text-blue-700 dark:text-blue-300">{formatCurrency(r.total_usd, "USD")}</td>
                      <td className="px-3 py-2 text-emerald-700 dark:text-emerald-300">{formatCurrency(r.total_ars, "ARS")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5" disabled={!rows.length}>
              <Download className="w-3.5 h-3.5" /> Exportar XLS
            </Button>
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3.2 — Ingresos por Cliente
// ═══════════════════════════════════════════════════════════════════════════════

type IngresosRow = { client_name: string; count: number; total_usd: number; total_ars: number };

function IngresosPorClienteCard() {
  const [dateFrom, setDateFrom] = useState(firstOfYear());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<IngresosRow[] | null>(null);

  async function generate() {
    setLoading(true);
    const sb = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb as any).from("work_orders")
      .select("total, clients(business_name), work_order_items(total_price_ars)")
      .eq("status", "facturada")
      .gte("date_in", dateFrom)
      .lte("date_in", dateTo)
      .is("deleted_at", null);

    const grouped: Record<string, IngresosRow> = {};
    for (const r of (data ?? [])) {
      const name = r.clients?.business_name ?? "Sin cliente";
      if (!grouped[name]) grouped[name] = { client_name: name, count: 0, total_usd: 0, total_ars: 0 };
      grouped[name].count++;
      grouped[name].total_usd += r.total ?? 0;
      grouped[name].total_ars += (r.work_order_items ?? []).reduce((s: number, i: { total_price_ars: number }) => s + (i.total_price_ars ?? 0), 0);
    }
    setRows(Object.values(grouped).sort((a, b) => b.total_usd - a.total_usd));
    setLoading(false);
  }

  function exportExcel() {
    if (!rows) return;
    const data = [
      ["Reporte: Ingresos por Cliente"],
      [`Período: ${dateFrom} a ${dateTo}`],
      [],
      ["Cliente", "Cant. OTs facturadas", "Total USD", "Total ARS"],
      ...rows.map(r => [r.client_name, r.count, r.total_usd, r.total_ars]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ingresos por Cliente");
    XLSX.writeFile(wb, `Reporte_IngresosPorCliente_${dateFrom}_${dateTo}.xlsx`);
  }

  const totalUsd = rows?.reduce((s, r) => s + r.total_usd, 0) ?? 0;

  return (
    <ReportCard icon={Users} title="Ingresos por Cliente"
      description="Ranking de clientes por monto facturado en el período.">
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
          <p className="text-sm text-(--zaire-text-muted)">
            {rows.length} cliente{rows.length !== 1 ? "s" : ""} · Total: <span className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalUsd, "USD")}</span>
          </p>
          <div className="border border-(--zaire-border) rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-subtle border-b border-(--zaire-border) sticky top-0">
                <tr>
                  {["#", "Cliente", "OTs facturadas", "Total USD", "Total ARS"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-(--zaire-text-muted) uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--zaire-border)">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-subtle">
                    <td className="px-3 py-2 text-xs text-(--zaire-text-muted)">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{r.client_name}</td>
                    <td className="px-3 py-2 font-bold">{r.count}</td>
                    <td className="px-3 py-2 text-blue-700 dark:text-blue-300">{formatCurrency(r.total_usd, "USD")}</td>
                    <td className="px-3 py-2 text-emerald-700 dark:text-emerald-300">{formatCurrency(r.total_ars, "ARS")}</td>
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

export function TabFinancieros() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <FacturacionPeriodoCard />
      <IngresosPorClienteCard />
    </div>
  );
}
