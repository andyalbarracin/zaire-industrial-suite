// export.ts — src/lib/export.ts — 2026-07-17
// Helper de exportación a CSV. Nota de marca: los botones muestran el FORMATO (XLS/CSV),
// nunca el nombre de un software propietario ("Excel").

// Descarga un CSV con separador ';' y UTF-8 con BOM (estándar Argentina / LibreOffice).
export function downloadCSV(filename: string, rows: Record<string, string | number>[]): void {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\r\n");
  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
