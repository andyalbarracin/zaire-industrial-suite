// queries.ts — src/lib/stock/queries.ts — 2026-07-18
// Lecturas tipadas de Zaire Stock (Server Components). Las tablas stock_ no están en
// el tipo Database, así que se accede con el cliente casteado y se castea el resultado.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Warehouse, StockLevel, StockMovement, StockSerial, StockReservation } from "@/lib/stock/types";

const LEVEL_SELECT = `
  id, product_id, warehouse_id, on_hand, reserved, available, avg_cost, min_qty, created_at, updated_at,
  product:products(id, code, name, unit, category, brand, model, default_currency),
  warehouse:stock_warehouses(id, code, name, type)
`;

const MOVEMENT_SELECT = `
  id, doc_number, product_id, warehouse_id, type, qty, unit_cost, ref_type, ref_id,
  counterparty_warehouse_id, serial, lot, notes, created_by, created_at,
  product:products(id, code, name, unit),
  warehouse:stock_warehouses(id, code, name, type)
`;

export const getWarehouses = cache(async (includeInactive = false): Promise<Warehouse[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let q = sb.from("stock_warehouses").select("*").is("deleted_at", null).order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []) as Warehouse[];
});

export const getStockLevels = cache(async (): Promise<StockLevel[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("stock_levels").select(LEVEL_SELECT).order("updated_at", { ascending: false });
  return (data ?? []) as StockLevel[];
});

export const getLowStockLevels = cache(async (): Promise<StockLevel[]> => {
  const levels = await getStockLevels();
  return levels.filter((l) => l.min_qty > 0 && l.on_hand <= l.min_qty);
});

export const getStockMovements = cache(async (limit = 100): Promise<StockMovement[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("stock_movements").select(MOVEMENT_SELECT).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as StockMovement[];
});

// Kardex de un producto: niveles por depósito + historial de movimientos + series.
export const getProductStock = cache(async (productId: string): Promise<{
  levels: StockLevel[];
  movements: StockMovement[];
  serials: StockSerial[];
}> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [levels, movements, serials] = await Promise.all([
    sb.from("stock_levels").select(LEVEL_SELECT).eq("product_id", productId),
    sb.from("stock_movements").select(MOVEMENT_SELECT).eq("product_id", productId).order("created_at", { ascending: false }).limit(200),
    sb.from("stock_serials").select("*, warehouse:stock_warehouses(id, name)").eq("product_id", productId).order("created_at", { ascending: false }),
  ]);
  return {
    levels: (levels.data ?? []) as StockLevel[],
    movements: (movements.data ?? []) as StockMovement[],
    serials: (serials.data ?? []) as StockSerial[],
  };
});

export const getSerials = cache(async (): Promise<StockSerial[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("stock_serials")
    .select("*, product:products(id, code, name), warehouse:stock_warehouses(id, name)")
    .order("created_at", { ascending: false });
  return (data ?? []) as StockSerial[];
});

export const getReservations = cache(async (): Promise<StockReservation[]> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data } = await sb.from("stock_reservations")
    .select("*, product:products(id, code, name, unit), warehouse:stock_warehouses(id, name)")
    .order("created_at", { ascending: false });
  return (data ?? []) as StockReservation[];
});

// KPIs del dashboard (se calculan desde los niveles + un conteo de movimientos del mes).
export const getStockDashboardStats = cache(async (): Promise<{
  valueByCurrency: { name: string; value: number }[];
  skuCount: number;
  lowStockCount: number;
  warehouseCount: number;
  movementsThisMonth: number;
}> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const [levels, warehouses] = await Promise.all([getStockLevels(), getWarehouses()]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count } = await sb.from("stock_movements").select("id", { count: "exact", head: true }).gte("created_at", monthStart);

  // Valor por moneda (no se suman monedas distintas).
  const byCur: Record<string, number> = {};
  for (const l of levels) { const c = l.product?.default_currency ?? "ARS"; byCur[c] = (byCur[c] ?? 0) + l.on_hand * l.avg_cost; }
  const valueByCurrency = Object.entries(byCur).map(([name, value]) => ({ name, value })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const skus = new Set(levels.filter((l) => l.on_hand > 0).map((l) => l.product_id));
  const lowStockCount = levels.filter((l) => l.min_qty > 0 && l.on_hand <= l.min_qty).length;

  return {
    valueByCurrency,
    skuCount: skus.size,
    lowStockCount,
    warehouseCount: warehouses.length,
    movementsThisMonth: count ?? 0,
  };
});
