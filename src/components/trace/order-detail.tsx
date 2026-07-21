"use client";
// order-detail.tsx — src/components/trace/order-detail.tsx — 2026-05-27
// Vista completa del detalle de una OT: header, info, ítems, historial, cambio de estado

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, FileDown, ArrowRight,
  ChevronDown, ChevronUp, Loader2, Building2, Phone, Mail
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderStatusBadge, OrderTypeBadge } from "./order-status-badge";
import { ItemStatusChecklist } from "./item-status-checklist";
import { StatusDot } from "@/components/shared/status-dot";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ROUTES } from "@/lib/routes";
import { OrderAttachments, type Attachment } from "./order-attachments";
import { formatDate, formatDateTime, formatCurrency, cn, calculateTrafficLight } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_NEXT } from "@/lib/trace/constants";
import { BRANCHES } from "@/lib/constants";
import type { OrderStatus, OrderType, Currency, Profile, Client, Product } from "@/lib/types/database";
import { ConsumeFromOrder } from "@/components/stock/consume-from-order";
import { RegisterAssetService } from "@/components/assets/register-asset-service";

interface ItemDetail {
  id: string;
  item_number: number;
  quantity: number;
  product_id: string | null;
  custom_description: string | null;
  serial_number: string | null;
  equipment_number: string | null;
  additional_observation: string | null;
  unit_price: number;
  total_price: number;
  unit_price_ars: number;
  total_price_ars: number;
  repair_required: boolean;
  diagnosis: string | null;
  work_performed: string | null;
  status: string;
  notes: string | null;
  // Campos técnicos
  medida: string | null;
  unidad_medida: string | null;
  marca: string | null;
  materiales_caras: string | null;
  materiales_orings: string | null;
  origen_abastecimiento: string | null;
  // Estados por ítem
  is_quoted: boolean;
  is_remitted: boolean;
  qty_remitted: number;
  is_delivered: boolean;
  qty_delivered: number;
  is_invoiced: boolean;
  qty_invoiced: number;
  products: { id: string; code: string | null; name: string; brand: string | null; category: string | null; } | null;
}

interface OrderDetailProps {
  order: {
    id: string; order_number: string; order_type: string; status: string;
    date_in: string; date_due: string | null; currency: string;
    subtotal: number; total: number; branch_id: string | null;
    general_notes: string | null; created_at: string; updated_at: string;
    client_id: string | null;
    clients: {
      id: string; business_name: string; tax_id: string | null;
      contact_name: string | null; email: string | null; phone: string | null;
      city: string | null; client_code?: string | null;
    } | null;
  };
  items: ItemDetail[];
  history: Array<{
    id: string; old_status: string | null; new_status: string;
    notes: string | null; created_at: string;
    profiles: { full_name: string } | null;
  }>;
  clients: Pick<Client, "id" | "business_name" | "tax_id">[];
  products: Pick<Product, "id" | "code" | "name" | "brand" | "model" | "category" | "unit" | "default_currency" | "default_unit_price">[];
  currentProfile: Pick<Profile, "id" | "role" | "full_name"> | null;
  attachments: Attachment[];
}

