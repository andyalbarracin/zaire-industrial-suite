// repair-pdf-template.tsx — src/lib/pdf/repair-pdf-template.tsx
// Template PDF RC 010-00 — Planilla de Reparación (una hoja por ítem)

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EMPRESA_INFO } from "@/lib/constants";
import { BRANDING } from "@/lib/branding";
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

const COMPONENTS = [
  "PISTA ROTATIVA INTERNA",
  "PISTA ESTACIONARIA INTERNA",
  "SPRING HOLDER",
  "RESORTES",
  "ELASTOMEROS INTERNOS",
  "PISTA ROTATIVA EXTERNA",
  "PISTA ESTACIONARIA EXTERNA",
  "ELASTOMEROS EXTERNOS",
  "SPRING HOLDER",
  "CAMISA",
  "COLLAR DE ARRASTRE",
  "BRIDA",
  "INSERTADA DE BRIDA",
  "ANILLO DE BOMBEO",
  "DEFLECTOR",
  "CLIPS CENTRADORES",
  "BRIDA AUXILIAR",
  "CAMISA AUXILIAR",
  "OTRO",
  "",
  "",
  "",
];

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, padding: 28, color: "#0F172A" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: "#0B2447" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0B2447", marginBottom: 2 },
  companyInfo: { fontSize: 6.5, color: "#64748B", marginTop: 1 },
  docCode: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0B2447" },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0B2447", marginTop: 2 },
  docVigencia: { fontSize: 6.5, color: "#64748B", marginTop: 1 },

  // Title bar
  titleBar: { backgroundColor: "#0B2447", padding: "4 10", marginBottom: 6, borderRadius: 3 },
  titleBarText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },

  // Data grid
  dataGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 6 },
  dataCell: { width: "31%", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 2, padding: "3 6" },
  dataCellWide: { width: "64%", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 2, padding: "3 6" },
  dataLabel: { fontSize: 6, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  dataValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0F172A" },

  // Components table
  sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#0B2447", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, marginTop: 4 },
  tableWrap: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  tableHead: { flexDirection: "row", backgroundColor: "#0B2447", padding: "3 4" },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E2E8F0", padding: "2.5 4" },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  th: { color: "#FFFFFF", fontSize: 6.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  td: { fontSize: 7.5, color: "#0F172A" },
  cItem: { flex: 1 },
  cMaterial: { width: 55, textAlign: "center" },
  cReparado: { width: 45, textAlign: "center" },
  cNuevo: { width: 45, textAlign: "center" },
  cCant: { width: 35, textAlign: "center" },

  // Pressure tests
  testsBox: { flexDirection: "row", gap: 6, marginBottom: 5 },
  testCard: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 3, padding: "4 8" },
  testLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#0B2447", marginBottom: 2 },
  testDetail: { fontSize: 7, color: "#475569", marginBottom: 3 },
  testAprobado: { flexDirection: "row", alignItems: "center", gap: 4 },
  testCheckbox: { fontSize: 9, color: "#0B2447" },
  testCheckLabel: { fontSize: 7.5 },

  // Notes — sin caja, solo título y línea para escritura manual
  notesArea: { flexDirection: "row", gap: 10, marginBottom: 6 },
  notesBlock: { flex: 1 },
  notesLabel: { fontSize: 6.5, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  notesLine: { borderBottomWidth: 1, borderBottomColor: "#CBD5E1", marginBottom: 6 },

  pageFooter: { position: "absolute", bottom: 16, left: 28, right: 28, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 4, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6, color: "#94A3B8" },
});

export interface RepairItem {
  item_number: number;
  quantity: number;
  custom_description: string | null;
  serial_number: string | null;
  modelo: string | null;
  marca: string | null;
  medida: string | null;
  unidad_medida: "MM" | "PULG" | null;
  materiales_caras: string | null;
  materiales_orings: string | null;
  products: { code: string | null; name: string; brand: string | null; model: string | null; } | null;
}

export interface RepairPdfProps {
  order: {
    order_number: string;
    date_in: string;
    currency: string;
    remito_salida?: string | null;
    clients: { business_name: string; client_code?: string | null; } | null;
  };
  items: RepairItem[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: es });
}

