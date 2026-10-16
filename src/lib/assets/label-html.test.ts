// label-html.test.ts — src/lib/assets/label-html.test.ts — 2026-10-15
// La regla que más importa de la etiqueta: una empresa sin configurar no imprime NADA de empresa.

import { describe, it, expect } from "vitest";
import { buildLabelHtml, type LabelData } from "@/lib/assets/label-html";

const EQUIPO: LabelData = {
  tag: "BBA-12", name: "Bomba centrífuga 12", tipo: "Bomba", marca: "KSB", modelo: "ETA-100",
  serie: "SN-BBA-12", ubicacion: "Planta Sur · L3", criticidad: "5 · Crítica",
};
const QR = "data:image/png;base64,QQ==";
const html = (company: Parameters<typeof buildLabelHtml>[0]["company"], data = EQUIPO) =>
  buildLabelHtml({ data, company, qrDataUrl: QR });

describe("empresa sin configurar — no se imprime nada en su lugar", () => {
  const sinEmpresa = html(null);

  it("no deja ni el encabezado ni la firma de responsable", () => {
    expect(sinEmpresa).not.toContain("class=\"co\"");
    expect(sinEmpresa).not.toContain("Responsable");
  });

  it("no inventa un placeholder ni un nombre de ejemplo", () => {
    expect(sinEmpresa.toLowerCase()).not.toMatch(/empresa (sin configurar|demo|xyz)/);
  });

  it("la etiqueta sigue siendo útil: el QR y los datos del equipo están igual", () => {
    expect(sinEmpresa).toContain(QR);
    expect(sinEmpresa).toContain("BBA-12");
    expect(sinEmpresa).toContain("Bomba centrífuga 12");
  });
});

describe("empresa configurada — aparece en los dos lugares, con funciones distintas", () => {
  const completa = html({ nombre: "Servicios SAS S.A.", telefono: "11 4000-0000", web: "sas.com.ar" });

  it("encabeza la mitad de datos con el nombre y el contacto", () => {
    expect(completa).toContain("Servicios SAS S.A.");
    expect(completa).toContain("11 4000-0000");
    expect(completa).toContain("sas.com.ar");
  });

  it("firma la mitad del QR como responsable, con el teléfono", () => {
    expect(completa).toContain("Responsable: Servicios SAS S.A. · 11 4000-0000");
  });

  it("sin teléfono, el responsable queda con el nombre solo (no un separador colgando)", () => {
    const r = html({ nombre: "Servicios SAS S.A.", telefono: null, web: "sas.com.ar" });
    expect(r).toContain("Responsable: Servicios SAS S.A.<");
  });

  it("sin teléfono ni web no se dibuja la línea de contacto vacía", () => {
    expect(html({ nombre: "Servicios SAS S.A.", telefono: null, web: null })).not.toContain('class="co-c"');
  });
});

describe("los datos del equipo", () => {
  it("un dato que no existe NO imprime su fila: sin guiones de relleno", () => {
    const r = html(null, { ...EQUIPO, serie: null, ubicacion: null });
    expect(r).not.toContain("N° de serie");
    expect(r).not.toContain("Ubicación");
    expect(r).toContain("TAG");
  });

  it("marca y modelo van juntos en una sola fila", () => {
    expect(html(null)).toContain("KSB ETA-100");
  });

  it("escapa el texto del usuario: un nombre con < no rompe la impresión", () => {
    const r = html(null, { ...EQUIPO, name: 'Bomba <script>alert("x")</script>' });
    expect(r).not.toContain("<script>");
    expect(r).toContain("&lt;script&gt;");
  });

  it("lleva los renglones para completar a mano y el recuadro de sello", () => {
    const r = html(null);
    for (const t of ["Controló", "Fecha", "Observaciones", "Firma / sello"]) expect(r).toContain(t);
  });

  it("el pie de Zaire va siempre, al fondo", () => {
    expect(html(null)).toContain("Zaire Industrial · zairetech.com");
  });
});
