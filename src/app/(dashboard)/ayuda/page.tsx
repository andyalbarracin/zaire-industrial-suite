"use client";
// page.tsx — src/app/(dashboard)/ayuda/page.tsx
// Centro de Ayuda — manual de usuario integrado con búsqueda y accordion

import { useState, useMemo } from "react";
import { Search, ChevronDown, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isModuleEnabled } from "@/lib/modules";
import type { Section } from "./content/types";
import { traceSections } from "./content/trace";
import { fieldSections } from "./content/field";

// ─── Badge inline ─────────────────────────────────────────────────────────────
function OTBadge() {
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 mx-0.5">OT</span>;
}
function OTSBadge() {
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300 mx-0.5">OTS</span>;
}
function Code({ children }: { children: string }) {
  return <code className="px-1.5 py-0.5 rounded bg-subtle-2 text-slate-700 dark:text-slate-200 text-[11px] font-mono mx-0.5">{children}</code>;
}

// ─── Alert box ────────────────────────────────────────────────────────────────
function AlertBox({ type, text }: { type: "warning" | "info" | "success"; text: string }) {
  const styles = {
    warning: { bg: "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200", icon: AlertTriangle, iconColor: "text-amber-500" },
    info:    { bg: "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-200",    icon: Info,          iconColor: "text-blue-500" },
    success: { bg: "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-200", icon: CheckCircle2,  iconColor: "text-green-500" },
  }[type];
  const Icon = styles.icon;
  return (
    <div className={cn("flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs mt-2", styles.bg)}>
      <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", styles.iconColor)} />
      <span>{text}</span>
    </div>
  );
}

// ─── Definición de contenido (gateado por módulos activos) ───────────────────
// Las secciones viven en ./content/<módulo>.ts y se muestran según enabled_modules.
// Al activar un módulo nuevo NO se toca este archivo: se suma su spread acá.

const SECTIONS: Section[] = [
  ...(isModuleEnabled("trace") ? traceSections : []),
  ...(isModuleEnabled("field") ? fieldSections : []),
  // Futuros: ...(isModuleEnabled("assets") ? assetsSections : []),
  //          ...(isModuleEnabled("stock")  ? stockSections  : []),
  //          ...(isModuleEnabled("crm")    ? crmSections    : []),
];

// ─── Accordion ────────────────────────────────────────────────────────────────

function AccordionSection({ section, defaultOpen = false }: { section: Section; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = section.icon;

  return (
    <div className="zaire-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-subtle transition-colors"
      >
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", "bg-subtle-2")}>
          <Icon className={cn("w-5 h-5", section.color)} />
        </div>
        <span className="flex-1 font-semibold text-(--zaire-text) text-[15px]">{section.title}</span>
        <ChevronDown className={cn("w-4 h-4 text-(--zaire-text-muted) transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-(--zaire-border) px-6 pb-6 pt-4 space-y-5">
          {section.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-zaire-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-(--zaire-text) text-sm mb-1">{step.title}</p>
                <p className="text-sm text-(--zaire-text-muted) leading-relaxed">{step.body}</p>
                {step.alert && <AlertBox type={step.alert.type} text={step.alert.text} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AyudaPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.filter((s) => {
      const searchable = `${s.title} ${s.keywords} ${s.steps.map(st => `${st.title} ${st.body} ${st.alert?.text ?? ""}`).join(" ")}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--zaire-text)">Centro de Ayuda</h1>
        <p className="text-sm text-(--zaire-text-muted) mt-0.5">Guía de uso del sistema</p>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--zaire-text-muted)" />
        <Input
          placeholder="Buscar en la ayuda... (ej: PDF, semáforo, duplicar)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-10 bg-panel"
        />
      </div>

      {/* Tip rápido */}
      {!query && (
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
          <span>
            Hacé clic en cualquier sección para expandirla. Usá la búsqueda para encontrar un tema específico.
            Términos útiles: <OTBadge /> <OTSBadge /> o palabras como «PDF», «semáforo», «estado», «exportar».
          </span>
        </div>
      )}

      {/* Secciones */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((section, i) => (
            <AccordionSection
              key={section.id}
              section={section}
              defaultOpen={!!query || i === 0}
            />
          ))
        ) : (
          <div className="zaire-card px-6 py-12 text-center">
            <Search className="w-8 h-8 text-(--zaire-text-muted) mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-(--zaire-text-muted)">
              No se encontraron resultados para &quot;{query}&quot;
            </p>
            <p className="text-xs text-(--zaire-text-muted) mt-1">
              Intentá con otras palabras clave
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
