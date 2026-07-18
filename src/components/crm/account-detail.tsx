"use client";
// account-detail.tsx — src/components/crm/account-detail.tsx — 2026-07-17
// Ficha de cuenta B2B: datos del cliente + contactos, oportunidades, actividades,
// sucursales (field_sites con mapa si Field está on) y archivos. Reusa clients (master data).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, ExternalLink, Building2, Hash, User, Mail, Phone, MapPin, Star } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactForm } from "./contact-form";
import { ActivityTimeline } from "./activity-timeline";
import { CrmAttachments } from "./crm-attachments";
import { FieldMap, type MapMarker } from "@/components/field/field-map";
import { stageBadge } from "@/lib/crm/constants";
import { computeAccountScore } from "@/lib/crm/score";
import { formatCurrency, cn } from "@/lib/utils";
import type { CrmContact, CrmOpportunity, CrmActivity, CrmAttachment, CrmPipelineStage, Client } from "@/lib/crm/types";
import type { CrmClientSite } from "@/lib/crm/queries";

interface AccountDetailProps {
  client: Client;
  contacts: CrmContact[];
  opportunities: CrmOpportunity[];
  activities: CrmActivity[];
  sites: CrmClientSite[];
  attachments: CrmAttachment[];
  stages: CrmPipelineStage[];
  fieldEnabled: boolean;
  currentProfile: { id: string } | null;
}

