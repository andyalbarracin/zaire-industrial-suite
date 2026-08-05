// order-pdf-template.tsx — src/lib/pdf/order-pdf-template.tsx
// Template PDF RC 009-00 — Formulario de Orden de Trabajo

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EMPRESA_INFO } from "@/lib/constants";
import { BRANDING } from "@/lib/branding";
import { formatCurrency } from "@/lib/utils";
import type { Currency } from "@/lib/types/database";

interface CompanyInfo {
  nombre: string;
  cuit?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  email?: string | null;
  logo_url?: string | null;
  logo_use_in_pdfs?: boolean;
}

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, padding: 30, color: "#0F172A" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: "#0B2447" },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end", width: 120 },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0B2447", marginBottom: 2 },
  companyInfo: { fontSize: 7, color: "#64748B", marginTop: 1 },
  docCode: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  docVigencia: { fontSize: 7, color: "#64748B", marginTop: 1 },

  // Title row
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0B2447", padding: "6 10", marginBottom: 8, borderRadius: 3 },
  titleText: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  otNumber: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#A5D7E8" },

  // Info grid
  infoGrid: { flexDirection: "row", gap: 6, marginBottom: 10 },
  infoBox: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "5 7" },
  infoLabel: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#0F172A" },

  // Table
  tableWrap: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  tableHead: { flexDirection: "row", backgroundColor: "#0B2447", padding: "5 4" },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E8F0", padding: "4 4" },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  th: { color: "#FFFFFF", fontSize: 6.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  td: { fontSize: 7.5 },

  // Column widths
  cItem: { width: 20 },
  cCant: { width: 22 },
  cDesc: { flex: 1 },
  cCodigo: { width: 48 },
  cCodCliente: { width: 48 },
  cOrigen: { width: 42 },
  cFechaEnt: { width: 48 },
  cUnitario: { width: 48, textAlign: "right" },
  cTotal: { width: 52, textAlign: "right" },
  cRtoFac: { width: 28, textAlign: "center" },

  // Totals
  totalsRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  totalsBox: { width: 160, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "5 8" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { fontSize: 7.5, color: "#64748B" },
  totalValue: { fontSize: 7.5 },
  totalFinalLine: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.5, borderTopColor: "#0B2447", marginTop: 3, paddingTop: 4 },
  totalFinalLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  totalFinalValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0B2447" },

  // Footer control
  footerControl: { flexDirection: "row", gap: 8, marginBottom: 6 },
  checkBox: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 3, padding: "4 7" },
  checkLabel: { fontSize: 7.5, color: "#334155" },
  checkMark: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  notesBox: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "5 8", marginBottom: 8 },
  notesLabel: { fontSize: 6.5, color: "#94A3B8", textTransform: "uppercase", marginBottom: 3 },
  notesText: { fontSize: 7.5, color: "#475569" },

  // Page footer
  pageFooter: { position: "absolute", bottom: 18, left: 30, right: 30, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6.5, color: "#94A3B8" },
  // Logo: columna izquierda del header, ocupa el alto de los datos de empresa (~44pt)
  headerLogoCol: { marginRight: 8, justifyContent: "center" },
  logoImg: { height: 44, objectFit: "contain" },
});

interface OrderPdfProps {
  order: {
    order_number: string; order_type: string; status: string;
    date_in: string; date_due: string | null; currency: string;
    subtotal: number; total: number; general_notes: string | null; created_at: string;
    orden_compra?: string | null; remito_salida?: string | null;
    clients: {
      business_name: string; tax_id: string | null; contact_name: string | null;
      email: string | null; phone: string | null; client_code?: string | null;
    } | null;
  };
  items: Array<{
    item_number: number; quantity: number; custom_description: string | null;
    serial_number: string | null; equipment_number: string | null;
    additional_observation: string | null; unit_price: number; total_price: number;
    is_remitted?: boolean; is_invoiced?: boolean;
    origen_abastecimiento?: string | null;
    modelo?: string | null; marca?: string | null;
    medida?: string | null; unidad_medida?: string | null;
    products: { code: string | null; name: string; brand: string | null; } | null;
  }>;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: es });
}

