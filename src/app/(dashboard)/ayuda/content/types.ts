// types.ts — src/app/(dashboard)/ayuda/content/types.ts — 2026-08-03
// Tipos compartidos del contenido de Ayuda (secciones por módulo).
import type { ComponentType } from "react";

export type Step = {
  title: string;
  body: string;
  alert?: { type: "warning" | "info" | "success"; text: string };
};

export type Section = {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  color: string;
  steps: Step[];
  keywords: string; // extra text for search
};
