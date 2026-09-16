// report-trazabilidad-template.tsx — PDF de trazabilidad completa de una orden (para auditoría)

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EMPRESA_INFO } from "@/lib/constants";
import { BRANDING } from "@/lib/branding";
import { resolveAmount } from "@/lib/trace/amounts";
import type { Currency } from "@/lib/types/database";

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, padding: 32, color: "#0F172A" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "#0B2447" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0B2447", marginBottom: 2 },
  companyInfo: { fontSize: 6.5, color: "#64748B", marginTop: 1 },
  docRight: { alignItems: "flex-end" },
  docType: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  docOrder: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0B2447", marginTop: 2 },
  docDate: { fontSize: 6.5, color: "#64748B", marginTop: 2 },
  sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#0B2447", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5, marginTop: 10 },
  grid2: { flexDirection: "row", gap: 6, marginBottom: 8 },
  box: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "5 8" },
  boxLabel: { fontSize: 6, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  boxVal: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  // Items table
  tableWrap: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  tableHead: { flexDirection: "row", backgroundColor: "#0B2447", padding: "4 4" },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E8F0", padding: "3.5 4" },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  th: { color: "#FFF", fontSize: 6, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  td: { fontSize: 7 },
  // Status badges
  badgeGreen: { backgroundColor: "#D1FAE5", borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1 },
  badgeRed: { backgroundColor: "#FEE2E2", borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1 },
  // Timeline
  timelineDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#0B2447", marginTop: 2.5, marginRight: 6 },
  timelineItem: { flexDirection: "row", marginBottom: 5 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  timelineMeta: { fontSize: 6.5, color: "#64748B", marginTop: 1 },
  // Audit log table cols
  colDate: { width: 90 },
  colUser: { width: 80 },
  colAction: { width: 55 },
  colDesc: { flex: 1 },
  // Items table cols
  cNum: { width: 18 },
  cDesc: { flex: 1 },
  cSerie: { width: 55 },
  cMarca: { width: 45 },
  cPrice: { width: 45, textAlign: "right" as const },
  cTotal: { width: 50, textAlign: "right" as const },
  cState: { width: 42 },
  // Footer
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6, color: "#94A3B8" },
});

const genDate = () => format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
const fmtDate = (d: string | null) => d ? format(new Date(d), "dd/MM/yyyy", { locale: es }) : "—";
const fmtDateTime = (d: string) => format(new Date(d), "dd/MM/yyyy HH:mm", { locale: es });

export type TrazabilidadReportData = {
  order: {
    order_number: string; order_type: string; status: string;
    date_in: string; date_due: string | null; currency: string;
    total: number; total_ars?: number; branch_code: string; general_notes: string | null;
    client_name: string; client_tax_id: string | null;
    client_code: string | null; client_contact: string | null;
  };
  items: Array<{
    item_number: number; quantity: number;
    description: string; serial_number: string | null;
    equipment_number: string | null; marca: string | null; medida: string | null;
    unit_price: number; total_price: number;
    unit_price_ars?: number; total_price_ars?: number;
    is_quoted: boolean; is_remitted: boolean; is_delivered: boolean; is_invoiced: boolean;
  }>;
  history: Array<{
    old_status: string | null; new_status: string;
    notes: string | null; created_at: string; user_name: string;
  }>;
  audit: Array<{
    action: string; description: string | null;
    user_name: string | null; created_at: string;
  }>;
};

