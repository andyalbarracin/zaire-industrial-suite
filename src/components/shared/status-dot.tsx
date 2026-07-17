// status-dot.tsx — src/components/shared/status-dot.tsx — 2026-05-27
// Componente semáforo: punto circular de color verde/amarillo/rojo

import { cn } from "@/lib/utils";
import type { TrafficLight } from "@/lib/utils";

interface StatusDotProps {
  status: TrafficLight;
  label?: string;
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}

const DOT_CLASSES: Record<TrafficLight, string> = {
  green:  "bg-green-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red:    "bg-red-400",
};

const SIZE_CLASSES = {
  sm: "w-2.5 h-2.5",
  md: "w-3.5 h-3.5",
};

export function StatusDot({ status, label, size = "md", pulse = false, className }: StatusDotProps) {
  const shouldPulse = pulse && status === "red";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex shrink-0">
        <span className={cn("rounded-full", SIZE_CLASSES[size], DOT_CLASSES[status])} />
        {shouldPulse && (
          <span className={cn("absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40", SIZE_CLASSES[size])} />
        )}
      </span>
      {label && (
        <span className="text-xs text-(--zaire-text-muted)">{label}</span>
      )}
    </span>
  );
}
