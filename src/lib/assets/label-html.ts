// label-html.ts — src/lib/assets/label-html.ts — 2026-10-15
// El HTML de la etiqueta QR imprimible. PURO: recibe datos y devuelve un string.
//
// Está separado del componente por dos razones:
//  1. Se puede testear la regla que más importa —que una empresa sin configurar no imprima NADA
//     de empresa— sin abrir un navegador.
//  2. Se puede renderizar una muestra para revisar el diseño sin levantar la app.
//
// La etiqueta se imprime en DOS MITADES separadas por una línea de corte:
//  · Izquierda — el QR, el nombre, el TAG y quién es el responsable. Va pegada al equipo.
//  · Derecha   — encabezada por el proveedor, con los datos fijos del equipo y renglones en
//                blanco para completar a mano o con sello. Va a la planilla o a la carpeta.

import type { LabelCompany } from "@/lib/assets/label-company";

export interface LabelData {
  tag: string | null;
  name: string;
  tipo: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  ubicacion: string | null;
  criticidad: string | null;
}

/** Texto del usuario dentro de un HTML que se arma a mano: hay que escaparlo. */
const esc = (v: string | null | undefined) =>
  (v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Una fila de dato fijo. Si el dato no está, la fila no se imprime: sin guiones de relleno. */
const fila = (label: string, value: string | null) =>
  value ? `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>` : "";

/** Un renglón para completar con lapicera. */
const renglon = (label: string) =>
  `<div class="rg"><span>${esc(label)}</span><i></i></div>`;

export function buildLabelHtml({
  data,
  company,
  qrDataUrl,
}: {
  data: LabelData;
  /** `null` = empresa sin configurar: no se imprime NADA de empresa, ni placeholder. */
  company: LabelCompany | null;
  qrDataUrl: string;
}): string {
  // Encabezado de la mitad de datos: quién presta el servicio. Lo que no esté cargado no deja
  // hueco — el contacto se arma con lo que haya.
  const contacto = company ? [company.telefono, company.web].filter(Boolean).join("  ·  ") : "";
  const encabezado = company
    ? `<header class="co">
         <span class="co-n">${esc(company.nombre)}</span>
         ${contacto ? `<span class="co-c">${esc(contacto)}</span>` : ""}
       </header>`
    : "";

  // Firma de la mitad del QR: para el que mira el sticker y no puede escanear.
  const responsable = company
    ? `<p class="resp">Responsable: ${esc(company.nombre)}${company.telefono ? ` · ${esc(company.telefono)}` : ""}</p>`
    : "";

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(data.tag ?? data.name)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; margin: 0; }
  /* Los grises y la línea de corte tienen que salir impresos, no solo en pantalla. */
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .et { width: 100%; max-width: 182mm; border: 1px solid #d4d4d8; border-radius: 3mm; padding: 6mm; }
  /* El encabezado de la empresa va DENTRO de la mitad derecha, no arriba de todo: esa mitad es
   la que se guarda o se archiva, y así se sostiene sola como papel del proveedor. */
  .co { display: block; padding-bottom: 2.5mm; margin-bottom: 3mm; border-bottom: 1px solid #e4e4e7; }
  .co-n { font-size: 11pt; font-weight: 700; color: #18181b; display: block; line-height: 1.2; }
  .co-c { font-size: 7.5pt; color: #71717a; display: block; margin-top: 0.8mm; }

  .cols { display: flex; align-items: stretch; }
  /* Cada mitad es una columna con su propio pie abajo de todo: así el corte deja dos papeles
     completos. Con un pie único y centrado, la tijera lo partía al medio. */
  .half { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; }
  .qr { text-align: center; padding-right: 6mm; }
  /* margin auto y no text-align: desde que .half es flex, el <img> es un flex item y el
     text-align del padre no lo centra (sí centra el texto de h1/p, que ocupan todo el ancho). */
  .qr img { width: 52mm; height: 52mm; display: block; margin-left: auto; margin-right: auto; }
  .qr h1 { font-size: 13pt; margin: 0 0 1mm; line-height: 1.2; }
  .qr .tag { font-size: 10pt; color: #52525b; margin: 0 0 3mm; font-weight: 600; letter-spacing: .04em; }
  .qr .scan { font-size: 7.5pt; color: #71717a; margin: 2mm 0 0; }
  .qr .resp { font-size: 8pt; color: #3f3f46; margin: 4mm 2mm 0; padding-top: 2.5mm; border-top: 1px solid #e4e4e7; line-height: 1.35; }

  /* La línea de corte: punteada, con la tijera encima para que se lea como "cortar acá". */
  .cut { position: relative; width: 0; border-left: 1px dashed #a1a1aa; margin: 0 1mm; }
  .cut svg { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: #fff; padding: 2.5mm 0.5mm; }

  .dt { padding-left: 6mm; }
  .dt table { border-collapse: collapse; width: 100%; }
  .dt th { text-align: left; font-weight: 400; color: #71717a; font-size: 7.5pt; padding: 0.8mm 3mm 0.8mm 0; white-space: nowrap; vertical-align: top; }
  .dt td { font-size: 8.5pt; color: #18181b; padding: 0.8mm 0; }
  .dt h2 { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: #a1a1aa; margin: 4mm 0 2mm; font-weight: 600; }
  .rg { display: flex; align-items: flex-end; gap: 2mm; margin-bottom: 3.5mm; }
  .rg span { font-size: 7.5pt; color: #71717a; white-space: nowrap; }
  .rg i { flex: 1; border-bottom: 1px solid #d4d4d8; height: 4mm; }
  .sello { border: 1px dashed #d4d4d8; height: 20mm; border-radius: 1.5mm; margin-top: 1mm; }
  .sello span { font-size: 7pt; color: #a1a1aa; padding: 1.5mm; display: block; }

  /* margin-top:auto lo clava abajo de su mitad, sin importar cuál de las dos sea más alta. */
  .pie { margin-top: auto; padding-top: 6mm; text-align: center; font-size: 6pt; color: #d4d4d8; letter-spacing: .04em; }
</style></head>
<body>
  <div class="et">
  <div class="cols">
    <div class="half qr">
      <h1>${esc(data.name)}</h1>
      ${data.tag ? `<p class="tag">${esc(data.tag)}</p>` : ""}
      <img src="${qrDataUrl}" alt=""/>
      <p class="scan">Escaneá para ver la ficha del equipo</p>
      ${responsable}
      <p class="pie">Zaire Industrial · zairetech.com</p>
    </div>

    <div class="cut">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#52525b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
        <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>
      </svg>
    </div>

    <div class="half dt">
      ${encabezado}
      <table>
        ${fila("Equipo", data.name)}
        ${fila("TAG", data.tag)}
        ${fila("Tipo", data.tipo)}
        ${fila("Marca / modelo", [data.marca, data.modelo].filter(Boolean).join(" ") || null)}
        ${fila("N° de serie", data.serie)}
        ${fila("Ubicación", data.ubicacion)}
        ${fila("Criticidad", data.criticidad)}
      </table>

      <h2>Control</h2>
      ${renglon("Controló")}
      ${renglon("Fecha")}
      ${renglon("Observaciones")}
      <div class="sello"><span>Firma / sello</span></div>
      <p class="pie">Zaire Industrial · zairetech.com</p>
    </div>
  </div>
  </div>
</body></html>`;
}
