// types.ts — src/lib/crm/types.ts — 2026-07-16
// Tipos TypeScript de las tablas crm_ (Zaire CRM). Espejo del SQL en
// .docs/zaire-crm/sql/zaire_crm_schema.sql. Reutiliza tipos compartidos de database.ts.

import type { Client, Profile } from "@/lib/types/database";

// Reexport de tipos compartidos (no se redefinen)
export type { Client, Profile };

// ---------- Uniones (espejo de los CHECK del SQL) ----------
export type LeadSource =
  | "web"
  | "referido"
  | "visita_comercial"
  | "llamada"
  | "email"
  | "evento"
  | "otro";

export type LeadStatus =
  | "nuevo"
  | "contactado"
  | "calificado"
  | "convertido"
  | "descartado";

// Etapas dinámicas: la clave es un string libre definido en crm_pipeline_stages.
export type OpportunityStage = string;

export interface CrmPipelineStage {
  key: string;
  name: string;
  position: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export type ActivityType = "llamada" | "email" | "reunion" | "nota" | "tarea";

export type CrmCurrency = "ARS" | "USD";

// ---------- Tablas ----------
export interface CrmLead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource | null;
  status: LeadStatus;
  owner_id: string | null;
  estimated_value: number | null;
  currency: CrmCurrency;
  notes: string | null;
  discard_reason: string | null;
  converted_client_id: string | null;
  converted_at: string | null;
  // Propiedades extra (ficha rica) — zaire_crm_extras.sql
  industry: string | null;
  website: string | null;
  score: number | null;
  next_action_at: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  owner?: Pick<Profile, "id" | "full_name"> | null;
  converted_client?: Pick<Client, "id" | "business_name"> | null;
}

export interface CrmContact {
  id: string;
  client_id: string | null;
  lead_id: string | null;
  full_name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  client?: Pick<Client, "id" | "business_name"> | null;
  lead?: Pick<CrmLead, "id" | "company_name" | "contact_name"> | null;
}

export interface CrmOpportunity {
  id: string;
  title: string;
  client_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  stage: OpportunityStage;
  amount: number | null;
  currency: CrmCurrency;
  probability: number | null;
  expected_close_date: string | null;
  owner_id: string | null;
  lost_reason: string | null;
  notes: string | null;
  next_action_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  client?: Pick<Client, "id" | "business_name"> | null;
  lead?: Pick<CrmLead, "id" | "company_name" | "contact_name"> | null;
  contact?: Pick<CrmContact, "id" | "full_name"> | null;
  owner?: Pick<Profile, "id" | "full_name"> | null;
}

export interface CrmActivity {
  id: string;
  activity_type: ActivityType;
  subject: string | null;
  body: string | null;
  opportunity_id: string | null;
  client_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  due_at: string | null;
  done: boolean;
  done_at: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  opportunity?: Pick<CrmOpportunity, "id" | "title"> | null;
  client?: Pick<Client, "id" | "business_name"> | null;
  lead?: Pick<CrmLead, "id" | "company_name" | "contact_name"> | null;
  contact?: Pick<CrmContact, "id" | "full_name"> | null;
  creator?: Pick<Profile, "id" | "full_name"> | null;
}

export type CrmAttachmentEntity = "lead" | "contact" | "client" | "opportunity" | "quote";

export interface CrmAttachment {
  id: string;
  entity_type: CrmAttachmentEntity;
  entity_id: string;
  category: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  size_bytes: number | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

// ---------- Cotizaciones (Fase B) ----------
export type QuoteStatus = "borrador" | "enviada" | "aceptada" | "rechazada" | "vencida";

export interface CrmQuoteItem {
  id: string;
  quote_id: string;
  item_number: number;
  product_id: string | null;
  description: string;
  specs: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface CrmQuote {
  id: string;
  quote_number: string | null;
  opportunity_id: string | null;
  client_id: string | null;
  title: string;
  status: QuoteStatus;
  currency: CrmCurrency;
  valid_until: string | null;
  terms: string | null;
  notes: string | null;
  subtotal: number;
  total_cost: number;
  margin_amount: number;
  margin_pct: number;
  tax_pct: number;
  tax_amount: number;
  total: number;
  generated_work_order_id: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  client?: Pick<Client, "id" | "business_name"> | null;
  opportunity?: Pick<CrmOpportunity, "id" | "title"> | null;
  items?: CrmQuoteItem[];
}

export interface CrmPriceHistory {
  id: string;
  product_id: string | null;
  description: string | null;
  unit_price: number;
  unit_cost: number | null;
  currency: CrmCurrency;
  quote_id: string | null;
  created_at: string;
}

// Cuenta B2B = cliente (master data) enriquecido con rollups comerciales del CRM.
export interface CrmAccount {
  client: Client;
  contactsCount: number;
  openOpportunities: number;
  pipelineArs: number;
  pipelineUsd: number;
  lastActivityAt: string | null;
  score: number; // salud/engagement de la cuenta (0-100)
}
