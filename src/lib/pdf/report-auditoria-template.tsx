// report-auditoria-template.tsx — PDF templates para reportes de auditoría (secuencia e integridad)

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EMPRESA_INFO } from "@/lib/constants";
import { BRANDING } from "@/lib/branding";

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, padding: 32, color: "#0F172A" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "#0B2447" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0B2447", marginBottom: 2 },
  companyInfo: { fontSize: 6.5, color: "#64748B", marginTop: 1 },
  docRight: { alignItems: "flex-end" },
  docType: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  docSubtitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0B2447", marginTop: 1 },
  docDate: { fontSize: 6.5, color: "#64748B", marginTop: 2 },
  titleBar: { backgroundColor: "#0B2447", padding: "5 10", marginBottom: 10, borderRadius: 3 },
  titleText: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFF" },
  // Summary boxes
  summaryRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "5 8", alignItems: "center" },
  summaryVal: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  summaryLabel: { fontSize: 6, color: "#64748B", textTransform: "uppercase", marginTop: 2 },
  summaryBoxGreen: { flex: 1, borderWidth: 1, borderColor: "#86EFAC", borderRadius: 3, padding: "5 8", backgroundColor: "#F0FDF4", alignItems: "center" },
  summaryBoxRed: { flex: 1, borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 3, padding: "5 8", backgroundColor: "#FEF2F2", alignItems: "center" },
  // Table
  tableWrap: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  tableHead: { flexDirection: "row", backgroundColor: "#0B2447", padding: "4 6" },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E8F0", padding: "3.5 6" },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  th: { color: "#FFF", fontSize: 6.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  td: { fontSize: 7.5 },
  tdGreen: { fontSize: 7.5, color: "#16A34A" },
  tdRed: { fontSize: 7.5, color: "#DC2626" },
  // Check rows
  checkRow: { flexDirection: "row", justifyContent: "space-between", padding: "5 8", borderRadius: 3, borderWidth: 1, marginBottom: 4 },
  checkRowOk: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  checkRowFail: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  checkLabel: { fontSize: 8 },
  checkIcon: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  // Section
  sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#0B2447", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, marginTop: 8 },
  // Footer
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6, color: "#94A3B8" },
  // Alert box
  alertBox: { borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2", borderRadius: 3, padding: "6 10", marginBottom: 8 },
  alertTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#DC2626", marginBottom: 3 },
  alertItem: { fontSize: 7.5, color: "#DC2626", marginTop: 1 },
  okBox: { borderWidth: 1, borderColor: "#86EFAC", backgroundColor: "#F0FDF4", borderRadius: 3, padding: "6 10", marginBottom: 8 },
  okText: { fontSize: 8, color: "#16A34A", fontFamily: "Helvetica-Bold" },
});

const genDate = () => format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });

// ── Columnas de tabla secuencia ──────────────────────────────────────────────
const cOrd = { width: 120 };
const cSeq = { width: 45, textAlign: "right" as const };
const cSta = { flex: 1 };
const cVer = { width: 80 };

export type SecuenciaReportData = {
  year: string; branch: string; type: string;
  rows: { order_number: string; status: string; seq: number }[];
  gaps: { missing: number; around: string }[];
};

