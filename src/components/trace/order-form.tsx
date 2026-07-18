"use client";
// order-form.tsx — src/components/trace/order-form.tsx — 2026-05-27
// Formulario completo para crear y editar órdenes de trabajo con ítems

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ClientSelect } from "@/components/clients/client-select";
import { ProductSelect } from "@/components/products/product-select";
import { ItemStatusChecklist } from "./item-status-checklist";
import { formatCurrency } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { BRANCHES, MARCAS, UNIDADES_MEDIDA } from "@/lib/constants";
import type { Client, Product, WorkOrder, WorkOrderItem, Currency } from "@/lib/types/database";

const itemSchema = z.object({
  product_id: z.string().nullable(),
  custom_description: z.string().optional(),
  quantity: z.number().min(1, "Cantidad mínima: 1"),
  serial_number: z.string().optional(),
  equipment_number: z.string().optional(),
  additional_observation: z.string().optional(),
  unit_price: z.number().min(0),
  unit_price_ars: z.number().min(0),
  repair_required: z.boolean(),
  notes: z.string().optional(),
  // Campos técnicos del sello
  modelo: z.string().optional(),
  medida: z.string().optional(),
  unidad_medida: z.enum(["MM", "PULG"]).optional().nullable(),
  marca: z.string().optional(),
  materiales_caras: z.string().optional(),
  materiales_orings: z.string().optional(),
  origen_abastecimiento: z.string().optional(),
  orden_compra_item: z.string().optional(),
  // Estados del ítem
  is_quoted: z.boolean(),
  is_remitted: z.boolean(),
  qty_remitted: z.number().min(0),
  is_delivered: z.boolean(),
  qty_delivered: z.number().min(0),
  is_invoiced: z.boolean(),
  qty_invoiced: z.number().min(0),
});