function ItemPage({ order, item, co }: { order: RepairPdfProps["order"]; item: RepairItem; co: CompanyInfo }) {
  const nombre = item.products?.name ?? item.custom_description ?? "Sin descripción";
  const marca = item.marca ?? item.products?.brand ?? "—";
  const modelo = item.modelo ?? item.products?.model ?? "—";
  const medida = item.medida ? `${item.medida} ${item.unidad_medida ?? ""}`.trim() : "—";
  const materiales = [item.materiales_caras, item.materiales_orings].filter(Boolean).join(" / ") || "—";
  const today = format(new Date(), "dd/MM/yyyy", { locale: es });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _currency = order.currency as Currency;

  return (
    <Page size="A4" style={S.page}>
      {/* Header */}
      <View style={S.header}>
        {/* Izquierda: [logo opcional] + datos empresa */}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start" }}>
          {co.logo_use_in_pdfs && co.logo_url && (
            <View style={{ marginRight: 8, justifyContent: "center" }}>
              <Image src={co.logo_url} style={{ height: 40, objectFit: "contain" }} />
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
          </View>
        </View>
        {/* Derecha: siempre RC 010-00 + título + Vigencia */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={S.docCode}>RC 010-00</Text>
          <Text style={S.docTitle}>PLANILLA DE REPARACIÓN</Text>
          <Text style={S.docVigencia}>Vigencia: {today}</Text>
        </View>
      </View>

      {/* Title bar */}
      <View style={S.titleBar}>
        <Text style={S.titleBarText}>OT N°: {order.order_number} — Ítem {item.item_number}: {nombre}</Text>
      </View>

      {/* Data grid */}
      <View style={S.dataGrid}>
        <View style={S.dataCellWide}>
          <Text style={S.dataLabel}>Cliente</Text>
          <Text style={S.dataValue}>{order.clients?.business_name ?? "—"}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Fecha</Text>
          <Text style={S.dataValue}>{fmtDate(order.date_in)}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Marca</Text>
          <Text style={S.dataValue}>{marca}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Modelo</Text>
          <Text style={S.dataValue}>{modelo}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Medida</Text>
          <Text style={S.dataValue}>{medida}</Text>
        </View>
        <View style={S.dataCellWide}>
          <Text style={S.dataLabel}>Combinación de Materiales</Text>
          <Text style={S.dataValue}>{materiales}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Código de Cliente</Text>
          <Text style={S.dataValue}>{order.clients?.client_code ?? "—"}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>N° de Serie</Text>
          <Text style={S.dataValue}>{item.serial_number ?? "—"}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Salida N°</Text>
          <Text style={S.dataValue}>{order.remito_salida ?? "—"}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>OT N°</Text>
          <Text style={S.dataValue}>{order.order_number}</Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Fecha para Cotizar</Text>
          <Text style={S.dataValue}> </Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Fecha Cotización</Text>
          <Text style={S.dataValue}> </Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Fecha OC</Text>
          <Text style={S.dataValue}> </Text>
        </View>
        <View style={S.dataCell}>
          <Text style={S.dataLabel}>Fecha Finalizado</Text>
          <Text style={S.dataValue}> </Text>
        </View>
      </View>

      {/* Components table */}
      <Text style={S.sectionTitle}>Componentes del sello</Text>
      <View style={S.tableWrap}>
        <View style={S.tableHead}>
          <Text style={[S.th, S.cItem]}>ITEM</Text>
          <Text style={[S.th, S.cMaterial]}>MATERIAL</Text>
          <Text style={[S.th, S.cReparado]}>REPARADO</Text>
          <Text style={[S.th, S.cNuevo]}>NUEVO</Text>
          <Text style={[S.th, S.cCant]}>CANT</Text>
        </View>
        {COMPONENTS.map((comp, i) => (
          <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={[S.td, S.cItem]}>{comp}</Text>
            <Text style={[S.td, S.cMaterial]}> </Text>
            <Text style={[S.td, S.cReparado]}> </Text>
            <Text style={[S.td, S.cNuevo]}> </Text>
            <Text style={[S.td, S.cCant]}> </Text>
          </View>
        ))}
      </View>

      {/* Pressure tests */}
      <View style={S.testsBox}>
        <View style={S.testCard}>
          <Text style={S.testLabel}>PRUEBA NEUMÁTICA</Text>
          <Text style={S.testDetail}>25 a 30 (indicar) PSI / 8 MIN</Text>
          <View style={S.testAprobado}>
            <Text style={S.testCheckbox}>☐</Text>
            <Text style={S.testCheckLabel}>APROBADO</Text>
          </View>
        </View>
        <View style={S.testCard}>
          <Text style={S.testLabel}>PRUEBA HIDRÁULICA</Text>
          <Text style={S.testDetail}>8 BAR / 5 MIN</Text>
          <View style={S.testAprobado}>
            <Text style={S.testCheckbox}>☐</Text>
            <Text style={S.testCheckLabel}>APROBADO</Text>
          </View>
        </View>
      </View>

      {/* Notes — solo títulos con líneas para escritura manual */}
      <View style={S.notesArea}>
        <View style={S.notesBlock}>
          <Text style={S.notesLabel}>Observaciones</Text>
          <View style={S.notesLine} />
          <View style={S.notesLine} />
        </View>
        <View style={S.notesBlock}>
          <Text style={S.notesLabel}>Notas adicionales</Text>
          <View style={S.notesLine} />
          <View style={S.notesLine} />
        </View>
      </View>

      {/* Page footer */}
      <View style={S.pageFooter} fixed>
        <Text style={S.footerText}>Formulario RC010-00 — {BRANDING.systemName}</Text>
        <Text style={S.footerText}>Generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</Text>
      </View>
    </Page>
  );
}

export function RepairPdfDocument({ order, items, companyInfo }: RepairPdfProps & { companyInfo?: CompanyInfo | null }) {
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
  return (
    <Document>
      {items.map((item, i) => (
        <ItemPage key={i} order={order} item={item} co={co} />
      ))}
    </Document>
  );
}
