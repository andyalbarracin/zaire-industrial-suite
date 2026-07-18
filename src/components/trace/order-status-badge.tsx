// order-status-badge.tsx — src/components/trace/order-status-badge.tsx — 2026-05-19
// Badge de estado de orden de trabajo con colores por estado

import { cn } from "@/lib/utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/trace/constants";
import type { OrderStatus, OrderType } from "@/lib/types/database";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.75 rounded-full text-xs font-semibold border leading-tight",
        ORDER_STATUS_COLORS[status],
        className
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

interface OrderTypeBadgeProps {
  type: OrderType;
  className?: string;
}

export function OrderTypeBadge({ type, className }: OrderTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border",
        type === "OT"
          ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
          : "bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30",
        className
      )}
    >
      {type}
    </span>
  );
}
