"use client";
// client-select.tsx — src/components/clients/client-select.tsx — 2026-05-19
// Selector de cliente con búsqueda para usar en formulario de órdenes

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types/database";

interface ClientSelectProps {
  clients: Client[];
  value: string | null;
  onChange: (clientId: string | null) => void;
  disabled?: boolean;
}

export function ClientSelect({ clients, value, onChange, disabled }: ClientSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = clients.find((c) => c.id === value);

  const filtered = clients.filter(
    (c) =>
      c.business_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.tax_id ?? "").includes(search)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "inline-flex min-h-11 sm:min-h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-normal",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate flex-1 text-left">
          {selected ? selected.business_name : "Seleccionar cliente..."}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-100 p-2" align="start">
        <Input
          placeholder="Buscar por razón social o CUIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8"
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-subtle-2 text-(--zaire-text-muted)"
            onClick={() => { onChange(null); setOpen(false); }}
          >
            — Sin cliente —
          </button>
          {filtered.map((client) => (
            <button
              key={client.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-subtle-2 flex items-center gap-2"
              onClick={() => { onChange(client.id); setOpen(false); setSearch(""); }}
            >
              <Check
                className={cn("w-4 h-4 shrink-0", value === client.id ? "opacity-100 text-zaire-blue" : "opacity-0")}
              />
              <span className="flex-1 truncate">{client.business_name}</span>
              {client.tax_id && (
                <span className="text-xs text-(--zaire-text-muted) font-mono">{client.tax_id}</span>
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
