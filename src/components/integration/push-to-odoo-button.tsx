"use client";
// push-to-odoo-button.tsx — src/components/integration/push-to-odoo-button.tsx — 2026-08-28
// Botón "Enviar a Odoo" en el detalle de una OT. Solo se monta si la integración está
// habilitada (lo decide la página, que es Server Component y lee el flag server-side).
//
// El botón se deshabilita mientras hay un envío en curso. Eso es comodidad, no
// seguridad: la garantía real de no duplicar está en la base y en push-service.ts.
// Un botón de UI nunca puede ser la única protección de algo con impacto económico.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, ExternalLink, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PushToOdooButtonProps {
  orderId: string;
  orderNumber: string;
  /** Id en el sistema externo si ya fue enviada. */
  externalId: string | null;
  /** Un envío anterior quedó incompleto: hace falta revisión humana. */
  needsReview: boolean;
  /** La OT cambió en Zaire después del último envío: lo que hay en Odoo quedó viejo. */
  stale: boolean;
  /** Base del sistema externo, para armar el link directo. */
  externalBaseUrl: string | null;
}

export function PushToOdooButton({
  orderId, orderNumber, externalId, needsReview, stale, externalBaseUrl,
}: PushToOdooButtonProps) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(externalId);
  const [trabado, setTrabado] = useState(needsReview);
  // Se apaga apenas se reenvía: lo de Odoo pasa a estar al día.
  const [desactualizado, setDesactualizado] = useState(stale);

  async function enviar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/integration/push-work-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();

      if (data.ok) {
        setEnviado(data.external_id);
        setTrabado(false);
        setDesactualizado(false);
        if (data.adopted) toast.warning(data.message);
        else toast.success(`${orderNumber}: ${data.message}`);
        // El envío salió, pero con una salvedad que conviene que se lea aparte.
        if (data.warning) toast.warning(data.warning, { duration: 10000 });
        router.refresh();
      } else {
        if (data.needsReview) setTrabado(true);
        toast.error(data.message ?? "No se pudo enviar", { duration: 10000 });
      }
    } catch {
      toast.error("No se pudo contactar al servidor");
    } finally {
      setEnviando(false);
    }
  }

  // Envío anterior a medias: no se ofrece reenviar hasta que alguien revise.
  if (trabado) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
        onClick={() =>
          toast.warning(
            "Un envío anterior de esta OT quedó incompleto. Revisá en el sistema externo si la oportunidad se creó antes de reintentar.",
            { duration: 10000 }
          )
        }
      >
        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Envío a revisar
      </Button>
    );
  }

  if (enviado) {
    return (
      <div className="flex gap-2">
        {externalBaseUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={`${externalBaseUrl}/odoo/crm/${enviado}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Ver en Odoo
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={enviar}
          disabled={enviando}
          className={desactualizado ? "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700" : undefined}
          title={
            desactualizado
              ? "La OT cambió después del último envío. Actualiza la oportunidad existente; no crea otra."
              : "Actualiza la oportunidad existente; no crea otra"
          }
        >
          {enviando
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Actualizando…</>
            : desactualizado
              ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Actualizar en Odoo · hay cambios</>
              : <><Send className="w-3.5 h-3.5 mr-1.5" /> Actualizar en Odoo</>}
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={enviar} disabled={enviando}>
      {enviando
        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Enviando…</>
        : <><Send className="w-3.5 h-3.5 mr-1.5" /> Enviar a Odoo</>}
    </Button>
  );
}
