"use client";
// product-select.tsx — src/components/products/product-select.tsx — 2026-05-19
// Selector de producto con búsqueda para ítems de órdenes de trabajo

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/constants";
import type { Product, ProductCategory } from "@/lib/types/database";

interface ProductSelectProps {
  products: Product[];
  value: string | null;
  onChange: (productId: string | null) => void;
  disabled?: boolean;
}

export function ProductSelect({ products, value, onChange, disabled }: ProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = products.find((p) => p.id === value);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.brand ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "inline-flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-normal",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate flex-1 text-left">
          {selected ? `${selected.code ? `[${selected.code}] ` : ""}${selected.name}` : "Seleccionar producto..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-2" align="start">
        <Input
          placeholder="Buscar por nombre, código o marca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8"
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 text-(--zaire-text-muted)"
            onClick={() => { onChange(null); setOpen(false); }}
          >
            — Descripción libre —
          </button>
          {filtered.map((product) => (
            <button
              key={product.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 flex items-center gap-2"
              onClick={() => { onChange(product.id); setOpen(false); setSearch(""); }}
            >
              <Check className={cn("w-4 h-4 shrink-0", value === product.id ? "opacity-100 text-zaire-blue" : "opacity-0")} />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{product.name}</span>
                {product.brand && <span className="text-(--zaire-text-muted) ml-1">· {product.brand}</span>}
              </div>
              {product.code && (
                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{product.code}</span>
              )}
              {product.category && (
                <span className="text-xs text-(--zaire-text-muted)">
                  {PRODUCT_CATEGORY_LABELS[product.category as ProductCategory]}
                </span>
              )}
            </button>
          ))}
          {!filtered.length && (
            <p className="text-sm text-center py-4 text-(--zaire-text-muted)">Sin resultados</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
