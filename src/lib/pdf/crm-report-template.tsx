// crm-report-template.tsx — src/lib/pdf/crm-report-template.tsx — 2026-09-27
// PDF de reportes de Zaire CRM (conversión, pipeline por etapa, ganado por mes, rendimiento).

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BRANDING } from "@/lib/branding";
import type { CompanyInfo } from "@/lib/company";
import type { CrmReports, NameValue } from "@/lib/crm/reports";

// Los montos del CRM se calculan en pesos (ver lib/crm/reports.ts: las oportunidades en otras
// monedas no se suman), así que el rótulo ARS es parte del dato y no un supuesto del template.
function money(n: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);
}

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 32, color: "#0F172A" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: "#0B2447" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  brandSub: { fontSize: 8, color: "#64748B", marginTop: 1 },
  companyInfo: { fontSize: 6.5, color: "#64748B", marginTop: 1 },
  docRight: { alignItems: "flex-end" as const },
  docModule: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0B2447", textAlign: "right" },
  docCode: { fontSize: 8, color: "#64748B", textAlign: "right" },
  kpis: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  kpi: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "5 8", width: "23%" },
  kpiLabel: { fontSize: 6.5, color: "#94A3B8", textTransform: "uppercase" },
  kpiValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0B2447", marginTop: 8, marginBottom: 3, textTransform: "uppercase" },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingVertical: 2.5 },
  headRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingVertical: 2.5 },
  th: { fontSize: 6.5, color: "#94A3B8", textTransform: "uppercase" },
  cName: { flex: 1, fontSize: 8.5 },
  cVal: { width: 90, fontSize: 8.5, textAlign: "right", fontFamily: "Helvetica-Bold" },
  cSmall: { width: 60, fontSize: 8.5, textAlign: "right" },
  empty: { fontSize: 8, color: "#94A3B8", marginTop: 2 },
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

export function CrmReportDocument({ rep, companyInfo }: { rep: CrmReports; companyInfo: CompanyInfo }) {
  const domicilio = [companyInfo.direccion, companyInfo.ciudad].filter(Boolean).join(" — ");
  const fiscal = [companyInfo.cuit ? `CUIT: ${companyInfo.cuit}` : null, companyInfo.email].filter(Boolean).join(" · ");
  const sinDatos = rep.wonCount === 0 && rep.byStageCount.length === 0 && rep.leadsByStatus.length === 0;

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* La empresa emisora encabeza el documento; el módulo va a la derecha. */}
        <View style={S.header}>
          <View>
            <Text style={S.brand}>{companyInfo.nombre}</Text>
            {!!domicilio && <Text style={S.companyInfo}>{domicilio}</Text>}
            {!!fiscal && <Text style={S.companyInfo}>{fiscal}</Text>}
          </View>
          <View style={S.docRight}>
            <Text style={S.docModule}>{BRANDING.modules.crm.toUpperCase()}</Text>
            <Text style={S.brandSub}>Reporte de ventas</Text>
            <Text style={S.docCode}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</Text>
          </View>
        </View>

        <View style={S.kpis}>
          <View style={S.kpi}><Text style={S.kpiLabel}>Tasa de conversión</Text><Text style={S.kpiValue}>{rep.conversionRate}%</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Win rate</Text><Text style={S.kpiValue}>{rep.winRate}%</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Ganadas</Text><Text style={S.kpiValue}>{rep.wonCount}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Ciclo de venta</Text><Text style={S.kpiValue}>{rep.avgSalesCycleDays != null ? `${rep.avgSalesCycleDays} días` : "—"}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Monto ganado (ARS)</Text><Text style={S.kpiValue}>{money(rep.wonAmountArs)}</Text></View>
          <View style={S.kpi}><Text style={S.kpiLabel}>Ticket prom. (ARS)</Text><Text style={S.kpiValue}>{money(rep.avgWonAmountArs)}</Text></View>
        </View>

        {/* Un CRM recién puesto en marcha no tiene nada que informar: se dice, en vez de emitir un
            documento con todas las secciones vacías. */}
        {sinDatos && (
          <Text style={S.empty}>Todavía no hay oportunidades ni leads cargados para informar.</Text>
        )}

        <Table title="Pipeline abierto por etapa (ARS)" rows={rep.pipelineByStageArs} isMoney />
        <Table title="Oportunidades abiertas por etapa" rows={rep.byStageCount} />
        <Table title="Ganado por mes (ARS)" rows={rep.wonByMonth} isMoney />

        {rep.byOwner.length > 0 && (
          <View wrap={false}>
            <Text style={S.sectionTitle}>Rendimiento por responsable</Text>
            <View style={S.headRow}>
              <Text style={[S.cName, S.th]}>Responsable</Text>
              <Text style={[S.cSmall, S.th]}>Abiertas</Text>
              <Text style={[S.cSmall, S.th]}>Ganadas</Text>
              <Text style={[S.cVal, S.th]}>Monto ganado</Text>
            </View>
            {rep.byOwner.map((o, i) => (
              <View key={i} style={S.row}>
                <Text style={S.cName}>{o.name}</Text>
                <Text style={S.cSmall}>{o.abiertas}</Text>
                <Text style={S.cSmall}>{o.ganadas}</Text>
                <Text style={S.cVal}>{money(o.montoGanadoArs)}</Text>
              </View>
            ))}
          </View>
        )}

        <Table title="Leads por estado" rows={rep.leadsByStatus} />
        <Table title="Leads por origen" rows={rep.leadsBySource} />

        <Text style={S.footer} fixed>
          {companyInfo.nombre} · {BRANDING.modules.crm} — Montos en pesos; las oportunidades en otras monedas no se suman
        </Text>
      </Page>
    </Document>
  );
}
