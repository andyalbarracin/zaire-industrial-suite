// database.ts — src/lib/types/database.ts — 2026-05-27
// Tipos TypeScript para todas las tablas de Supabase / Zaire Trace

export type OrderStatus =
  | "ingresada"
  | "en_revision"
  | "cotizada"
  | "aprobada"
  | "en_reparacion"
  | "lista_para_entregar"
  | "remitido"
  | "facturada"
  | "cancelada";

export type OrderType = "OT" | "OTS";
export type Currency = "USD" | "ARS";
export type UserRole = "admin" | "operator" | "viewer";
export type ItemStatus = "pendiente" | "en_proceso" | "completado" | "entregado";
export type ProductCategory =
  | "sello_mecanico"
  | "bomba"
  | "empaquetadura"
  | "spare_part"
  | "otro";
export type AuditAction = "create" | "update" | "delete" | "status_change";

export interface Branch {
  id: string;
  name: string;
  code_ot: string;
  code_ots: string;
  digits_ot: number;
  digits_ots: number;
  is_active: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  business_name: string;
  tax_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  is_active: boolean;
  client_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  category: ProductCategory | null;
  brand: string | null;
  model: string | null;
  unit: string;
  default_currency: Currency;
  default_unit_price: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  order_number: string;
  order_type: OrderType;
  client_id: string | null;
  branch_id: string;
  date_in: string;
  date_due: string | null;
  status: OrderStatus;
  currency: Currency;
  subtotal: number;
  tax_amount: number;
  total: number;
  requiere_compra: string | null;
  // Deprecated at order level — now computed from items
  is_remitted: boolean;
  is_delivered: boolean;
  is_invoiced: boolean;
  general_notes: string | null;
  orden_compra: string | null;
  remito_salida: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  client?: Client;
  items?: WorkOrderItem[];
}

export interface WorkOrderItem {
  id: string;
  work_order_id: string;
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
  status: ItemStatus;
  notes: string | null;
  // Campos técnicos del sello
  modelo: string | null;
  medida: string | null;
  unidad_medida: "MM" | "PULG" | null;
  marca: string | null;
  materiales_caras: string | null;
  materiales_orings: string | null;
  origen_abastecimiento: string | null;
  orden_compra_item: string | null;
  // Estados por ítem (semáforo)
  is_quoted: boolean;
  is_remitted: boolean;
  qty_remitted: number;
  is_delivered: boolean;
  qty_delivered: number;
  is_invoiced: boolean;
  qty_invoiced: number;
  created_at: string;
  updated_at: string;
  // Joins
  product?: Product;
}

export interface WorkOrderStatusHistory {
  id: string;
  work_order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  // Joins
  profile?: Profile;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  description: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export interface CompanySettings {
  id: number;
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  logo_url: string | null;
  logo_use_in_pdfs: boolean;
  updated_at: string;
  updated_by: string | null;
}

// Database type for Supabase generic client
export type Database = {
  public: {
    Tables: {
      branches: {
        Row: Branch;
        Insert: Omit<Branch, "id">;
        Update: Partial<Omit<Branch, "id">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Client, "id" | "created_at">>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Product, "id" | "created_at">>;
      };
      work_orders: {
        Row: WorkOrder;
        Insert: Omit<WorkOrder, "id" | "created_at" | "updated_at" | "client" | "items">;
        Update: Partial<Omit<WorkOrder, "id" | "created_at" | "client" | "items">>;
      };
      work_order_items: {
        Row: WorkOrderItem;
        Insert: Omit<WorkOrderItem, "id" | "created_at" | "updated_at" | "product">;
        Update: Partial<Omit<WorkOrderItem, "id" | "created_at" | "product">>;
      };
      work_order_status_history: {
        Row: WorkOrderStatusHistory;
        Insert: Omit<WorkOrderStatusHistory, "id" | "created_at" | "profile">;
        Update: Partial<Omit<WorkOrderStatusHistory, "id" | "created_at">>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: never;
      };
    };
    Functions: {
      generate_order_number: {
        Args: { p_order_type: string; p_branch_id: string };
        Returns: string;
      };
    };
  };
};
