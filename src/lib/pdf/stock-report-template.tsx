// stock-report-template.tsx — src/lib/pdf/stock-report-template.tsx — 2026-07-18
// PDF de reportes de Zaire Stock (valuación, bajo mínimo, consumo).

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BRANDING } from "@/lib/branding";
import type { StockReport, NameValue } from "@/lib/stock/reports";

function money(n: number, cur = "ARS"): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);
}

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 32, color: "#0F172A" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: "#0B2447" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  brandSub: { fontSize: 8, color: "#64748B", marginTop: 1 },
  docCode: { fontSize: 8, color: "#64748B", textAlign: "right" },
  kpis: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  kpi: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "5 8", width: "23%" },
  kpiLabel: { fontSize: 6.5, color: "#94A3B8", textTransform: "uppercase" },
  kpiValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0B2447", marginTop: 8, marginBottom: 3, textTransform: "uppercase" },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingVertical: 2.5 },
  cName: { flex: 1, fontSize: 8.5 },
  cVal: { width: 90, fontSize: 8.5, textAlign: "right", fontFamily: "Helvetica-Bold" },
  cSmall: { width: 60, fontSize: 8.5, textAlign: "right" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, textAlign: "center", fontSize: 7, color: "#94A3B8", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4 },
});

function Table({ title, rows, isMoney, currency }: { title: string; rows: NameValue[]; isMoney?: boolean; currency?: string }) {
  if (rows.length === 0) return null;
  return (
    <View wrap={false}>
      <Text style={S.sectionTitle}>{title}</Text>
      {rows.map((r, i) => (
        <View key={i} style={S.row}>
          <Text style={S.cName}>{r.name}</Text>
          <Text style={S.cVal}>{isMoney ? money(r.value, currency) : r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function StockReportDocument({ rep }: { rep: StockReport }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.brand}>{BRANDING.systemName}</Text>
            <Text style={S.brandSub}>Zaire Stock — Reporte de inventario</Text>
          </View>
          <Text style={S.docCode}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</Text>
        </View>

        <View style={S.kpis}>
          <View style={S.kpi}><Text style={S.kpiLabel}>Valor inventario</Text><Text style={S.kpiValue}>{rep.valueByCurrency.map((v) => money(v.value, v.name)).join(" · ") || money(0)}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>SKUs con stock</Text><Text style={S.kpiValue}>{rep.skuCount}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Bajo mínimo</Text><Text style={S.kpiValue}>{rep.lowStockCount}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Depósitos</Text><Text style={S.kpiValue}>{rep.warehouseCount}</Text></View>
        </View>

        <Table title={`Valor por depósito (${rep.primaryCurrency})`} rows={rep.valuationByWarehouse} isMoney currency={rep.primaryCurrency} />
        <Table title={`Valor por categoría (${rep.primaryCurrency})`} rows={rep.valuationByCategory} isMoney currency={rep.primaryCurrency} />

        {rep.lowStock.length > 0 && (
          <View>
            <Text style={S.sectionTitle}>Bajo mínimo</Text>
            <View style={[S.row, { borderTopWidth: 0 }]}>
              <Text style={[S.cName, { color: "#94A3B8" }]}>Producto</Text>
              <Text style={[S.cSmall, { color: "#94A3B8" }]}>Depósito</Text>
              <Text style={[S.cSmall, { color: "#94A3B8" }]}>Stock</Text>
              <Text style={[S.cSmall, { color: "#94A3B8" }]}>Mínimo</Text>
            </View>
            {rep.lowStock.map((r, i) => (
              <View key={i} style={S.row}>
                <Text style={S.cName}>{r.product}</Text>
                <Text style={S.cSmall}>{r.warehouse}</Text>
                <Text style={S.cSmall}>{r.on_hand}</Text>
                <Text style={S.cSmall}>{r.min_qty}</Text>
              </View>
            ))}
          </View>
        )}

        <Table title="Top productos consumidos (unidades)" rows={rep.topConsumed} />

        <Text style={S.footer} fixed>{BRANDING.systemName} · Reporte generado automáticamente · Valuación por costo promedio ponderado (WAC)</Text>
      </Page>
    </Document>
  );
}
