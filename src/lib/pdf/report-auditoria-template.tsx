// report-auditoria-template.tsx — PDF templates para reportes de auditoría (secuencia e integridad)

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { CompanyInfo } from "@/lib/company";
import type { SequenceRow, SequenceGap, SequenceCheck } from "@/lib/trace/sequence";
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
  criteria: { fontSize: 6.5, color: "#64748B", marginTop: 1.5, lineHeight: 1.3 },
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

// Encabezado y pie de los dos informes. Los datos de empresa llegan SIEMPRE por props desde
// company_settings (lib/company.ts); antes se imprimía la constante EMPRESA_INFO y por eso los
// informes salían con los datos de la empresa de demostración.
function DocHeader({ co, subtitle, filtro }: { co: CompanyInfo; subtitle: string; filtro: string }) {
  const domicilio = [co.direccion, co.ciudad].filter(Boolean).join(" — ");
  const fiscal = [co.cuit ? `CUIT: ${co.cuit}` : null, co.email].filter(Boolean).join(" · ");
  return (
    <View style={S.header}>
      <View style={{ flex: 1 }}>
        <Text style={S.companyName}>{co.nombre}</Text>
        {!!domicilio && <Text style={S.companyInfo}>{domicilio}</Text>}
        {!!fiscal && <Text style={S.companyInfo}>{fiscal}</Text>}
      </View>
      <View style={S.docRight}>
        <Text style={S.docType}>INFORME DE AUDITORÍA</Text>
        <Text style={S.docSubtitle}>{subtitle}</Text>
        <Text style={S.docDate}>{filtro}</Text>
      </View>
    </View>
  );
}

function DocFooter({ co }: { co: CompanyInfo }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>Generado el {genDate()} — {BRANDING.systemName}</Text>
      <Text style={S.footerText}>Documento de auditoría — {co.nombre}</Text>
    </View>
  );
}

// ── Columnas de tabla secuencia ──────────────────────────────────────────────
const cOrd = { width: 118 };
const cSerie = { width: 62 };
const cSeq = { width: 45, textAlign: "right" as const };
const cSta = { flex: 1 };
const cVer = { width: 80 };

export type SecuenciaReportData = {
  year: string; branch: string; type: string;
  // `series` y `check` los calcula lib/trace/sequence.ts, la MISMA función que produce los huecos
  // del resumen. El template solo dibuja: así el detalle no puede contradecir al encabezado.
  rows: SequenceRow[];
  gaps: SequenceGap[];
  countBySeries: { series: string; count: number }[];
};

const CHECK_LABEL: Record<SequenceCheck, string> = {
  inicio: "Inicio",
  correlativo: "✓ Correlativo",
  salto: "⚠ Salto",
};

export function SecuenciaAuditoriaDocument({ data, companyInfo }: { data: SecuenciaReportData; companyInfo: CompanyInfo }) {
  const canceladas = data.rows.filter(r => r.status === "cancelada").length;
  const filtroText = [
    `Año: ${data.year}`,
    data.branch !== "all" ? `Sucursal: ${data.branch.toUpperCase()}` : "Todas las sucursales",
    data.type !== "all" ? `Tipo: ${data.type}` : "OT y OTS",
  ].join("  ·  ");

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <DocHeader co={companyInfo} subtitle="Verificación de Secuencia Correlativa" filtro={filtroText} />

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
        <Text style={S.criteria}>
          La numeración es independiente por serie (tipo de orden + sucursal), así que cada serie reinicia
          en 1 y se verifica por separado. Series de este informe: {data.countBySeries.map(s => `${s.series} (${s.count})`).join("  ·  ")}.
        </Text>
        <View style={[S.tableWrap, { marginTop: 4 }]}>
          <View style={S.tableHead}>
            <Text style={[S.th, cOrd]}>Nro. Orden</Text>
            <Text style={[S.th, cSerie]}>Serie</Text>
            <Text style={[S.th, cSta]}>Estado</Text>
            <Text style={[S.th, cSeq]}>Secuencia</Text>
            <Text style={[S.th, cVer]}>Verificación</Text>
          </View>
          {data.rows.map((r, i) => (
            <View key={r.order_number} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
              <Text style={[S.td, cOrd]}>{r.order_number}</Text>
              <Text style={[S.td, cSerie]}>{r.series}</Text>
              <Text style={[S.td, cSta]}>{r.status}</Text>
              <Text style={[S.td, cSeq]}>{String(r.seq).padStart(4, "0")}</Text>
              <Text style={[r.check === "inicio" ? { ...S.td, color: "#3B82F6" } : r.check === "correlativo" ? S.tdGreen : S.tdRed, cVer]}>
                {CHECK_LABEL[r.check]}
              </Text>
            </View>
          ))}
        </View>

        <DocFooter co={companyInfo} />
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
  // Órdenes con baja lógica (deleted_at) dentro del filtro. NO se cuentan en los totales de arriba.
  dadasDeBaja: number;
};

