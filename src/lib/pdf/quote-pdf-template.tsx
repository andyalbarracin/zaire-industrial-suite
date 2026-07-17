// quote-pdf-template.tsx — src/lib/pdf/quote-pdf-template.tsx — 2026-07-17
// PDF de cotización (cara al cliente): NO muestra costo ni margen (datos internos).

import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { BRANDING } from "@/lib/branding";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function money(n: number, currency: string): string {
  const locale = currency === "USD" ? "en-US" : "es-AR";
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(n) || 0);
}

const NAVY = "#1e293b";
const BORDER = "#e2e8f0";
const MUTED = "#64748b";

const s = StyleSheet.create({
  page: { padding: 34, fontSize: 9, color: "#0f172a", fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: NAVY, paddingBottom: 10, marginBottom: 12 },
  company: { fontSize: 14, fontWeight: "bold", color: NAVY },
  companyLine: { fontSize: 8, color: MUTED, marginTop: 2 },
  docTitle: { fontSize: 16, fontWeight: "bold", color: NAVY, textAlign: "right" },
  docLine: { fontSize: 9, color: MUTED, textAlign: "right", marginTop: 2 },
  section: { marginBottom: 12 },
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  clientName: { fontSize: 11, fontWeight: "bold" },
  tHead: { flexDirection: "row", backgroundColor: "#f1f5f9", borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER, paddingVertical: 5, paddingHorizontal: 4 },
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 5, paddingHorizontal: 4 },
  th: { fontSize: 8, color: MUTED, fontWeight: "bold" },
  cDesc: { flex: 1 },
  cNum: { width: 55, textAlign: "right" },
  cQty: { width: 40, textAlign: "right" },
  specs: { fontSize: 7.5, color: MUTED, marginTop: 1 },
  totals: { marginTop: 12, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalStrong: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderTopWidth: 1, borderTopColor: NAVY, marginTop: 3 },
  totalStrongText: { fontSize: 12, fontWeight: "bold", color: NAVY },
  terms: { marginTop: 18, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  footer: { position: "absolute", bottom: 24, left: 34, right: 34, textAlign: "center", fontSize: 7.5, color: MUTED, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6 },
  annexTitle: { fontSize: 14, fontWeight: "bold", color: NAVY, marginBottom: 2 },
  annexSub: { fontSize: 9, color: MUTED, marginBottom: 12 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  photoItem: { width: "48%", marginBottom: 12 },
  photoImg: { width: "100%", height: 200, objectFit: "cover", borderRadius: 4, borderWidth: 1, borderColor: BORDER },
  photoCaption: { fontSize: 7.5, color: MUTED, marginTop: 3, textAlign: "center" },
});

export function QuotePdfDocument({ quote, items, companyInfo, photos = [] }: { quote: Any; items: Any[]; companyInfo: Any; photos?: { url: string; caption: string }[] }) {
  const cur = quote.currency as string;
  const company = companyInfo?.nombre ?? BRANDING.companyName;
  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-AR") : "—");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Encabezado */}
        <View style={s.headerRow}>
          <View style={{ maxWidth: 300 }}>
            <Text style={s.company}>{company}</Text>
            {companyInfo?.cuit ? <Text style={s.companyLine}>CUIT: {companyInfo.cuit}</Text> : null}
            {companyInfo?.direccion ? <Text style={s.companyLine}>{companyInfo.direccion}{companyInfo?.ciudad ? `, ${companyInfo.ciudad}` : ""}</Text> : null}
            {companyInfo?.telefono ? <Text style={s.companyLine}>Tel: {companyInfo.telefono}</Text> : null}
            {companyInfo?.email ? <Text style={s.companyLine}>{companyInfo.email}</Text> : null}
          </View>
          <View>
            <Text style={s.docTitle}>PRESUPUESTO</Text>
            <Text style={s.docLine}>{quote.quote_number ?? ""}</Text>
            <Text style={s.docLine}>Fecha: {fmtDate(quote.created_at)}</Text>
            {quote.valid_until ? <Text style={s.docLine}>Válido hasta: {fmtDate(quote.valid_until)}</Text> : null}
          </View>
        </View>

        {/* Cliente */}
        <View style={s.section}>
          <Text style={s.label}>Cliente</Text>
          <Text style={s.clientName}>{quote.client?.business_name ?? "—"}</Text>
          <Text style={{ fontSize: 10, marginTop: 4 }}>{quote.title}</Text>
        </View>

        {/* Ítems */}
        <View style={s.tHead}>
          <Text style={[s.th, s.cDesc]}>Descripción</Text>
          <Text style={[s.th, s.cQty]}>Cant.</Text>
          <Text style={[s.th, s.cNum]}>Precio</Text>
          <Text style={[s.th, s.cNum]}>Subtotal</Text>
        </View>
        {items.map((it, i) => (
          <View style={s.tRow} key={i} wrap={false}>
            <View style={s.cDesc}>
              <Text>{it.description}</Text>
              {it.specs ? <Text style={s.specs}>{it.specs}</Text> : null}
            </View>
            <Text style={s.cQty}>{Number(it.quantity)}</Text>
            <Text style={s.cNum}>{money(it.unit_price, cur)}</Text>
            <Text style={s.cNum}>{money(it.line_total, cur)}</Text>
          </View>
        ))}

        {/* Totales (sin costo ni margen) */}
        <View style={s.totals}>
          <View style={s.totalRow}><Text style={{ color: MUTED }}>Subtotal</Text><Text>{money(quote.subtotal, cur)}</Text></View>
          {Number(quote.tax_amount) > 0 ? (
            <View style={s.totalRow}><Text style={{ color: MUTED }}>Impuesto ({quote.tax_pct}%)</Text><Text>{money(quote.tax_amount, cur)}</Text></View>
          ) : null}
          <View style={s.totalStrong}><Text style={s.totalStrongText}>TOTAL</Text><Text style={s.totalStrongText}>{money(quote.total, cur)}</Text></View>
        </View>

        {/* Condiciones */}
        {quote.terms ? (
          <View style={s.terms}>
            <Text style={s.label}>Condiciones comerciales</Text>
            <Text style={{ fontSize: 8.5, color: "#334155" }}>{quote.terms}</Text>
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          {company} · Presupuesto generado por {BRANDING.suiteName} {BRANDING.modules.crm}
        </Text>
      </Page>

      {/* Anexo fotográfico (fotos de campo adjuntas a la cotización) */}
      {photos.length > 0 ? (
        <Page size="A4" style={s.page}>
          <Text style={s.annexTitle}>Anexo fotográfico</Text>
          <Text style={s.annexSub}>{quote.quote_number ?? ""} · {quote.title}</Text>
          <View style={s.photoGrid}>
            {photos.map((p, i) => (
              <View key={i} style={s.photoItem} wrap={false}>
                <Image src={p.url} style={s.photoImg} />
                <Text style={s.photoCaption}>{p.caption}</Text>
              </View>
            ))}
          </View>
          <Text style={s.footer} fixed>
            {company} · Presupuesto generado por {BRANDING.suiteName} {BRANDING.modules.crm}
          </Text>
        </Page>
      ) : null}
    </Document>
  );
}