export function OrderDetail({ order, items: initialItems, history, currentProfile, attachments }: OrderDetailProps) {
  const totalArs = initialItems.reduce((sum, i) => sum + (i.total_price_ars ?? 0), 0);
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(order.status as OrderStatus);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [localItems, setLocalItems] = useState<ItemDetail[]>(initialItems);

  const allowedNext = ORDER_STATUS_NEXT[currentStatus] ?? [];
  const currency = order.currency as Currency;
  const branch = BRANCHES.find((b) => b.id === order.branch_id);

  const isTerminal = ["facturada", "cancelada"].includes(currentStatus);

  async function handleStatusChange() {
    if (!newStatus) return;
    setChangingStatus(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { error } = await sb.from("work_orders").update({ status: newStatus }).eq("id", order.id);
    if (error) { toast.error("Error al cambiar el estado"); setChangingStatus(false); return; }

    await sb.from("work_order_status_history").insert({
      work_order_id: order.id, old_status: currentStatus, new_status: newStatus,
      changed_by: currentProfile?.id ?? null, notes: statusNotes || null,
    });

    await sb.from("audit_logs").insert({
      entity_type: "work_order", entity_id: order.id, action: "status_change",
      description: `Estado cambiado: ${ORDER_STATUS_LABELS[currentStatus]} → ${ORDER_STATUS_LABELS[newStatus]}`,
      user_id: currentProfile?.id ?? null, user_name: currentProfile?.full_name ?? null,
    });

    toast.success(`Estado actualizado a "${ORDER_STATUS_LABELS[newStatus]}"`);
    setCurrentStatus(newStatus);
    setNewStatus("");
    setStatusNotes("");
    setConfirmStatusOpen(false);
    router.refresh();
    setChangingStatus(false);
  }

  async function toggleItemFlag(
    itemId: string,
    flag: "is_quoted" | "is_remitted" | "is_delivered" | "is_invoiced",
    value: boolean
  ) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("work_order_items").update({ [flag]: value }).eq("id", itemId);
    if (error) { toast.error("Error al actualizar el ítem"); return; }
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, [flag]: value } : i)));
    toast.success("Actualizado");
  }

  async function updateItemStatus(itemId: string, newStatus: string) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("work_order_items").update({ status: newStatus }).eq("id", itemId);
    if (error) { toast.error("Error al actualizar el estado"); return; }
    setLocalItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i)));
    toast.success("Estado actualizado");
  }

  function toggleItemExpand(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.trace.ordenes}><ArrowLeft className="w-4 h-4 mr-1" /> Volver</Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono text-(--zaire-text)">{order.order_number}</h1>
            <OrderTypeBadge type={order.order_type as OrderType} />
            <OrderStatusBadge status={currentStatus} />
            {branch && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-subtle-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {branch.code}
              </span>
            )}
          </div>
          {order.clients && (
            <p className="text-sm text-(--zaire-text-muted) mt-1">
              <Link href={ROUTES.cliente(order.clients.id)} className="hover:underline text-zaire-blue">
                {order.clients.business_name}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.trace.ordenEditar(order.id)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/pdf/${order.id}`} target="_blank" rel="noopener noreferrer">
              <FileDown className="w-3.5 h-3.5 mr-1.5" /> PDF
            </a>
          </Button>
          {order.order_type === "OTS" && initialItems.some((i) => i.repair_required) && (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/pdf/repair/${order.id}`} target="_blank" rel="noopener noreferrer">
                <FileDown className="w-3.5 h-3.5 mr-1.5" /> Planilla Reparación
              </a>
            </Button>
          )}
          <ConsumeFromOrder orderId={order.id} items={initialItems} />
          <RegisterAssetService refType="ot" refId={order.id} defaultCost={order.total} defaultDescription={`OT ${order.order_number}`} />
        </div>
      </div>

      <Tabs defaultValue="detalle">
        <TabsList className="bg-panel border border-(--zaire-border)">
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
          <TabsTrigger value="items">Ítems ({localItems.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial ({history.length})</TabsTrigger>
          <TabsTrigger value="adjuntos">Adjuntos ({attachments.length})</TabsTrigger>
          {!isTerminal && <TabsTrigger value="estado">Cambiar Estado</TabsTrigger>}
        </TabsList>

        {/* Tab: Detalle */}
        <TabsContent value="detalle" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Información de la orden */}
            <div className="zaire-card p-5 space-y-4">
              <h3 className="font-semibold text-(--zaire-text)">Información de la orden</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-(--zaire-text-muted)">Nro. Orden</span>
                  <span className="font-mono font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--zaire-text-muted)">Tipo</span>
                  <OrderTypeBadge type={order.order_type as OrderType} />
                </div>
                {branch && (
                  <div className="flex justify-between">
                    <span className="text-(--zaire-text-muted)">Sucursal</span>
                    <span className="font-medium">{branch.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-(--zaire-text-muted)">Ingreso</span>
                  <span>{formatDate(order.date_in)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--zaire-text-muted)">Vencimiento</span>
                  <span>{formatDate(order.date_due)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-(--zaire-text-muted)">Moneda</span>
                  <span className="font-medium">{currency}</span>
                </div>
                <div className="border-t border-(--zaire-border) pt-3 space-y-1">
                  <div className="flex justify-between text-base font-bold">
                    <span>Total USD</span>
                    <span className="text-blue-700 dark:text-blue-300">{formatCurrency(order.total, "USD")}</span>
                  </div>
                  {totalArs > 0 && (
                    <div className="flex justify-between text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <span>Total ARS</span>
                      <span>{formatCurrency(totalArs, "ARS")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cliente */}
            {order.clients && (
              <div className="zaire-card p-5 space-y-3">
                <h3 className="font-semibold text-(--zaire-text)">Cliente</h3>
                <div className="space-y-2 text-sm">
                  <Link href={ROUTES.cliente(order.clients.id)} className="font-medium text-zaire-blue hover:underline block">
                    {order.clients.business_name}
                  </Link>
                  {order.clients.client_code && (
                    <p className="text-xs text-(--zaire-text-muted) font-mono">Cód: {order.clients.client_code}</p>
                  )}
                  {order.clients.tax_id && (
                    <p className="font-mono text-xs text-(--zaire-text-muted)">CUIT: {order.clients.tax_id}</p>
                  )}
                  {order.clients.contact_name && (
                    <div className="flex items-center gap-1.5 text-(--zaire-text-muted)">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{order.clients.contact_name}</span>
                    </div>
                  )}
                  {order.clients.email && (
                    <div className="flex items-center gap-1.5 text-(--zaire-text-muted)">
                      <Mail className="w-3.5 h-3.5" />
                      <a href={`mailto:${order.clients.email}`} className="hover:underline">{order.clients.email}</a>
                    </div>
                  )}
                  {order.clients.phone && (
                    <div className="flex items-center gap-1.5 text-(--zaire-text-muted)">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{order.clients.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estado Operativo — semáforo calculado desde ítems */}
            <div className="zaire-card p-5 space-y-4">
              <h3 className="font-semibold text-(--zaire-text)">Estado Operativo</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-(--zaire-border)">
                  <span className="text-sm text-(--zaire-text-muted)">Procesado</span>
                  <StatusDot
                    status={
                      localItems.every((i) => ["completado", "entregado"].includes(i.status))
                        ? "green"
                        : localItems.some((i) => ["completado", "entregado", "en_proceso"].includes(i.status))
                        ? "yellow"
                        : "red"
                    }
                    label={`${localItems.filter((i) => ["completado", "entregado"].includes(i.status)).length}/${localItems.length}`}
                  />
                </div>
                {([
                  { field: "is_quoted" as const, label: "Cotizado" },
                  { field: "is_remitted" as const, label: "Remitido" },
                  { field: "is_delivered" as const, label: "Entregado" },
                  { field: "is_invoiced" as const, label: "Facturado" },
                ] as const).map(({ field, label }) => {
                  const completed = localItems.filter((i) => i[field] === true).length;
                  return (
                    <div key={field} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-(--zaire-border)">
                      <span className="text-sm text-(--zaire-text-muted)">{label}</span>
                      <StatusDot
                        status={calculateTrafficLight(localItems, field)}
                        label={`${completed}/${localItems.length}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {order.general_notes && (
            <div className="zaire-card p-5">
              <h3 className="font-semibold text-(--zaire-text) mb-2">Observaciones generales</h3>
              <p className="text-sm text-(--zaire-text-muted) whitespace-pre-wrap">{order.general_notes}</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Ítems */}
        <TabsContent value="items" className="space-y-3">
          {localItems.map((item) => {
            const expanded = expandedItems.has(item.id);
            const hasTechDetails = item.medida || item.marca || item.materiales_caras || item.materiales_orings || item.origen_abastecimiento || item.diagnosis || item.work_performed || item.notes;
            return (
              <div key={item.id} className="zaire-card overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="w-8 h-8 rounded-full bg-zaire-navy text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {item.item_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-(--zaire-text)">
                          {item.products?.name ?? item.custom_description ?? "Sin descripción"}
                        </p>
                        {item.products?.brand && (
                          <p className="text-xs text-(--zaire-text-muted)">{item.products.brand}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{formatCurrency(item.total_price, "USD")}</p>
                        {item.total_price_ars > 0 && (
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{formatCurrency(item.total_price_ars, "ARS")}</p>
                        )}
                        <p className="text-xs text-(--zaire-text-muted)">{item.quantity} × {formatCurrency(item.unit_price, "USD")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-(--zaire-text-muted)">
                      {item.serial_number && <span>Serie: <span className="font-mono">{item.serial_number}</span></span>}
                      {item.equipment_number && <span>Equipo: <span className="font-mono">{item.equipment_number}</span></span>}
                      {item.medida && <span>Medida: <span className="font-mono">{item.medida}{item.unidad_medida ? ` ${item.unidad_medida}` : ""}</span></span>}
                      {item.marca && <span>Marca: <span className="font-medium">{item.marca}</span></span>}
                      {item.repair_required && (
                        <span className="text-amber-600 dark:text-amber-300 font-medium">⚠ Requiere reparación</span>
                      )}
                    </div>
                    {/* Semáforo de estado del ítem */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <StatusDot status={item.is_quoted ? "green" : "red"} label="Cotizado" size="sm" />
                      <StatusDot status={item.is_remitted ? "green" : "red"} label="Remitido" size="sm" />
                      <StatusDot status={item.is_delivered ? "green" : "red"} label="Entregado" size="sm" />
                      <StatusDot status={item.is_invoiced ? "green" : "red"} label="Facturado" size="sm" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleItemExpand(item.id)}
                    className="text-(--zaire-text-muted) hover:text-(--zaire-text) transition-colors shrink-0"
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-(--zaire-border) px-4 pb-4 pt-3 space-y-4 bg-subtle">
                    {/* Campos técnicos */}
                    {(item.materiales_caras || item.materiales_orings || item.origen_abastecimiento) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        {item.materiales_caras && (
                          <div>
                            <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-1">Mat. Caras</p>
                            <p className="text-(--zaire-text)">{item.materiales_caras}</p>
                          </div>
                        )}
                        {item.materiales_orings && (
                          <div>
                            <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-1">Mat. O&apos;rings</p>
                            <p className="text-(--zaire-text)">{item.materiales_orings}</p>
                          </div>
                        )}
                        {item.origen_abastecimiento && (
                          <div>
                            <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-1">Origen</p>
                            <p className="text-(--zaire-text)">{item.origen_abastecimiento}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {item.additional_observation && (
                      <div>
                        <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-1">Observación</p>
                        <p className="text-sm text-(--zaire-text) italic">{item.additional_observation}</p>
                      </div>
                    )}
                    {item.diagnosis && (
                      <div>
                        <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-1">Diagnóstico</p>
                        <p className="text-sm text-(--zaire-text)">{item.diagnosis}</p>
                      </div>
                    )}
                    {item.work_performed && (
                      <div>
                        <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-1">Trabajo realizado</p>
                        <p className="text-sm text-(--zaire-text)">{item.work_performed}</p>
                      </div>
                    )}
                    {item.notes && (
                      <div>
                        <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase mb-1">Notas</p>
                        <p className="text-sm text-(--zaire-text)">{item.notes}</p>
                      </div>
                    )}
                    {/* Estado de trabajo del ítem */}
                    <div className="border-t border-(--zaire-border) pt-3 space-y-2">
                      <p className="text-xs font-semibold text-(--zaire-text-muted) uppercase tracking-wide">Estado de trabajo</p>
                      <div className="flex gap-2 flex-wrap">
                        {(["pendiente", "en_proceso", "completado", "entregado"] as const).map((s) => {
                          const labels: Record<string, string> = {
                            pendiente: "Pendiente",
                            en_proceso: "En Proceso",
                            completado: "Completado",
                            entregado: "Entregado",
                          };
                          const active = item.status === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => updateItemStatus(item.id, s)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                active
                                  ? "bg-zaire-navy text-white border-zaire-navy"
                                  : "bg-panel text-(--zaire-text-muted) border-(--zaire-border) hover:border-zaire-navy-mid hover:text-(--zaire-text)"
                              )}
                            >
                              {active && "✓ "}{labels[s]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Checklist vertical de estado */}
                    <div className="border-t border-(--zaire-border) pt-3">
                      <ItemStatusChecklist
                        values={item}
                        quantity={item.quantity}
                        onToggle={(flag, newValue) => toggleItemFlag(item.id, flag, newValue)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!localItems.length && (
            <div className="zaire-card p-10 text-center text-(--zaire-text-muted) text-sm">
              Sin ítems registrados
            </div>
          )}
          {/* Totales */}
          <div className="zaire-card p-4 flex justify-end">
            <div className="text-right space-y-1">
              <div>
                <p className="text-xs text-(--zaire-text-muted) uppercase tracking-wide">Total USD</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(order.total, "USD")}</p>
              </div>
              {totalArs > 0 && (
                <div>
                  <p className="text-xs text-(--zaire-text-muted) uppercase tracking-wide">Total ARS</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalArs, "ARS")}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial">
          <div className="zaire-card p-6">
            {history.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-(--zaire-border)" />
                <div className="space-y-6">
                  {history.map((entry, i) => (
                    <div key={entry.id} className="relative flex gap-4 pl-10">
                      <div className={cn(
                        "absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center border-2",
                        i === history.length - 1
                          ? "bg-zaire-navy border-zaire-navy text-white"
                          : "bg-panel border-(--zaire-border)"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", i === history.length - 1 ? "bg-panel" : "bg-slate-400")} />
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.old_status && (
                            <>
                              <OrderStatusBadge status={entry.old_status as OrderStatus} />
                              <ArrowRight className="w-3.5 h-3.5 text-(--zaire-text-muted)" />
                            </>
                          )}
                          <OrderStatusBadge status={entry.new_status as OrderStatus} />
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-(--zaire-text) mt-1.5 italic">&quot;{entry.notes}&quot;</p>
                        )}
                        <p className="text-xs text-(--zaire-text-muted) mt-1">
                          {entry.profiles?.full_name ?? "Sistema"} · {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-center text-(--zaire-text-muted) py-8">Sin historial disponible</p>
            )}
          </div>
        </TabsContent>

        {/* Tab: Adjuntos */}
        <TabsContent value="adjuntos">
          <OrderAttachments
            workOrderId={order.id}
            items={localItems.map((it) => ({ id: it.id, label: `#${it.item_number} · ${it.products?.name ?? it.custom_description ?? it.serial_number ?? "Ítem"}` }))}
            initialAttachments={attachments}
            currentProfile={currentProfile ? { id: currentProfile.id } : null}
          />
        </TabsContent>

        {/* Tab: Cambiar Estado */}
        {!isTerminal && (
          <TabsContent value="estado">
            <div className="zaire-card p-6 max-w-lg">
              <h3 className="font-semibold text-(--zaire-text) mb-4">Cambiar estado de la orden</h3>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-(--zaire-text-muted)">Estado actual:</span>
                <OrderStatusBadge status={currentStatus} />
              </div>
              {allowedNext.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nuevo estado *</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus((v ?? "") as OrderStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar nuevo estado..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNext.map((s) => (
                          <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notas del cambio</Label>
                    <Textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Observaciones sobre el cambio de estado..."
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => setConfirmStatusOpen(true)}
                    disabled={!newStatus || changingStatus}
                    className="bg-zaire-navy-mid hover:bg-zaire-navy text-white"
                  >
                    Cambiar estado
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-(--zaire-text-muted)">No hay transiciones disponibles desde el estado actual.</p>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <ConfirmDialog
        open={confirmStatusOpen}
        onOpenChange={(o) => { if (!o) setConfirmStatusOpen(false); }}
        title="¿Confirmar cambio de estado?"
        description={
          newStatus
            ? `Vas a cambiar la orden de "${ORDER_STATUS_LABELS[currentStatus]}" a "${ORDER_STATUS_LABELS[newStatus]}". Esta acción queda registrada en el historial y no puede revertirse.`
            : ""
        }
        confirmLabel={newStatus === "cancelada" ? "Sí, cancelar orden" : "Sí, cambiar estado"}
        variant={newStatus === "cancelada" ? "destructive" : "default"}
        loading={changingStatus}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
