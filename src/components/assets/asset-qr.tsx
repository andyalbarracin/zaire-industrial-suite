"use client";
// asset-qr.tsx — src/components/assets/asset-qr.tsx — 2026-10-15
// Etiqueta QR imprimible del equipo (deep-link a la ficha). Usa la lib `qrcode` (data URL).
//
// La etiqueta se imprime en DOS MITADES separadas por una línea de corte:
//  · Izquierda — el QR, el nombre y el TAG. Va pegada al equipo (papel autoadhesivo).
//  · Derecha   — los datos fijos del equipo + renglones en blanco para completar a mano o con
//                sello. Va a la planilla, a la carpeta del equipo, o a la basura: lo decide quien
//                imprime. Por eso se corta, en lugar de ser dos impresiones distintas.
//
// Los datos de la empresa aparecen SOLO si están configurados, y en dos lugares con dos funciones
// distintas: encabezan la mitad de datos (es el papel del proveedor) y firman la mitad del QR como
// "Responsable", para que un sticker pegado a una bomba diga quién mantiene ese equipo aunque
// nadie tenga con qué escanear. Si no hay configuración no se dibuja nada — ni placeholder ni
// espacio reservado.

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildLabelHtml, type LabelData } from "@/lib/assets/label-html";
import type { LabelCompany } from "@/lib/assets/label-company";

export function AssetQR({
  path,
  data,
  company,
}: {
  path: string;
  data: LabelData;
  /** `null` = la empresa no está configurada. No se imprime nada de empresa. */
  company: LabelCompany | null;
}) {
  const [dataUrl, setDataUrl] = useState("");
  const [url, setUrl] = useState("");

  // Los dos setState van DENTRO del .then(), no sincrónicos en el effect: un setState
  // sincrónico acá dispara un render en cascada (el QR ya tiene su placeholder mientras carga).
  useEffect(() => {
    const full = window.location.origin + path;
    QRCode.toDataURL(full, { width: 480, margin: 1 })
      .then((qr) => { setDataUrl(qr); setUrl(full); })
      .catch(() => {});
  }, [path]);

  function printTag() {
    // La ventana se abre GRANDE a propósito. El diálogo de impresión dibuja la vista previa al
    // tamaño del viewport de la ventana que imprime: con el popup de 420×560 que había antes, la
    // hojita de la previa salía ilegible aunque el PDF final estuviera perfecto.
    const w = window.open("", "_blank", "width=860,height=940");
    if (!w) return;
    w.document.write(buildLabelHtml({ data, company, qrDataUrl: dataUrl }));
    w.document.close();
    w.focus();
    // El print se dispara cuando la ventana terminó de cargar el QR: si se llama antes,
    // algunos navegadores imprimen la hoja con los <img> todavía vacíos. El timer es la red por
    // si el `load` no llega (pasa con documentos escritos a mano en algunos navegadores): sin él
    // el botón quedaría muerto, que es peor que imprimir una vez de más.
    let impreso = false;
    const imprimir = () => { if (!impreso) { impreso = true; w.print(); } };
    w.onload = imprimir;
    setTimeout(imprimir, 800);
  }

  return (
    <div className="zaire-card p-5 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 self-start"><QrCode className="w-4 h-4 text-(--zaire-text-muted)" /><h3 className="text-sm font-semibold text-(--zaire-text)">Etiqueta QR</h3></div>
      {dataUrl
        ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={dataUrl} alt="QR del equipo" className="w-40 h-40" />
        : <div className="w-40 h-40 bg-subtle rounded animate-pulse" />}
      <p className="text-[11px] text-(--zaire-text-muted) text-center break-all">{url}</p>
      <Button variant="outline" size="sm" onClick={printTag} disabled={!dataUrl}><Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir etiqueta</Button>
    </div>
  );
}