const orderSchema = z.object({
  branch_id: z.string().min(1, "La sucursal es obligatoria"),
  order_type: z.enum(["OT", "OTS"]),
  client_id: z.string().nullable(),
  date_in: z.string().min(1),
  date_due: z.string().optional(),
  currency: z.enum(["USD", "ARS"]),
  requiere_compra: z.string().optional().nullable(),
  orden_compra: z.string().optional(),
  remito_salida: z.string().optional(),
  general_notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Debe agregar al menos un ítem"),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  clients: Pick<Client, "id" | "business_name" | "tax_id">[];
  products: Pick<Product, "id" | "code" | "name" | "brand" | "model" | "category" | "unit" | "default_currency" | "default_unit_price">[];
  defaultClientId?: string;
  order?: WorkOrder;
  orderItems?: WorkOrderItem[];
}

const PRESET_MARCAS = MARCAS.filter((m) => m !== "OTRO");

export function OrderForm({ clients, products, defaultClientId, order, orderItems }: OrderFormProps) {
  const router = useRouter();
  const isEdit = !!order;

  // Tracks the dropdown selection per item — "OTRO" means free-text mode
  const [marcaDisplay, setMarcaDisplay] = useState<string[]>(() =>
    (orderItems ?? []).map((item) => {
      if (!item.marca) return "";
      return (PRESET_MARCAS as readonly string[]).includes(item.marca) ? item.marca : "OTRO";
    })
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(orderSchema) as any,
    defaultValues: order
      ? {
          branch_id: order.branch_id ?? "bb",
          order_type: order.order_type,
          client_id: order.client_id,
          date_in: order.date_in.split("T")[0],
          date_due: order.date_due?.split("T")[0] ?? "",
          currency: order.currency,
          requiere_compra: order.requiere_compra ?? "",
          orden_compra: order.orden_compra ?? "",
          remito_salida: order.remito_salida ?? "",
          general_notes: order.general_notes ?? "",
          items: orderItems?.map((item) => ({
            product_id: item.product_id,
            custom_description: item.custom_description ?? "",
            quantity: item.quantity,
            serial_number: item.serial_number ?? "",
            equipment_number: item.equipment_number ?? "",
            additional_observation: item.additional_observation ?? "",
            unit_price: item.unit_price,
            unit_price_ars: item.unit_price_ars ?? 0,
            repair_required: item.repair_required,
            notes: item.notes ?? "",
            modelo: item.modelo ?? "",
            medida: item.medida ?? "",
            unidad_medida: item.unidad_medida ?? null,
            marca: item.marca ?? "",
            materiales_caras: item.materiales_caras ?? "",
            materiales_orings: item.materiales_orings ?? "",
            origen_abastecimiento: item.origen_abastecimiento ?? "",
            orden_compra_item: item.orden_compra_item ?? "",
            is_quoted: item.is_quoted ?? false,
            is_remitted: item.is_remitted ?? false,
            qty_remitted: item.qty_remitted ?? 0,
            is_delivered: item.is_delivered ?? false,
            qty_delivered: item.qty_delivered ?? 0,
            is_invoiced: item.is_invoiced ?? false,
            qty_invoiced: item.qty_invoiced ?? 0,
          })) ?? [],
        }
      : {
          branch_id: "bb",
          order_type: "OTS",
          client_id: defaultClientId ?? null,
          date_in: new Date().toISOString().split("T")[0],
          currency: "USD",
          requiere_compra: null,
          items: [{
            product_id: null, quantity: 1, unit_price: 0, unit_price_ars: 0, repair_required: false,
            is_quoted: false, is_remitted: false, qty_remitted: 0,
            is_delivered: false, qty_delivered: 0, is_invoiced: false, qty_invoiced: 0,
          }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const orderType = watch("order_type");
  const branchId = watch("branch_id");
  const currency = watch("currency") as Currency;
  const watchedItems = watch("items");

  const totalUsd = watchedItems.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unit_price ?? 0), 0);
  const totalArs = watchedItems.reduce((sum, item) => sum + (item.quantity ?? 0) * (item.unit_price_ars ?? 0), 0);

  function handleProductSelect(index: number, productId: string | null) {
    setValue(`items.${index}.product_id`, productId);
    if (productId) {
      const product = products.find((p) => p.id === productId);
      if (product?.default_unit_price) {
        setValue(`items.${index}.unit_price`, product.default_unit_price);
      }
    }
  }

  function handleMarcaSelect(index: number, value: string) {
    const newDisplay = [...marcaDisplay];
    newDisplay[index] = value;
    setMarcaDisplay(newDisplay);
    if (value !== "OTRO") {
      setValue(`items.${index}.marca`, value);
    } else {
      setValue(`items.${index}.marca`, "");
    }
  }

  async function onSubmit(data: OrderFormData) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();

    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const subtotalArs = data.items.reduce((sum, item) => sum + item.quantity * (item.unit_price_ars ?? 0), 0);

    if (isEdit && order) {
      const { error: orderError } = await sb.from("work_orders").update({
        order_type: data.order_type, client_id: data.client_id, date_in: data.date_in,
        date_due: data.date_due || null, currency: data.currency,
        requiere_compra: data.requiere_compra || null,
        orden_compra: data.orden_compra || null,
        remito_salida: data.remito_salida || null,
        general_notes: data.general_notes || null, subtotal, total: subtotal, updated_by: user?.id,
      }).eq("id", order.id);

      if (orderError) { toast.error("Error al actualizar la orden"); return; }

      await sb.from("work_order_items").delete().eq("work_order_id", order.id);
      const itemsToInsert = data.items.map((item, i) => buildItemPayload(item, order.id, i + 1));
      await sb.from("work_order_items").insert(itemsToInsert);
      toast.success("Orden actualizada");
      router.push(ROUTES.trace.orden(order.id));
      return;
    }

    const { data: orderNumber, error: seqError } = await sb.rpc("generate_order_number", {
      p_order_type: data.order_type,
      p_branch_id: data.branch_id,
    });
    if (seqError || !orderNumber) {
      toast.error(`Error al generar número de orden: ${seqError?.message ?? "Sin respuesta"}`);
      return;
    }

    const { data: newOrder, error: orderError } = await sb.from("work_orders").insert({
      order_number: orderNumber, order_type: data.order_type, branch_id: data.branch_id,
      client_id: data.client_id, date_in: data.date_in, date_due: data.date_due || null,
      status: "ingresada", currency: data.currency, subtotal, total: subtotal,
      requiere_compra: data.requiere_compra || null,
      orden_compra: data.orden_compra || null,
      remito_salida: data.remito_salida || null,
      general_notes: data.general_notes || null, created_by: user?.id,
    }).select("id").single();

    if (orderError || !newOrder) { toast.error("Error al crear la orden"); return; }

    const itemsToInsert = data.items.map((item, i) => buildItemPayload(item, newOrder.id, i + 1));
    await sb.from("work_order_items").insert(itemsToInsert);
    await sb.from("work_order_status_history").insert({
      work_order_id: newOrder.id, old_status: null, new_status: "ingresada",
      changed_by: user?.id, notes: "Orden creada",
    });
    await sb.from("audit_logs").insert({
      entity_type: "work_order", entity_id: newOrder.id, action: "create",
      description: `Orden ${orderNumber} creada`, user_id: user?.id, user_name: user?.email,
    });

    toast.success(`Orden ${orderNumber} creada exitosamente`);
    router.push(ROUTES.trace.orden(newOrder.id));
  }

  function buildItemPayload(item: OrderFormData["items"][number], orderId: string, itemNumber: number) {
    return {
      work_order_id: orderId, item_number: itemNumber,
      product_id: item.product_id,
      custom_description: item.custom_description || null,
      quantity: item.quantity,
      serial_number: item.serial_number || null,
      equipment_number: item.equipment_number || null,
      additional_observation: item.additional_observation || null,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      repair_required: item.repair_required,
      notes: item.notes || null,
      status: "pendiente",
      modelo: item.modelo || null,
      medida: item.medida || null,
      unidad_medida: item.unidad_medida || null,
      marca: item.marca || null,
      materiales_caras: item.materiales_caras || null,
      materiales_orings: item.materiales_orings || null,
      origen_abastecimiento: item.origen_abastecimiento || null,
      orden_compra_item: item.orden_compra_item || null,
      is_quoted: item.is_quoted ?? false,
      is_remitted: item.is_remitted ?? false,
      qty_remitted: item.qty_remitted ?? 0,
      is_delivered: item.is_delivered ?? false,
      qty_delivered: item.qty_delivered ?? 0,
      is_invoiced: item.is_invoiced ?? false,
      qty_invoiced: item.qty_invoiced ?? 0,
    };
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Card 1: Datos Generales */}
      <div className="zaire-card p-6">
        <h2 className="font-semibold text-(--zaire-text) mb-5">Datos Generales</h2>

        {/* Sucursal */}
        <div className="mb-5">
          <Label className="mb-2 block">Sucursal *</Label>
          {isEdit ? (
            <div className="space-y-1">
              <div className="h-10 px-3 rounded-md border border-(--zaire-border) bg-subtle-2 flex items-center text-sm text-(--zaire-text-muted)">
                {BRANCHES.find((b) => b.id === branchId)?.name ?? branchId}
              </div>
              <p className="text-xs text-(--zaire-text-muted)">El tipo y la sucursal no pueden modificarse después de la creación</p>
            </div>
          ) : (
            <Select value={branchId} onValueChange={(v) => { if (v) setValue("branch_id", v); }}>
              <SelectTrigger>
                <SelectValue>
                  {(() => {
                    const b = BRANCHES.find((b) => b.id === branchId);
                    if (!b) return <span className="text-muted-foreground">Seleccionar sucursal...</span>;
                    return (
                      <span className="flex items-center gap-2">
                        {b.name}
                        <span className="text-xs text-(--zaire-text-muted) font-mono">({b.code})</span>
                      </span>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="flex items-center gap-2">
                      {b.name}
                      <span className="text-xs text-(--zaire-text-muted) font-mono">({b.code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.branch_id && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{errors.branch_id.message}</p>}
        </div>

        {/* Tipo de orden */}
        <div className="mb-6">
          <Label className="mb-2 block">Tipo de orden *</Label>
          {isEdit ? (
            <div className="space-y-1">
              <div className="h-10 px-3 rounded-md border border-(--zaire-border) bg-subtle-2 flex items-center text-sm text-(--zaire-text-muted)">
                {orderType === "OT" ? "OT — Venta / Mercadería nueva" : "OTS — Servicio / Reparación"}
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {(["OT", "OTS"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue("order_type", type)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-semibold transition-all ${
                    orderType === type
                      ? type === "OT"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                        : "border-orange-500 bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300"
                      : "border-(--zaire-border) text-(--zaire-text-muted) hover:border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {type === "OT" ? "OT — Venta / Mercadería nueva" : "OTS — Servicio / Reparación"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Cliente</Label>
            <ClientSelect
              clients={clients as Client[]}
              value={watch("client_id")}
              onChange={(id) => setValue("client_id", id)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de ingreso *</Label>
            <Input type="date" {...register("date_in")} />
            {errors.date_in && <p className="text-xs text-red-600 dark:text-red-300">{errors.date_in.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Fecha estimada de entrega</Label>
            <Input type="date" {...register("date_due")} />
          </div>

          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => setValue("currency", (v ?? "USD") as "USD" | "ARS")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — Dólares</SelectItem>
                <SelectItem value="ARS">ARS — Pesos argentinos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {orderType === "OT" && (
            <div className="space-y-1.5">
              <Label>Disponibilidad</Label>
              <Select
                value={watch("requiere_compra") ?? ""}
                onValueChange={(v) => setValue("requiere_compra", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK">STOCK</SelectItem>
                  <SelectItem value="REQUIERE COMPRA">REQUIERE COMPRA</SelectItem>
                  <SelectItem value="MIX">MIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* OC del cliente (siempre visible) */}
          <div className="space-y-1.5">
            <Label>Orden de compra (OC del cliente)</Label>
            <Input {...register("orden_compra")} placeholder="Nro. de OC del cliente..." />
          </div>

          {/* Remito de salida (solo OTS) */}
          {orderType === "OTS" && (
            <div className="space-y-1.5">
              <Label>Remito de salida</Label>
              <Input {...register("remito_salida")} placeholder="Nro. de remito de salida..." />
            </div>
          )}

          <div className="space-y-1.5 lg:col-span-2">
            <Label>Observaciones generales</Label>
            <Textarea
              {...register("general_notes")}
              placeholder="Notas sobre la orden, condiciones especiales, referencias..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Card 2: Ítems */}
      <div className="zaire-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-(--zaire-text)">Ítems</h2>
          <div className="flex items-center gap-2">
            {fields.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const src = watchedItems[fields.length - 1];
                  const srcDisplay = marcaDisplay[fields.length - 1] ?? "";
                  append({
                    product_id: src.product_id ?? null,
                    custom_description: src.custom_description ?? "",
                    quantity: src.quantity,
                    serial_number: "",
                    equipment_number: "",
                    additional_observation: src.additional_observation ?? "",
                    unit_price: src.unit_price,
                    unit_price_ars: src.unit_price_ars ?? 0,
                    repair_required: src.repair_required,
                    notes: src.notes ?? "",
                    modelo: src.modelo ?? "",
                    medida: src.medida ?? "",
                    unidad_medida: src.unidad_medida ?? null,
                    marca: src.marca ?? "",
                    materiales_caras: src.materiales_caras ?? "",
                    materiales_orings: src.materiales_orings ?? "",
                    origen_abastecimiento: src.origen_abastecimiento ?? "",
                    orden_compra_item: "",
                    is_quoted: false, is_remitted: false, qty_remitted: 0,
                    is_delivered: false, qty_delivered: 0, is_invoiced: false, qty_invoiced: 0,
                  });
                  setMarcaDisplay((prev) => [...prev, srcDisplay]);
                }}
              >
                <Copy className="w-4 h-4 mr-1.5" /> Duplicar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                append({
                  product_id: null, quantity: 1, unit_price: 0, unit_price_ars: 0, repair_required: false,
                  is_quoted: false, is_remitted: false, qty_remitted: 0,
                  is_delivered: false, qty_delivered: 0, is_invoiced: false, qty_invoiced: 0,
                });
                setMarcaDisplay((prev) => [...prev, ""]);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Agregar ítem
            </Button>
          </div>
        </div>

        {errors.items && typeof errors.items === "object" && "message" in errors.items && (
          <p className="text-sm text-red-600 dark:text-red-300 mb-3">{(errors.items as { message?: string }).message}</p>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => {
            const itemQty = watchedItems[index]?.quantity ?? 1;
            const itemPrice = watchedItems[index]?.unit_price ?? 0;
            const itemTotal = itemQty * itemPrice;
            const currentMarcaDisplay = marcaDisplay[index] ?? "";
            const isOtroMarca = currentMarcaDisplay === "OTRO";

            return (
              <div key={field.id} className="border border-(--zaire-border) rounded-lg p-4 bg-subtle/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-(--zaire-text-muted) uppercase tracking-wide">
                    Ítem #{index + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Duplicar ítem"
                      onClick={() => {
                        const src = watchedItems[index];
                        append({
                          product_id: src.product_id ?? null,
                          custom_description: src.custom_description ?? "",
                          quantity: src.quantity,
                          serial_number: "",
                          equipment_number: "",
                          additional_observation: src.additional_observation ?? "",
                          unit_price: src.unit_price,
                          unit_price_ars: src.unit_price_ars ?? 0,
                          repair_required: src.repair_required,
                          notes: src.notes ?? "",
                          modelo: src.modelo ?? "",
                          medida: src.medida ?? "",
                          unidad_medida: src.unidad_medida ?? null,
                          marca: src.marca ?? "",
                          materiales_caras: src.materiales_caras ?? "",
                          materiales_orings: src.materiales_orings ?? "",
                          origen_abastecimiento: src.origen_abastecimiento ?? "",
                          orden_compra_item: "",
                          is_quoted: false,
                          is_remitted: false,
                          qty_remitted: 0,
                          is_delivered: false,
                          qty_delivered: 0,
                          is_invoiced: false,
                          qty_invoiced: 0,
                        });
                        setMarcaDisplay((prev) => {
                          const srcDisplay = prev[index] ?? "";
                          return [...prev, srcDisplay];
                        });
                      }}
                      className="text-(--zaire-text-muted) hover:text-zaire-blue transition-colors p-1 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          remove(index);
                          setMarcaDisplay((prev) => prev.filter((_, i) => i !== index));
                        }}
                        className="text-red-400 hover:text-red-600 dark:text-red-300 transition-colors p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Layout: campos izquierda, checklist derecha */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_210px] gap-4 mt-4">
                <div className="space-y-4">
                {/* Producto y cantidad */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2 space-y-1.5">
                    <Label>Producto / Servicio</Label>
                    <ProductSelect
                      products={products as Product[]}
                      value={watchedItems[index]?.product_id ?? null}
                      onChange={(id) => handleProductSelect(index, id)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      min={1}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {!watchedItems[index]?.product_id && (
                  <div className="space-y-1.5">
                    <Label>Descripción libre *</Label>
                    <Input
                      {...register(`items.${index}.custom_description`)}
                      placeholder="Descripción del ítem o servicio..."
                    />
                  </div>
                )}

                {/* Nro serie y equipo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Número de serie</Label>
                    <Input {...register(`items.${index}.serial_number`)} placeholder="SN-..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Número de equipo / TAG</Label>
                    <Input {...register(`items.${index}.equipment_number`)} placeholder="P-101, K-201..." />
                  </div>
                </div>

                {/* Modelo */}
                <div className="space-y-1.5">
                  <Label>Modelo</Label>
                  <Input {...register(`items.${index}.modelo`)} placeholder="Tipo 1, ISC2, MG1..." />
                </div>

                {/* Medida y unidad */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Medida</Label>
                    <Input {...register(`items.${index}.medida`)} placeholder='Ej: 1.750' />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unidad</Label>
                    <Select
                      value={watchedItems[index]?.unidad_medida ?? ""}
                      onValueChange={(v) => setValue(`items.${index}.unidad_medida`, (v || null) as "MM" | "PULG" | null)}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {UNIDADES_MEDIDA.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Marca */}
                <div className="space-y-1.5">
                  <Label>Marca</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={currentMarcaDisplay}
                      onValueChange={(v) => handleMarcaSelect(index, v ?? "")}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar marca..." /></SelectTrigger>
                      <SelectContent>
                        {MARCAS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isOtroMarca && (
                      <Input
                        {...register(`items.${index}.marca`)}
                        placeholder="Escribir marca..."
                      />
                    )}
                  </div>
                </div>

                {/* Materiales */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Materiales Caras</Label>
                    <Input {...register(`items.${index}.materiales_caras`)} placeholder="Ej: TC/TC, SIC/CAR" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Materiales O&apos;rings</Label>
                    <Input {...register(`items.${index}.materiales_orings`)} placeholder="Ej: Viton, EPDM" />
                  </div>
                </div>

                {/* Origen/Abastecimiento */}
                <div className="space-y-1.5">
                  <Label>Origen / Abastecimiento</Label>
                  <Input
                    {...register(`items.${index}.origen_abastecimiento`)}
                    placeholder="Ej: PO CF1023, NP CF-L1026, STOCK"
                  />
                </div>

                {/* Precio dual USD / ARS */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-blue-700 dark:text-blue-300">Precio Unit. USD</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-blue-700 dark:text-blue-300">Total USD</Label>
                      <div className="h-10 px-3 rounded-md border border-(--zaire-border) bg-subtle-2 flex items-center text-sm font-medium text-blue-700 dark:text-blue-300">
                        {formatCurrency(itemTotal, "USD")}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-emerald-700 dark:text-emerald-300">Precio Unit. ARS</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        {...register(`items.${index}.unit_price_ars`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-emerald-700 dark:text-emerald-300">Total ARS</Label>
                      <div className="h-10 px-3 rounded-md border border-(--zaire-border) bg-subtle-2 flex items-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        {formatCurrency((watchedItems[index]?.quantity ?? 0) * (watchedItems[index]?.unit_price_ars ?? 0), "ARS")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* OC por ítem (solo OTS) */}
                {orderType === "OTS" && (
                  <div className="space-y-1.5">
                    <Label>Orden de compra del ítem</Label>
                    <Input
                      {...register(`items.${index}.orden_compra_item`)}
                      placeholder="Nro. OC del cliente para este ítem..."
                    />
                  </div>
                )}

                {/* Observación */}
                <div className="space-y-1.5">
                  <Label>Observación adicional</Label>
                  <Input {...register(`items.${index}.additional_observation`)} placeholder="Observaciones específicas del ítem..." />
                </div>

                {/* Requiere reparación */}
                <div className="flex items-center gap-3">
                  <Switch
                    id={`repair_${index}`}
                    checked={watchedItems[index]?.repair_required ?? false}
                    onCheckedChange={(v) => setValue(`items.${index}.repair_required`, v)}
                  />
                  <Label htmlFor={`repair_${index}`}>Requiere reparación</Label>
                </div>

                </div>{/* end left column */}

                {/* Columna derecha: checklist de estado */}
                <div className="lg:pt-0">
                  <ItemStatusChecklist
                    values={{
                      is_quoted: watchedItems[index]?.is_quoted ?? false,
                      is_remitted: watchedItems[index]?.is_remitted ?? false,
                      is_delivered: watchedItems[index]?.is_delivered ?? false,
                      is_invoiced: watchedItems[index]?.is_invoiced ?? false,
                      qty_remitted: watchedItems[index]?.qty_remitted ?? 0,
                      qty_delivered: watchedItems[index]?.qty_delivered ?? 0,
                      qty_invoiced: watchedItems[index]?.qty_invoiced ?? 0,
                    }}
                    quantity={itemQty}
                    onToggle={(flag, newValue) => setValue(`items.${index}.${flag}`, newValue)}
                    onQtyChange={(qtyKey, newValue) => setValue(`items.${index}.${qtyKey}`, newValue)}
                  />
                </div>
                </div>{/* end grid */}
              </div>
            );
          })}
        </div>

        {/* Totales */}
        <div className="mt-4 flex justify-end">
          <div className="bg-zaire-navy text-white px-6 py-3 rounded-lg space-y-1">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium opacity-70 w-28">Total USD:</span>
              <span className="text-lg font-bold text-blue-200">{formatCurrency(totalUsd, "USD")}</span>
            </div>
            {totalArs > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium opacity-70 w-28">Total ARS:</span>
                <span className="text-lg font-bold text-emerald-200">{formatCurrency(totalArs, "ARS")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Acciones */}
      <div className="zaire-card p-5">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" asChild>
            <Link href={ROUTES.trace.ordenes}><ArrowLeft className="w-4 h-4 mr-1.5" /> Cancelar</Link>
          </Button>
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-zaire-navy-mid hover:bg-zaire-navy text-white px-8"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Guardar orden"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
