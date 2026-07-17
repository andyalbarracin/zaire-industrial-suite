"use client";
// item-status-checklist.tsx — checklist vertical de estado del ítem con number picker opcional

import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFlag = "is_quoted" | "is_remitted" | "is_delivered" | "is_invoiced";
type QtyKey = "qty_remitted" | "qty_delivered" | "qty_invoiced";

interface ItemStatusChecklistProps {
  values: {
    is_quoted: boolean;
    is_remitted: boolean;
    is_delivered: boolean;
    is_invoiced: boolean;
    qty_remitted?: number;
    qty_delivered?: number;
    qty_invoiced?: number;
  };
  quantity: number;
  onToggle: (flag: StatusFlag, newValue: boolean) => void;
  /** Cuando se pasa, muestra el number picker editable bajo cada ítem marcado con qty > 1 */
  onQtyChange?: (qtyKey: QtyKey, newValue: number) => void;
}

const FLAGS: { flag: StatusFlag; label: string; qtyKey?: QtyKey }[] = [
  { flag: "is_quoted",   label: "Cotizado" },
  { flag: "is_remitted", label: "Remitido",  qtyKey: "qty_remitted" },
  { flag: "is_delivered",label: "Entregado", qtyKey: "qty_delivered" },
  { flag: "is_invoiced", label: "Facturado", qtyKey: "qty_invoiced" },
];

function NumberPicker({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-green-700 font-medium mr-1">Cant.:</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); dec(); }}
        disabled={value <= 0}
        className={cn(
          "w-7 h-7 rounded-md border flex items-center justify-center transition-all",
          "border-green-300 bg-white text-green-700",
          "hover:bg-green-100 active:scale-95",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        <Minus className="w-3 h-3" strokeWidth={2.5} />
      </button>
      <div className="w-10 h-7 rounded-md border border-green-300 bg-white flex items-center justify-center">
        <span className="text-sm font-bold text-green-800 tabular-nums">{value}</span>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inc(); }}
        disabled={value >= max}
        className={cn(
          "w-7 h-7 rounded-md border flex items-center justify-center transition-all",
          "border-green-300 bg-white text-green-700",
          "hover:bg-green-100 active:scale-95",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        <Plus className="w-3 h-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function ItemStatusChecklist({ values, quantity, onToggle, onQtyChange }: ItemStatusChecklistProps) {
  return (
    <div className="border border-(--zaire-border) rounded-lg p-3 bg-white">
      <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase tracking-wide mb-3">
        Estado del ítem
      </p>
      <div className="space-y-1.5">
        {FLAGS.map(({ flag, label, qtyKey }) => {
          const checked = values[flag];
          const qty = qtyKey ? (values[qtyKey] ?? 0) : 0;
          const showPicker = checked && qtyKey && quantity > 1 && !!onQtyChange;
          const showReadonlyQty = checked && qtyKey && quantity > 1 && !onQtyChange && qty > 0;

          return (
            <div key={flag}>
              {/* Fila del checkbox */}
              <button
                type="button"
                onClick={() => onToggle(flag, !checked)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all text-left",
                  checked
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-(--zaire-border) hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all",
                  checked ? "bg-green-500 border-green-500" : "border-slate-300 bg-white"
                )}>
                  {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
                <span className={cn(
                  "flex-1 font-medium",
                  checked ? "text-green-800" : "text-(--zaire-text-muted)"
                )}>
                  {label}
                </span>
                {showReadonlyQty && (
                  <span className="text-xs text-green-600 font-medium">{qty}/{quantity}</span>
                )}
              </button>

              {/* Number picker — solo cuando está marcado, tiene qty y se pasa onQtyChange */}
              {showPicker && (
                <div className="mt-1 ml-3 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                  <NumberPicker
                    value={qty}
                    max={quantity}
                    onChange={(v) => onQtyChange!(qtyKey!, v)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