export function AccountDetail(props: AccountDetailProps) {
  const { client, contacts, opportunities, activities, sites, attachments, stages, fieldEnabled, currentProfile } = props;
  const router = useRouter();
  const [contactOpen, setContactOpen] = useState(false);

  const stageByKey = new Map(stages.map((s) => [s.key, s]));
  const openOpps = opportunities.filter((o) => { const s = stageByKey.get(o.stage); return s ? !s.is_won && !s.is_lost : true; });
  const lastActivityAt = activities.reduce<string | null>((m, a) => (!m || a.created_at > m ? a.created_at : m), null);
  const score = computeAccountScore({
    openOpportunities: openOpps.length,
    pipelineArs: openOpps.filter((o) => o.currency === "ARS").reduce((s, o) => s + (Number(o.amount) || 0), 0),
    pipelineUsd: openOpps.filter((o) => o.currency === "USD").reduce((s, o) => s + (Number(o.amount) || 0), 0),
    contactsCount: contacts.length,
    lastActivityAt,
  });
  const scoreCls = score >= 66 ? "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30" : score >= 33 ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30" : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30";
  const siteMarkers: MapMarker[] = sites
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({ id: s.id, lat: s.latitude!, lng: s.longitude!, kind: "site", label: s.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={ROUTES.crm.cuentas} className="inline-flex items-center gap-1 text-sm text-(--zaire-text-muted) hover:text-zaire-blue mb-2">
            <ChevronLeft className="w-4 h-4" /> Volver a cuentas
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-(--zaire-text)">{client.business_name}</h1>
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border tabular-nums", scoreCls)} title="Score de salud de la cuenta (0-100)">
              Score {score}
            </span>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={ROUTES.cliente(client.id)}><ExternalLink className="w-4 h-4 mr-1.5" /> Ver en Administración</Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Datos de la cuenta */}
        <div className="zaire-card p-5 space-y-2.5 text-sm">
          <Row icon={Building2} label="Razón social" value={client.business_name} />
          <Row icon={Hash} label="CUIT" value={client.tax_id ?? "—"} />
          <Row icon={Hash} label="Código" value={client.client_code ?? "—"} />
          <Row icon={User} label="Contacto" value={client.contact_name ?? "—"} />
          <Row icon={Mail} label="Email" value={client.email ?? "—"} />
          <Row icon={Phone} label="Teléfono" value={client.phone ?? "—"} />
          <Row icon={MapPin} label="Ciudad" value={client.city ?? "—"} />
          {client.address && <Row icon={MapPin} label="Dirección" value={client.address} />}
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="contactos">
            <TabsList>
              <TabsTrigger value="contactos">Contactos ({contacts.length})</TabsTrigger>
              <TabsTrigger value="oportunidades">Oportunidades ({opportunities.length})</TabsTrigger>
              <TabsTrigger value="actividades">Actividades ({activities.length})</TabsTrigger>
              {fieldEnabled && <TabsTrigger value="sucursales">Sucursales ({sites.length})</TabsTrigger>}
              <TabsTrigger value="archivos">Archivos ({attachments.length})</TabsTrigger>
            </TabsList>

            {/* CONTACTOS */}
            <TabsContent value="contactos" className="mt-4">
              <div className="zaire-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-(--zaire-text)">Contactos de la cuenta</h3>
                  <Button size="sm" onClick={() => setContactOpen(true)} className="bg-zaire-navy-mid hover:bg-zaire-navy text-white h-8"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {contacts.length === 0 ? (
                  <p className="text-sm text-(--zaire-text-muted) py-2">Sin contactos.</p>
                ) : (
                  <ul className="divide-y divide-(--zaire-border)">
                    {contacts.map((c) => (
                      <li key={c.id}>
                        <Link href={ROUTES.crm.contacto(c.id)} className="flex items-center gap-3 py-2.5 hover:bg-subtle/60 -mx-2 px-2 rounded">
                          {c.is_primary && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
                          <span className="font-medium text-(--zaire-text) w-48 truncate">{c.full_name}</span>
                          <span className="text-xs text-(--zaire-text-muted) flex-1 truncate">{c.role_title ?? ""}</span>
                          <span className="text-xs text-(--zaire-text-muted) truncate">{c.email ?? c.phone ?? ""}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* OPORTUNIDADES */}
            <TabsContent value="oportunidades" className="mt-4">
              <div className="zaire-card p-5">
                {opportunities.length === 0 ? (
                  <p className="text-sm text-(--zaire-text-muted) py-2">Sin oportunidades.</p>
                ) : (
                  <ul className="divide-y divide-(--zaire-border)">
                    {opportunities.map((o) => {
                      const st = stageByKey.get(o.stage);
                      return (
                        <li key={o.id} className="flex items-center gap-3 py-2.5">
                          <span className="font-medium text-(--zaire-text) flex-1 truncate">{o.title}</span>
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0", stageBadge(st?.color ?? "slate"))}>{st?.name ?? o.stage}</span>
                          <span className="text-sm text-(--zaire-text) tabular-nums w-28 text-right">{o.amount != null ? formatCurrency(o.amount, o.currency) : "—"}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link href={ROUTES.crm.pipeline} className="inline-flex items-center gap-1 text-xs text-zaire-blue hover:underline mt-3">Ir al pipeline →</Link>
              </div>
            </TabsContent>

            {/* ACTIVIDADES */}
            <TabsContent value="actividades" className="mt-4">
              <div className="zaire-card p-5">
                <ActivityTimeline activities={activities} />
              </div>
            </TabsContent>

            {/* SUCURSALES (field_sites) */}
            {fieldEnabled && (
              <TabsContent value="sucursales" className="mt-4">
                <div className="zaire-card p-5 space-y-4">
                  {siteMarkers.length > 0 && <FieldMap markers={siteMarkers} height={280} center={[siteMarkers[0].lat, siteMarkers[0].lng]} zoom={6} />}
                  {sites.length === 0 ? (
                    <p className="text-sm text-(--zaire-text-muted) py-2">Esta cuenta no tiene sucursales/plantas cargadas en Zaire Field.</p>
                  ) : (
                    <ul className="divide-y divide-(--zaire-border)">
                      {sites.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 py-2.5">
                          <MapPin className="w-4 h-4 text-zaire-blue shrink-0" />
                          <span className="font-medium text-(--zaire-text) flex-1 truncate">{s.name}</span>
                          <span className="text-xs text-(--zaire-text-muted)">{[s.city, s.province].filter(Boolean).join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>
            )}

            {/* ARCHIVOS */}
            <TabsContent value="archivos" className="mt-4">
              <CrmAttachments entityType="client" entityId={client.id} initialAttachments={attachments} currentProfile={currentProfile} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ContactForm open={contactOpen} onOpenChange={setContactOpen} contact={null} clients={[client]} onSaved={() => router.refresh()} />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-(--zaire-text-muted) shrink-0" />
      <span className="text-(--zaire-text-muted) w-24 shrink-0">{label}</span>
      <span className="text-(--zaire-text) font-medium truncate">{value}</span>
    </div>
  );
}
