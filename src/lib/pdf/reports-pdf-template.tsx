// reports-pdf-template.tsx — src/lib/pdf/reports-pdf-template.tsx — 2026-07-13
// PDF de reportes Field (operativos + financieros).

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BRANDING } from "@/lib/branding";
import type { FieldReports, NameValue } from "@/lib/field/reports";

function money(n: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
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
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, textAlign: "center", fontSize: 7, color: "#94A3B8", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4 },
});

function Table({ title, rows, isMoney }: { title: string; rows: NameValue[]; isMoney?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <View wrap={false}>
      <Text style={S.sectionTitle}>{title}</Text>
      {rows.map((r, i) => (
        <View key={i} style={S.row}>
          <Text style={S.cName}>{r.name}</Text>
          <Text style={S.cVal}>{isMoney ? money(r.value) : r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function ReportsPdfDocument({ rep }: { rep: FieldReports }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.brand}>{BRANDING.systemName}</Text>
            <Text style={S.brandSub}>Zaire Field — Reportes operativos y financieros</Text>
          </View>
          <Text style={S.docCode}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</Text>
        </View>

        <View style={S.kpis}>
          <View style={S.kpi}><Text style={S.kpiLabel}>Total visitas</Text><Text style={S.kpiValue}>{rep.totalVisits}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Tiempo prom. en sitio</Text><Text style={S.kpiValue}>{rep.avgSiteMinutes != null ? `${rep.avgSiteMinutes} min` : "—"}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Finalizadas</Text><Text style={S.kpiValue}>{rep.finalized}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Activas</Text><Text style={S.kpiValue}>{rep.active}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Total gastos ARS</Text><Text style={S.kpiValue}>{money(rep.totalExpensesArs)}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Facturable ARS</Text><Text style={S.kpiValue}>{money(rep.billableExpensesArs)}</Text></View>
        </View>

        <Table title="Visitas por estado" rows={rep.byStatus} />
        <Table title="Visitas por sucursal" rows={rep.byBranch} />
        <Table title="Visitas por técnico" rows={rep.byTechnician} />
        <Table title="Visitas por cliente" rows={rep.byClient} />
        <Table title="Gastos por categoría (ARS)" rows={rep.expByCategory} isMoney />
        <Table title="Gastos por técnico (ARS)" rows={rep.expByTechnician} isMoney />
        <Table title="Control de cobranza (visitas facturables)" rows={rep.byBilling} />

        <Text style={S.footer} fixed>{BRANDING.systemName} · Zaire Field — Documento generado automáticamente</Text>
      </Page>
    </Document>
  );
}