export function OrderPdfDocument({ order, items, companyInfo }: OrderPdfProps & { companyInfo?: CompanyInfo | null }) {
  const co: CompanyInfo = companyInfo ?? {
    nombre: EMPRESA_INFO.nombre,
    cuit: EMPRESA_INFO.cuit,
    direccion: EMPRESA_INFO.direccion,
    ciudad: EMPRESA_INFO.ciudad,
    telefono: EMPRESA_INFO.telefono,
    email: EMPRESA_INFO.email,
    logo_url: null,
    logo_use_in_pdfs: false,
  };
  const currency = order.currency as Currency;
  const isOTS = order.order_type === "OTS";
  const allRemitted = items.length > 0 && items.every((i) => i.is_remitted);
  const allInvoiced = items.length > 0 && items.every((i) => i.is_invoiced);

  return (
    <Document>
      <Page size="A4" style={S.page} orientation="landscape">
        {/* Header */}
        <View style={S.header}>
          {/* Izquierda: [logo opcional] + datos empresa */}
          <View style={[S.headerLeft, { flexDirection: "row", alignItems: "flex-start" }]}>
            {co.logo_use_in_pdfs && co.logo_url && (
              <View style={S.headerLogoCol}>
                <Image src={co.logo_url} style={S.logoImg} />
              </View>
            )}
            <View>
              <Text style={S.companyName}>{co.nombre}</Text>
              {(co.direccion || co.ciudad) && (
                <Text style={S.companyInfo}>{[co.direccion, co.ciudad].filter(Boolean).join(" — ")}</Text>
              )}
              {(co.telefono || co.email) && (
                <Text style={S.companyInfo}>{[co.telefono, co.email].filter(Boolean).join(" · ")}</Text>
              )}
              {co.cuit && <Text style={S.companyInfo}>CUIT: {co.cuit}</Text>}
            </View>
          </View>
          {/* Derecha: siempre RC 009-00 + Vigencia */}
          <View style={S.headerRight}>
            <Text style={S.docCode}>RC 009-01</Text>
            <Text style={S.docVigencia}>Vigencia: 06/2026</Text>
          </View>
        </View>

        {/* Title row */}
        <View style={S.titleRow}>
          <Text style={S.titleText}>
            {isOTS ? "ORDEN DE TRABAJO DE SERVICIO" : "ORDEN DE TRABAJO"}
          </Text>
          <Text style={S.otNumber}>OT N°: {order.order_number}</Text>
        </View>

        {/* Info grid */}
        <View style={S.infoGrid}>
          <View style={S.infoBox}>
            <Text style={S.infoLabel}>Fecha</Text>
            <Text style={S.infoValue}>{fmtDate(order.date_in)}</Text>
          </View>
          <View style={[S.infoBox, { flex: 2 }]}>
            <Text style={S.infoLabel}>Cliente</Text>
            <Text style={S.infoValue}>{order.clients?.business_name ?? "—"}</Text>
          </View>
          <View style={S.infoBox}>
            <Text style={S.infoLabel}>OC N°</Text>
            <Text style={S.infoValue}>{order.orden_compra || "—"}</Text>
          </View>
          <View style={S.infoBox}>
            <Text style={S.infoLabel}>Remito Salida N°</Text>
            <Text style={S.infoValue}>{order.remito_salida || "—"}</Text>
          </View>
          <View style={S.infoBox}>
            <Text style={S.infoLabel}>Moneda</Text>
            <Text style={S.infoValue}>{currency} (sin IVA)</Text>
          </View>
        </View>

        {/* Items table */}
        <View style={S.tableWrap}>
          <View style={S.tableHead}>
            <Text style={[S.th, S.cItem]}>ITEM</Text>
            <Text style={[S.th, S.cCant]}>CANT</Text>
            <Text style={[S.th, S.cDesc]}>DESCRIPCION</Text>
            <Text style={[S.th, S.cCodigo]}>CÓDIGO</Text>
            <Text style={[S.th, S.cCodCliente]}>COD. CLIENTE</Text>
            <Text style={[S.th, S.cOrigen]}>PO/NP/STOCK</Text>
            <Text style={[S.th, S.cFechaEnt]}>F. ENTREGA</Text>
            <Text style={[S.th, S.cUnitario]}>$ UNIT.</Text>
            <Text style={[S.th, S.cTotal]}>$ TOTAL</Text>
            <Text style={[S.th, S.cRtoFac]}>RTO/FAC</Text>
          </View>
          {items.map((item, i) => {
            const rtoFac = item.is_remitted && item.is_invoiced ? "R/F"
              : item.is_remitted ? "R"
              : item.is_invoiced ? "F"
              : "—";
            return (
              <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                <Text style={[S.td, S.cItem]}>{item.item_number}</Text>
                <Text style={[S.td, S.cCant]}>{item.quantity}</Text>
                <Text style={[S.td, S.cDesc]}>
                  {item.products?.name ?? item.custom_description ?? "—"}
                  {item.marca ? `\nMarca: ${item.marca}` : ""}
                  {item.modelo ? `\nModelo: ${item.modelo}` : ""}
                  {item.serial_number ? `\nSerie: ${item.serial_number}` : ""}
                  {item.equipment_number ? `\nTAG: ${item.equipment_number}` : ""}
                  {item.medida ? `\nMedida: ${item.medida}${item.unidad_medida ? ` ${item.unidad_medida}` : ""}` : ""}
                </Text>
                <Text style={[S.td, S.cCodigo]}>{item.products?.code ?? "—"}</Text>
                <Text style={[S.td, S.cCodCliente]}>{order.clients?.client_code ?? "—"}</Text>
                <Text style={[S.td, S.cOrigen]}>{item.origen_abastecimiento ?? "—"}</Text>
                <Text style={[S.td, S.cFechaEnt]}>{fmtDate(order.date_due)}</Text>
                <Text style={[S.td, S.cUnitario]}>{formatCurrency(item.unit_price, currency)}</Text>
                <Text style={[S.td, S.cTotal]}>{formatCurrency(item.total_price, currency)}</Text>
                <Text style={[S.td, S.cRtoFac]}>{rtoFac}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={S.totalsRow}>
          <View style={S.totalsBox}>
            <View style={S.totalLine}>
              <Text style={S.totalLabel}>Subtotal</Text>
              <Text style={S.totalValue}>{formatCurrency(order.subtotal, currency)}</Text>
            </View>
            <View style={S.totalFinalLine}>
              <Text style={S.totalFinalLabel}>TOTAL</Text>
              <Text style={S.totalFinalValue}>{formatCurrency(order.total, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Control general */}
        <View style={S.footerControl}>
          <View style={S.checkBox}>
            <Text style={S.checkMark}>{allRemitted ? "✓" : "☐"}</Text>
            <Text style={S.checkLabel}>TODO REMITIDO</Text>
          </View>
          <View style={S.checkBox}>
            <Text style={S.checkMark}>{allInvoiced ? "✓" : "☐"}</Text>
            <Text style={S.checkLabel}>TODO FACTURADO</Text>
          </View>
        </View>

        {/* Observaciones */}
        <View style={S.notesBox}>
          <Text style={S.notesLabel}>Observaciones</Text>
          <Text style={S.notesText}>{order.general_notes ?? " "}</Text>
        </View>

        {/* Page footer */}
        <View style={S.pageFooter} fixed>
          <Text style={S.footerText}>Formulario RC009-01 — {BRANDING.systemName}</Text>
          <Text style={S.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</Text>
        </View>
      </Page>
    </Document>
  );
}