function fmtPrice(amount: number, currency: string) {
  if (currency === "USD") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

export function TrazabilidadDocument({ data }: { data: TrazabilidadReportData }) {
  const { order, items, history, audit } = data;

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
            <Text style={S.docType}>INFORME DE AUDITORÍA — TRAZABILIDAD</Text>
            <Text style={S.docOrder}>{order.order_number}</Text>
            <Text style={S.docDate}>{order.order_type} · {order.branch_code} · Estado: {order.status}</Text>
          </View>
        </View>

        {/* Datos generales */}
        <Text style={S.sectionTitle}>Datos generales</Text>
        <View style={S.grid2}>
          {[["Nro. Orden", order.order_number], ["Tipo", order.order_type], ["Estado", order.status], ["Sucursal", order.branch_code]].map(([l, v]) => (
            <View key={l} style={S.box}>
              <Text style={S.boxLabel}>{l}</Text><Text style={S.boxVal}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={S.grid2}>
          {[["Fecha ingreso", fmtDate(order.date_in)], ["Vencimiento", fmtDate(order.date_due)], ["Moneda", order.currency], ["Total", (() => { const t = resolveAmount(order.total, order.total_ars ?? 0, order.currency as Currency); return fmtPrice(t.amount, t.currency); })()]].map(([l, v]) => (
            <View key={l} style={S.box}>
              <Text style={S.boxLabel}>{l}</Text><Text style={S.boxVal}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Cliente */}
        <Text style={S.sectionTitle}>Cliente</Text>
        <View style={S.grid2}>
          {[
            ["Razón social", order.client_name],
            ["CUIT", order.client_tax_id ?? "—"],
            ["Código cliente", order.client_code ?? "—"],
            ["Contacto", order.client_contact ?? "—"],
          ].map(([l, v]) => (
            <View key={l} style={S.box}>
              <Text style={S.boxLabel}>{l}</Text><Text style={S.boxVal}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Ítems */}
        <Text style={S.sectionTitle}>Ítems ({items.length})</Text>
        <View style={S.tableWrap}>
          <View style={S.tableHead}>
            <Text style={[S.th, S.cNum]}>#</Text>
            <Text style={[S.th, S.cDesc]}>Descripción</Text>
            <Text style={[S.th, S.cSerie]}>Serie / TAG</Text>
            <Text style={[S.th, S.cMarca]}>Marca</Text>
            <Text style={[S.th, S.cPrice]}>P. Unit.</Text>
            <Text style={[S.th, S.cTotal]}>Total</Text>
            <Text style={[S.th, S.cState]}>C/R/E/F</Text>
          </View>
          {items.map((it, i) => {
            // Importes en la moneda que corresponda (la orden puede estar cargada en ARS o en USD).
            const unit = resolveAmount(it.unit_price, it.unit_price_ars ?? 0, order.currency as Currency);
            const line = resolveAmount(it.total_price, it.total_price_ars ?? 0, order.currency as Currency);
            return (
            <View key={it.item_number} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
              <Text style={[S.td, S.cNum]}>{it.item_number}</Text>
              <Text style={[S.td, S.cDesc]}>{it.description}</Text>
              <Text style={[S.td, S.cSerie]}>{it.serial_number ?? "—"}{it.equipment_number ? ` / ${it.equipment_number}` : ""}</Text>
              <Text style={[S.td, S.cMarca]}>{it.marca ?? "—"}</Text>
              <Text style={[S.td, S.cPrice]}>{fmtPrice(unit.amount, unit.currency)}</Text>
              <Text style={[S.td, S.cTotal]}>{fmtPrice(line.amount, line.currency)}</Text>
              <Text style={[S.td, S.cState]}>
                {[it.is_quoted ? "✓" : "✗", it.is_remitted ? "✓" : "✗", it.is_delivered ? "✓" : "✗", it.is_invoiced ? "✓" : "✗"].join(" ")}
              </Text>
            </View>
            );
          })}
        </View>

        {/* Timeline */}
        <Text style={S.sectionTitle}>Timeline de estados ({history.length})</Text>
        {history.map((h, i) => (
          <View key={i} style={S.timelineItem}>
            <View style={S.timelineDot} />
            <View style={S.timelineContent}>
              <Text style={S.timelineTitle}>
                {h.old_status ? `${h.old_status} → ` : ""}{h.new_status}
                {h.notes ? `  —  "${h.notes}"` : ""}
              </Text>
              <Text style={S.timelineMeta}>{h.user_name} · {fmtDateTime(h.created_at)}</Text>
            </View>
          </View>
        ))}

        {/* Audit log */}
        {audit.length > 0 && (
          <>
            <Text style={S.sectionTitle}>Historial de modificaciones ({audit.length})</Text>
            <View style={S.tableWrap}>
              <View style={S.tableHead}>
                <Text style={[S.th, S.colDate]}>Fecha</Text>
                <Text style={[S.th, S.colUser]}>Usuario</Text>
                <Text style={[S.th, S.colAction]}>Acción</Text>
                <Text style={[S.th, S.colDesc]}>Descripción</Text>
              </View>
              {audit.map((a, i) => (
                <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                  <Text style={[S.td, S.colDate]}>{fmtDateTime(a.created_at)}</Text>
                  <Text style={[S.td, S.colUser]}>{a.user_name ?? "Sistema"}</Text>
                  <Text style={[S.td, S.colAction]}>{a.action}</Text>
                  <Text style={[S.td, S.colDesc]}>{a.description ?? "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Generado el {genDate()} — {BRANDING.systemName}</Text>
          <Text style={S.footerText}>Documento de auditoría — {EMPRESA_INFO.nombre}</Text>
        </View>
      </Page>
    </Document>
  );
}
