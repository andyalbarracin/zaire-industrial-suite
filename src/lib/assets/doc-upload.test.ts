// doc-upload.test.ts — src/lib/assets/doc-upload.test.ts — 2026-10-16
// Qué archivo entra como documento de un equipo y cuál no.

import { describe, it, expect } from "vitest";
import { validateDocFile, extensionOf, MAX_DOC_MB, ALLOWED_DOC_EXT } from "@/lib/assets/doc-upload";

const MB = 1024 * 1024;
const ok = (n: string, mb = 1) => validateDocFile(n, mb * MB);

describe("lo que se acepta", () => {
  it("los formatos de un documento de equipo", () => {
    for (const n of ["manual.pdf", "certificado.PDF", "chapa.jpg", "plano.dwg", "historial.xlsx", "notas.txt"]) {
      expect(ok(n), n).toBeNull();
    }
  });

  it("la extensión se compara sin importar mayúsculas", () => {
    expect(ok("MANUAL.PDF")).toBeNull();
    expect(ok("Foto.JPEG")).toBeNull();
  });

  it("un nombre con puntos de más usa el último", () => {
    expect(ok("informe.v2.final.pdf")).toBeNull();
  });
});

describe("lo que NO entra — lista blanca, no negra", () => {
  it("rechaza lo que se ejecuta en el navegador al abrirse", () => {
    // Se sirven con signed URL desde el dominio del storage: un .html o un .svg se abre como
    // página, con su script corriendo. Es el motivo de que la lista sea blanca.
    for (const n of ["pagina.html", "pagina.htm", "pagina.xhtml", "icono.svg", "datos.xml", "script.js"]) {
      expect(ok(n), n).toBeTruthy();
    }
  });

  it("rechaza ejecutables y comprimidos", () => {
    for (const n of ["virus.exe", "script.sh", "run.bat", "todo.zip"]) expect(ok(n), n).toBeTruthy();
  });

  it("ninguna extensión peligrosa se coló en la lista blanca", () => {
    for (const mala of ["html", "htm", "xhtml", "svg", "svgz", "xml", "js", "mjs", "exe", "bat", "sh", "zip"]) {
      expect(ALLOWED_DOC_EXT as readonly string[]).not.toContain(mala);
    }
  });

  it("un archivo sin extensión no se puede identificar", () => {
    expect(validateDocFile("manual", MB)).toContain("extensión");
  });

  it("un archivo oculto no tiene extensión: el punto inicial no cuenta", () => {
    expect(extensionOf(".env")).toBe("");
    expect(validateDocFile(".env", 100)).toBeTruthy();
  });

  it("una ruta completa no engaña a la extensión", () => {
    expect(extensionOf("C:\\cosas\\manual.pdf")).toBe("pdf");
    expect(extensionOf("/tmp/x.html")).toBe("html");
  });
});

describe("tamaño", () => {
  it("rechaza lo que pasa el tope y lo dice con el número", () => {
    const msg = validateDocFile("manual.pdf", (MAX_DOC_MB + 5) * MB);
    expect(msg).toContain(String(MAX_DOC_MB));
    expect(msg).toContain("30.0 MB");
  });

  it("justo en el tope entra", () => {
    expect(validateDocFile("manual.pdf", MAX_DOC_MB * MB)).toBeNull();
  });

  it("un archivo vacío no se sube", () => {
    expect(validateDocFile("manual.pdf", 0)).toContain("vacío");
  });
});
