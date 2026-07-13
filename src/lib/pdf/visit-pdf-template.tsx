// visit-pdf-template.tsx — src/lib/pdf/visit-pdf-template.tsx — 2026-07-13
// Template PDF de la ficha de visita de Zaire Field.

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BRANDING } from "@/lib/branding";

interface VisitPdfData {
  visit_number: string | null;
  status: string;
  purpose: string | null;
  branch: string;
  technician: string;
  vehicle: string;
  client: string;
  site: string;
  scheduled_at: string | null;
  started_at: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  ended_at: string | null;
  planned_notes: string | null;
  report: {
    equipment_tag: string | null;
    serial_number: string | null;
    medida: string | null;
    unidad_medida: string | null;
    marca: string | null;
    modelo: string | null;
    materiales_caras: string | null;
    materiales_orings: string | null;
    findings: string | null;
    recommendations: string | null;
    requires_repair: boolean;
  } | null;
  events: { event_type: string; occurred_at: string; description: string | null }[];
}

function fdt(d: string | null): string {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: es });
}

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 32, color: "#0F172A" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: "#0B2447" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  brandSub: { fontSize: 8, color: "#64748B", marginTop: 1 },
  docCode: { fontSize: 8, color: "#64748B", textAlign: "right" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0B2447", padding: "6 10", marginBottom: 10, borderRadius: 3 },
  titleText: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  visitNum: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#A5D7E8" },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0B2447", marginTop: 8, marginBottom: 4, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  box: { width: "31%", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "4 6" },
  label: { fontSize: 6.5, color: "#94A3B8", textTransform: "uppercase", marginBottom: 1 },
  value: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  para: { fontSize: 9, marginBottom: 3, lineHeight: 1.4 },
  eventRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingVertical: 3 },
  eventTime: { width: 90, color: "#64748B", fontSize: 8 },
  eventDesc: { flex: 1, fontSize: 8.5 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, textAlign: "center", fontSize: 7, color: "#94A3B8", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4 },
});

function Box({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.box}>
      <Text style={S.label}>{label}</Text>
      <Text style={S.value}>{value}</Text>
    </View>
  );
}

export function VisitPdfDocument({ data }: { data: VisitPdfData }) {
  const r = data.report;
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.brand}>{BRANDING.systemName}</Text>
            <Text style={S.brandSub}>Zaire Field — Ficha de visita</Text>
          </View>
          <Text style={S.docCode}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</Text>
        </View>

        <View style={S.titleRow}>
          <Text style={S.titleText}>VISITA — {data.status.toUpperCase()}</Text>
          <Text style={S.visitNum}>{data.visit_number ?? "—"}</Text>
        </View>

        <Text style={S.sectionTitle}>Datos generales</Text>
        <View style={S.grid}>
          <Box label="Técnico" value={data.technician} />
          <Box label="Unidad" value={data.vehicle} />
          <Box label="Sucursal" value={data.branch} />
          <Box label="Cliente" value={data.client} />
          <Box label="Sitio" value={data.site} />
          <Box label="Propósito" value={data.purpose ?? "—"} />
        </View>

        <Text style={S.sectionTitle}>Fechas</Text>
        <View style={S.grid}>
          <Box label="Agendada" value={fdt(data.scheduled_at)} />
          <Box label="Salida" value={fdt(data.started_at)} />
          <Box label="Arribo" value={fdt(data.arrived_at)} />
          <Box label="Salida sitio" value={fdt(data.departed_at)} />
          <Box label="Fin" value={fdt(data.ended_at)} />
        </View>

        {r && (
          <>
            <Text style={S.sectionTitle}>Reporte técnico</Text>
            <View style={S.grid}>
              <Box label="Equipo/TAG" value={r.equipment_tag ?? "—"} />
              <Box label="N° serie" value={r.serial_number ?? "—"} />
              <Box label="Medida" value={`${r.medida ?? "—"} ${r.unidad_medida ?? ""}`.trim()} />
              <Box label="Marca" value={r.marca ?? "—"} />
              <Box label="Modelo" value={r.modelo ?? "—"} />
              <Box label="Requiere reparación" value={r.requires_repair ? "Sí" : "No"} />
              <Box label="Materiales caras" value={r.materiales_caras ?? "—"} />
              <Box label="Materiales O-rings" value={r.materiales_orings ?? "—"} />
            </View>
            {r.findings && (<><Text style={S.label}>HALLAZGOS</Text><Text style={S.para}>{r.findings}</Text></>)}
            {r.recommendations && (<><Text style={S.label}>RECOMENDACIONES</Text><Text style={S.para}>{r.recommendations}</Text></>)}
          </>
        )}

        {data.events.length > 0 && (
          <>
            <Text style={S.sectionTitle}>Timeline</Text>
            <View>
              {data.events.map((e, i) => (
                <View key={i} style={S.eventRow}>
                  <Text style={S.eventTime}>{fdt(e.occurred_at)}</Text>
                  <Text style={S.eventDesc}>{e.description ?? e.event_type}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={S.footer} fixed>{BRANDING.systemName} · Zaire Field — Documento generado automáticamente</Text>
      </Page>
    </Document>
  );
}

export type { VisitPdfData };
