// doc-upload.ts — src/lib/assets/doc-upload.ts — 2026-10-16
// Qué archivo se acepta como documento de un equipo. PURO: nombre + tamaño → error o `null`.
//
// POR QUÉ UNA LISTA BLANCA Y NO UNA NEGRA
// Los documentos se sirven con signed URL desde el dominio del storage. Un `.html` o un `.svg`
// subido como "manual" se abre como PÁGINA, con el script que tenga adentro corriendo en ese
// dominio. Con lista negra siempre queda una extensión afuera (`.xhtml`, `.htm`, `.svgz`…);
// con lista blanca, lo que no está previsto no entra.
//
// ALCANCE HONESTO: esto corre en el navegador, así que **no es una barrera de seguridad**. Alguien
// que hable directo con la API la saltea. Es la defensa que SÍ se puede poner desde acá, y lo que
// evita en la práctica: el error opaco a los 3 minutos subiendo un archivo gigante, y que un
// usuario cualquiera cuelgue un HTML sin darse cuenta. La barrera real son las políticas del
// bucket y el RLS de `asset_documents`.

/** Tope por archivo. Un plano o un manual escaneado entra cómodo; un video, no. */
export const MAX_DOC_MB = 25;

/**
 * Extensiones permitidas, agrupadas por para qué sirven.
 * Ausentes a propósito: html, htm, xhtml, svg, xml, js, mjs, exe, bat, sh, zip.
 */
export const ALLOWED_DOC_EXT = [
  // documentos
  "pdf", "doc", "docx", "odt", "txt", "rtf",
  // planillas
  "xls", "xlsx", "ods", "csv",
  // imágenes (fotos de chapa, de instalación, de la falla)
  "jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "bmp", "tif", "tiff",
  // planos
  "dwg", "dxf",
] as const;

/** La extensión en minúsculas, o `""` si el archivo no tiene. */
export function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const i = base.lastIndexOf(".");
  // `i <= 0` cubre "sin-extension" y ".oculto" (que no es extensión, es un archivo oculto).
  return i <= 0 ? "" : base.slice(i + 1).toLowerCase();
}

/**
 * Valida un archivo antes de subirlo.
 * @returns el mensaje a mostrar, o `null` si el archivo está bien.
 */
export function validateDocFile(fileName: string, sizeBytes: number): string | null {
  if (sizeBytes <= 0) return "El archivo está vacío.";

  const max = MAX_DOC_MB * 1024 * 1024;
  if (sizeBytes > max) {
    return `El archivo pesa ${(sizeBytes / 1024 / 1024).toFixed(1)} MB y el máximo es ${MAX_DOC_MB} MB.`;
  }

  const ext = extensionOf(fileName);
  if (!ext) return "El archivo no tiene extensión y no se puede saber qué es.";
  if (!(ALLOWED_DOC_EXT as readonly string[]).includes(ext)) {
    return `No se aceptan archivos .${ext}. Se pueden subir PDF, imágenes, planillas y planos.`;
  }
  return null;
}

/** Para el `accept` del input: evita que el usuario elija algo que vamos a rechazar. */
export const DOC_ACCEPT = ALLOWED_DOC_EXT.map((e) => `.${e}`).join(",");