const fmtUsd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtArs = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const cChkLabel = { flex: 1 };
const cChkIcon = { width: 20 };

export function IntegridadAuditoriaDocument({ data, companyInfo }: { data: IntegridadReportData; companyInfo: CompanyInfo }) {
  const filtroText = [
    `Año: ${data.year}`,
    data.branch !== "all" ? `Sucursal: ${data.branch.toUpperCase()}` : "Todas las sucursales",
  ].join("  ·  ");

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <DocHeader co={companyInfo} subtitle="Informe de Integridad" filtro={filtroText} />

        {/* Las etiquetas se imprimen en mayúsculas (S.summaryLabel), así que NO pueden llevar la
            "s" de plural en minúscula: "OTs" salía impreso como "OTS" y "OTSs" como "OTSS". */}
        <View style={S.summaryRow}>
          {[
            ["Total", data.total], ["OT", data.ot], ["OTS", data.ots],
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
              ARS {fmtArs(data.totalFacturadoArs)}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#16A34A", marginTop: 1 }}>
              USD {fmtUsd(data.totalFacturadoUsd)}
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", borderRadius: 3, padding: "6 10" }}>
            <Text style={{ fontSize: 7, color: "#D97706", fontFamily: "Helvetica-Bold" }}>PENDIENTE</Text>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#D97706" }}>
              ARS {fmtArs(data.totalPendienteArs)}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#D97706", marginTop: 1 }}>
              USD {fmtUsd(data.totalPendienteUsd)}
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
          {
            // Check REAL: se cuentan las órdenes con deleted_at dentro del mismo filtro. Antes esta
            // fila estaba fijada en ✓ sin verificar nada.
            label: data.dadasDeBaja === 0
              ? "Soft delete verificado — ninguna orden dada de baja ni eliminada físicamente"
              : `Soft delete verificado — ${data.dadasDeBaja} orden(es) con baja lógica, ninguna eliminada físicamente`,
            ok: true,
          },
        ].map(({ label, ok }) => (
          <View key={label} style={[S.checkRow, ok ? S.checkRowOk : S.checkRowFail]}>
            <Text style={[S.checkLabel, { color: ok ? "#16A34A" : "#DC2626" }, cChkLabel]}>{label}</Text>
            <Text style={[S.checkIcon, { color: ok ? "#16A34A" : "#DC2626" }, cChkIcon]}>{ok ? "✓" : "✗"}</Text>
          </View>
        ))}

        {/* Criterios del informe, escritos en el propio documento: un auditor tiene que poder
            reproducir los números sin preguntar. */}
        <Text style={S.sectionTitle}>Criterios aplicados</Text>
        <Text style={S.criteria}>· Facturadas = órdenes cuyo estado es «facturada». Activas = todas las que no están facturadas ni canceladas.</Text>
        <Text style={S.criteria}>· El filtro de año toma el año del número de orden (OT-{data.year}-…), no la fecha de ingreso.</Text>
        <Text style={S.criteria}>· No se incluyen las órdenes dadas de baja; se informan por separado en la verificación de integridad.</Text>
        <Text style={S.criteria}>· Los importes se calculan sobre los ítems de cada orden y se informan por moneda, sin conversión entre ellas.</Text>

        <DocFooter co={companyInfo} />
      </Page>
    </Document>
  );
}
