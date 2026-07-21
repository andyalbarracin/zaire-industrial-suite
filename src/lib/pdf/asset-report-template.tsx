// asset-report-template.tsx — src/lib/pdf/asset-report-template.tsx — 2026-07-20
// PDF de reportes de Zaire Assets (flota, costo/TCO, confiabilidad, riesgo).

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BRANDING } from "@/lib/branding";
import type { AssetReport, NameValue } from "@/lib/assets/reports";

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
  cSmall: { width: 55, fontSize: 8.5, textAlign: "right" },
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

export function AssetReportDocument({ rep }: { rep: AssetReport }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.brand}>{BRANDING.systemName}</Text>
            <Text style={S.brandSub}>Zaire Assets — Reporte de flota y confiabilidad</Text>
          </View>
          <Text style={S.docCode}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</Text>
        </View>

        <View style={S.kpis}>
          <View style={S.kpi}><Text style={S.kpiLabel}>Equipos</Text><Text style={S.kpiValue}>{rep.total}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Operativos</Text><Text style={S.kpiValue}>{rep.operativos}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>En riesgo</Text><Text style={S.kpiValue}>{rep.atRiskCount}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Salud promedio</Text><Text style={S.kpiValue}>{rep.avgHealth}%</Text></View>
        </View>

        <View style={S.kpis}>
          <View style={[S.kpi, { width: "48%" }]}><Text style={S.kpiLabel}>Costo de flota (TCO)</Text><Text style={S.kpiValue}>{rep.costByCurrency.map((v) => money(v.value, v.name)).join(" · ") || money(0)}</Text></View>
          <View style={[S.kpi, { width: "48%" }]}><Text style={S.kpiLabel}>Equipos críticos (crit. ≥ 4)</Text><Text style={S.kpiValue}>{rep.criticalCount}</Text></View>
        </View>

        <Table title="Flota por estado" rows={rep.byStatus} />
        <Table title="Flota por tipo" rows={rep.byType} />
        <Table title={`Costo por equipo (${rep.primaryCurrency})`} rows={rep.costByAsset} isMoney currency={rep.primaryCurrency} />

        {rep.riskRanking.length > 0 && (
          <View>
            <Text style={S.sectionTitle}>Ranking de riesgo</Text>
            <View style={[S.row, { borderTopWidth: 0 }]}>
              <Text style={[S.cName, { color: "#94A3B8" }]}>Equipo</Text>
              <Text style={[S.cSmall, { color: "#94A3B8" }]}>Criticidad</Text>
              <Text style={[S.cSmall, { color: "#94A3B8" }]}>Salud</Text>
              <Text style={[S.cSmall, { color: "#94A3B8" }]}>Riesgo</Text>
            </View>
            {rep.riskRanking.map((r, i) => (
              <View key={i} style={S.row}>
                <Text style={S.cName}>{r.name}</Text>
                <Text style={S.cSmall}>{r.criticidad}</Text>
                <Text style={S.cSmall}>{r.health}%</Text>
                <Text style={S.cSmall}>{r.risk}</Text>
              </View>
            ))}
          </View>
        )}

        <Table title="Top equipos por fallas" rows={rep.topFailures} />

        <Text style={S.footer} fixed>{BRANDING.systemName} · Reporte generado automáticamente · Salud/TCO/riesgo calculados sobre la hoja de vida</Text>
      </Page>
    </Document>
  );
}
