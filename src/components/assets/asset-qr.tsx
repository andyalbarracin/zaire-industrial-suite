"use client";
// asset-qr.tsx — src/components/assets/asset-qr.tsx — 2026-07-20
// Etiqueta QR imprimible del equipo (deep-link a la ficha). Usa la lib `qrcode` (data URL).

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AssetQR({ path, tag, name }: { path: string; tag: string | null; name: string }) {
  const [dataUrl, setDataUrl] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const full = window.location.origin + path;
    setUrl(full);
    QRCode.toDataURL(full, { width: 240, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [path]);

  function printTag() {
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(
      `<html><head><title>${tag ?? name}</title><style>body{font-family:sans-serif;text-align:center;padding:24px}img{width:220px;height:220px}h2{margin:8px 0 2px}p{color:#555;margin:0;font-size:12px}</style></head>` +
      `<body><h2>${name}</h2><p>${tag ?? ""}</p><img src="${dataUrl}"/><p style="margin-top:8px">Escaneá para ver la ficha del equipo</p></body></html>`
    );
    w.document.close(); w.focus(); w.print();
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