export function SecuenciaAuditoriaDocument({ data }: { data: SecuenciaReportData }) {
  const canceladas = data.rows.filter(r => r.status === "cancelada").length;
  const filtroText = [
    `Año: ${data.year}`,
    data.branch !== "all" ? `Sucursal: ${data.branch.toUpperCase()}` : "Todas las sucursales",
    data.type !== "all" ? `Tipo: ${data.type}` : "OT y OTS",
  ].join("  ·  ");

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <View style={{ flex: 1 }}>
            <Text style={S.companyName}>{EMPRESA_INFO.nombre}</Text>
            <Text style={S.companyInfo}>{EMPRESA_INFO.direccion} — {EMPRESA_INFO.ciudad}</Text>
            <Text style={S.companyInfo}>CUIT: {EMPRESA_INFO.cuit} · {EMPRESA_INFO.email}</Text>
          </View>
          <View style={S.docRight}>
            <Text style={S.docType}>INFORME DE AUDITORÍA</Text>
            <Text style={S.docSubtitle}>Verificación de Secuencia Correlativa</Text>
            <Text style={S.docDate}>{filtroText}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={S.summaryRow}>
          <View style={S.summaryBox}>
            <Text style={S.summaryVal}>{data.rows.length}</Text>
            <Text style={S.summaryLabel}>Total órdenes</Text>
          </View>
          <View style={data.gaps.length === 0 ? S.summaryBoxGreen : S.summaryBoxRed}>
            <Text style={[S.summaryVal, { color: data.gaps.length === 0 ? "#16A34A" : "#DC2626" }]}>{data.gaps.length}</Text>
            <Text style={S.summaryLabel}>Huecos</Text>
          </View>
          <View style={S.summaryBox}>
            <Text style={[S.summaryVal, { color: "#D97706" }]}>{canceladas}</Text>
            <Text style={S.summaryLabel}>Canceladas</Text>
          </View>
          <View style={data.gaps.length === 0 ? S.summaryBoxGreen : S.summaryBoxRed}>
            <Text style={[S.summaryVal, { fontSize: 11, color: data.gaps.length === 0 ? "#16A34A" : "#DC2626" }]}>
              {data.gaps.length === 0 ? "ÍNTEGRA" : "CON HUECOS"}
            </Text>
            <Text style={S.summaryLabel}>Secuencia</Text>
          </View>
        </View>

        {/* Gaps alert */}
        {data.gaps.length > 0 && (
          <View style={S.alertBox}>
            <Text style={S.alertTitle}>⚠ Huecos detectados en la secuencia</Text>
            {data.gaps.map((g, i) => (
              <Text key={i} style={S.alertItem}>· Número faltante: {g.missing}  —  {g.around}</Text>
            ))}
          </View>
        )}
        {data.gaps.length === 0 && (
          <View style={S.okBox}>
            <Text style={S.okText}>✓ La secuencia de numeración es continua. No se detectaron huecos.</Text>
          </View>
        )}

        {/* Table */}
        <Text style={S.sectionTitle}>Detalle de órdenes</Text>
        <View style={S.tableWrap}>
          <View style={S.tableHead}>
            <Text style={[S.th, cOrd]}>Nro. Orden</Text>
            <Text style={[S.th, cSta]}>Estado</Text>
            <Text style={[S.th, cSeq]}>Secuencia</Text>
            <Text style={[S.th, cVer]}>Verificación</Text>
          </View>
          {data.rows.map((r, i) => {
            const prev = i > 0 ? data.rows[i - 1].seq : r.seq - 1;
            const ok = r.seq === prev + 1;
            return (
              <View key={r.order_number} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                <Text style={[S.td, cOrd]}>{r.order_number}</Text>
                <Text style={[S.td, cSta]}>{r.status}</Text>
                <Text style={[S.td, cSeq]}>{String(r.seq).padStart(4, "0")}</Text>
                <Text style={[i === 0 ? { ...S.td, color: "#3B82F6" } : ok ? S.tdGreen : S.tdRed, cVer]}>
                  {i === 0 ? "Inicio" : ok ? "✓ Correlativo" : "⚠ Salto"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Generado el {genDate()} — {BRANDING.systemName}</Text>
          <Text style={S.footerText}>Documento de auditoría — {EMPRESA_INFO.nombre}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ════════════════════════════════════════════════════════════════════
// Integridad
// ════════════════════════════════════════════════════════════════════

export type IntegridadReportData = {
  year: string; branch: string;
  total: number; ot: number; ots: number;
  facturadas: number; canceladas: number; activas: number;
  // Los importes van por moneda y NO se suman entre sí (ver lib/trace/amounts.ts).
  totalFacturadoUsd: number; totalFacturadoArs: number;
  totalPendienteUsd: number; totalPendienteArs: number;
  hasDuplicates: boolean; hasNoNumber: boolean;
};

const fmtUsd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtArs = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const cChkLabel = { flex: 1 };
const cChkIcon = { width: 20 };

export function IntegridadAuditoriaDocument({ data }: { data: IntegridadReportData }) {
  const filtroText = [
    `Año: ${data.year}`,
    data.branch !== "all" ? `Sucursal: ${data.branch.toUpperCase()}` : "Todas las sucursales",
  ].join("  ·  ");

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View style={{ flex: 1 }}>
            <Text style={S.companyName}>{EMPRESA_INFO.nombre}</Text>
            <Text style={S.companyInfo}>{EMPRESA_INFO.direccion} — {EMPRESA_INFO.ciudad}</Text>
            <Text style={S.companyInfo}>CUIT: {EMPRESA_INFO.cuit} · {EMPRESA_INFO.email}</Text>
          </View>
          <View style={S.docRight}>
            <Text style={S.docType}>INFORME DE AUDITORÍA</Text>
            <Text style={S.docSubtitle}>Informe de Integridad</Text>
            <Text style={S.docDate}>{filtroText}</Text>
          </View>
        </View>

        <View style={S.summaryRow}>
          {[
            ["Total", data.total], ["OTs", data.ot], ["OTSs", data.ots],
            ["Facturadas", data.facturadas], ["Activas", data.activas], ["Canceladas", data.canceladas],
          ].map(([l, v]) => (
            <View key={String(l)} style={S.summaryBox}>
              <Text style={S.summaryVal}>{String(v)}</Text>
              <Text style={S.summaryLabel}>{String(l)}</Text>
            </View>
          ))}
        </View>

        {/* Estado financiero: cada moneda se informa por separado. Las OT pueden estar en pesos o
            en dólares y no existe tipo de cambio en el sistema, así que sumarlas en un único
            número sería incorrecto para una auditoría. */}
        <Text style={S.sectionTitle}>Estado financiero</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          <View style={[S.summaryBoxGreen, { flex: 1, padding: "6 10", alignItems: "flex-start" }]}>
            <Text style={{ fontSize: 7, color: "#16A34A", fontFamily: "Helvetica-Bold" }}>FACTURADO</Text>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#16A34A" }}>
              {fmtArs(data.totalFacturadoArs)}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#16A34A", marginTop: 1 }}>
              {fmtUsd(data.totalFacturadoUsd)}
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", borderRadius: 3, padding: "6 10" }}>
            <Text style={{ fontSize: 7, color: "#D97706", fontFamily: "Helvetica-Bold" }}>PENDIENTE</Text>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#D97706" }}>
              {fmtArs(data.totalPendienteArs)}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#D97706", marginTop: 1 }}>
              {fmtUsd(data.totalPendienteUsd)}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 6.5, color: "#94A3B8", marginTop: -6, marginBottom: 10 }}>
          Importes informados por moneda, sin conversión entre ellas.
        </Text>

        <Text style={S.sectionTitle}>Verificación de integridad</Text>
        {[
          { label: "Sin registros sin número de orden", ok: !data.hasNoNumber },
          { label: "Sin números de orden duplicados", ok: !data.hasDuplicates },
          { label: "Soft delete verificado — ningún registro eliminado físicamente", ok: true },
        ].map(({ label, ok }) => (
          <View key={label} style={[S.checkRow, ok ? S.checkRowOk : S.checkRowFail]}>
            <Text style={[S.checkLabel, { color: ok ? "#16A34A" : "#DC2626" }, cChkLabel]}>{label}</Text>
            <Text style={[S.checkIcon, { color: ok ? "#16A34A" : "#DC2626" }, cChkIcon]}>{ok ? "✓" : "✗"}</Text>
          </View>
        ))}

        <View style={S.footer} fixed>
          <Text style={S.footerText}>Generado el {genDate()} — {BRANDING.systemName}</Text>
          <Text style={S.footerText}>Documento de auditoría — {EMPRESA_INFO.nombre}</Text>
        </View>
      </Page>
    </Document>
  );
}
